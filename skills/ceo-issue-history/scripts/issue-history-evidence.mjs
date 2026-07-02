#!/usr/bin/env node

import { createHash } from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 30 * DAY_MS;
const MAX_EXCERPT = 160;
const MAX_IDENTIFIER = 96;
const MAX_REPORT_BYTES = 32_000;
const MAX_CANDIDATE_ISSUES = 5;
const MAX_EVENT_IDS_PER_ISSUE = 8;
const MAX_MISSING_RESOURCES = 100;
const MAX_REJECTED = 5;
const ACTIVE_DECISIONS = new Set(["active", "open", "pending", "blocked", "in_progress", "in_review"]);
const TERMINAL_DECISIONS = new Set(["implemented", "rejected", "no_change", "not_worthwhile"]);
const VALID_DECISIONS = new Set([...ACTIVE_DECISIONS, ...TERMINAL_DECISIONS]);
const BAD_LOOP_REASONS = new Set(["failed", "blocked", "changes_requested"]);
const CRITICAL_REASONS = new Set([
  "governance_control_failure",
  "security_control_failure",
  "data_loss_risk",
  "external_write_without_approval",
]);

const REASON_POLICY = {
  handoff_mismatch: ["workflow", "handoff_mismatch", "paperclip", "company_package", 3],
  github_sync_churn: ["integration", "github_sync_churn", "github_sync", "upstream_dependency", 3],
  productivity_review: ["workflow", "productivity_loop", "paperclip", "company_package", 3],
  recovery_action: ["workflow", "recovery_loop", "paperclip", "company_package", 3],
  failed: ["execution", "execution_loop", "agent_runtime", "company_package", 2],
  blocked: ["execution", "execution_loop", "agent_runtime", "company_package", 2],
  changes_requested: ["execution", "execution_loop", "agent_runtime", "company_package", 2],
  tool_error: ["tooling", "tool_error", "agent_runtime", "company_package", 1],
  governance_control_failure: ["governance", "governance_control_failure", "paperclip", "company_package", 4],
  security_control_failure: ["security", "security_control_failure", "paperclip", "company_package", 4],
  data_loss_risk: ["safety", "data_loss_risk", "paperclip", "company_package", 4],
  external_write_without_approval: ["governance", "external_write_without_approval", "github_sync", "company_package", 4],
};

const RESOURCE_NAMES = [
  "comments",
  "documents",
  "runs",
  "activity",
  "cost-summary",
  "approvals",
  "interactions",
  "recovery-actions",
  "work-products",
];
const COLLECTION_CONCURRENCY = 8;

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableSort(value[key])]));
}

function iso(value) {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function redact(value) {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?(?:-----END [^-]+ PRIVATE KEY-----|$)/gi, "[REDACTED]")
    .replace(/\b(?:https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, (match) => `${match.split("://")[0]}://[REDACTED]@`)
    .replace(/authorization\s*:\s*(?:bearer\s+)?\S+/gi, "[REDACTED]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|ASIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|npm_[A-Za-z0-9]{20,})\b/g, "[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]")
    .replace(/\b(?:api[_-]?key|access[_-]?key|token|secret|password|passwd|private[_-]?key)\s*[=:]\s*\S+/gi, "[REDACTED]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_EXCERPT) || undefined;
}

function hash(parts) {
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

function boundedIdentifier(value, label = "ref") {
  const raw = String(value ?? "");
  const sanitized = redact(raw);
  if (sanitized === raw && raw.length <= MAX_IDENTIFIER && /^[A-Za-z0-9][A-Za-z0-9_.:/@#-]*$/.test(raw)) return raw;
  return `${label}:sha256:${hash([raw])}`;
}

function finalizeReport(report) {
  const sorted = stableSort(report);
  if (Buffer.byteLength(JSON.stringify(sorted), "utf8") <= MAX_REPORT_BYTES) return sorted;
  return stableSort({
    schemaVersion: 1,
    companyId: boundedIdentifier(report.companyId, "company"),
    asOf: report.asOf,
    window: report.window,
    coverage: {
      complete: false,
      missing: ["report_output_limit"],
      missingCount: 1,
    },
    outcome: "blocked_incomplete_evidence",
    inventory: report.inventory,
    candidates: [],
    rejected: [],
  });
}

export function buildWindow(asOf) {
  const endMs = new Date(asOf).getTime();
  if (!Number.isFinite(endMs)) throw new Error("--as-of must be a valid ISO-8601 timestamp.");
  return { start: new Date(endMs - WINDOW_MS).toISOString(), end: new Date(endMs).toISOString() };
}

export function fingerprintFor(fields) {
  return `sha256:${hash([
    "1",
    fields.category,
    fields.problemKey,
    fields.component,
    fields.targetSurface,
  ])}`;
}

function eventPolicy(reasonCode) {
  const policy = REASON_POLICY[reasonCode];
  if (!policy) return null;
  return {
    category: policy[0],
    problemKey: policy[1],
    component: policy[2],
    targetSurface: policy[3],
    severity: policy[4],
  };
}

function canonicalEvent(raw, fallbackIssueId) {
  const reasonCode = raw.reasonCode ?? inferReasonCode(raw);
  if (!REASON_POLICY[reasonCode]) return null;
  const at = iso(raw.at ?? raw.createdAt ?? raw.updatedAt ?? raw.timestamp ?? raw.startedAt ?? raw.finishedAt);
  if (!at) return { invalid: true, id: String(raw.id ?? "unknown") };
  const issueId = String(raw.issueId ?? fallbackIssueId ?? "");
  if (!issueId) return null;
  const source = String(raw.source ?? raw.resource ?? raw.kind ?? "activity").slice(0, 48);
  const runId = raw.runId ?? raw.heartbeatRunId ?? raw.executionRunId ?? null;
  const actorId = raw.agentId ?? raw.authorAgentId ?? raw.author_agent_id ?? raw.actorAgentId ?? raw.actorId ?? null;
  const id = String(raw.id ?? `derived:${hash([source, issueId, at, reasonCode, String(runId ?? ""), String(actorId ?? "")])}`);
  const result = {
    id,
    issueId,
    at,
    source,
    reasonCode,
    runId: runId == null ? null : String(runId),
    actorId: actorId == null ? null : String(actorId),
  };
  return result;
}

function evidenceText(raw) {
  const values = [
    raw.reasonCode,
    raw.type,
    raw.kind,
    raw.action,
    raw.status,
    raw.outcome,
    raw.reason,
    raw.summary,
    raw.message,
    raw.title,
    raw.body,
    raw.content,
    raw.details,
    raw.issueOriginKind,
    raw.issueSurfaceVisibility,
  ];
  if (raw.details && typeof raw.details === "object") values.push(JSON.stringify(stableSort(raw.details)).slice(0, 4_000));
  return values.filter((value) => typeof value === "string").join(" ").toLowerCase();
}

function inferReasonCode(raw) {
  const fields = evidenceText(raw);
  const originKind = String(raw.issueOriginKind ?? "").toLowerCase();
  const details = raw.details && typeof raw.details === "object" ? raw.details : {};
  const isGitHubPluginIssue = originKind.startsWith("plugin:") && /github/.test(originKind);
  const previousStatus = details._previous?.status ?? details.reopenedFrom;
  const currentStatus = details.status;
  const statusRank = new Map([["backlog", 0], ["todo", 1], ["in_progress", 2], ["blocked", 2], ["in_review", 3], ["done", 4], ["cancelled", 4]]);
  const isStatusRegression = typeof previousStatus === "string" && typeof currentStatus === "string"
    && statusRank.has(previousStatus) && statusRank.has(currentStatus)
    && statusRank.get(currentStatus) < statusRank.get(previousStatus);
  const isChurnUpdate = raw.action === "issue.updated" && (details.reopened === true || isStatusRegression);
  if (isGitHubPluginIssue && isChurnUpdate) return "github_sync_churn";
  if (/external.{0,20}write.{0,30}(without|missing).{0,20}approval/.test(fields)) return "external_write_without_approval";
  if (/data.{0,10}loss/.test(fields)) return "data_loss_risk";
  if (/security.{0,20}(control|guard).{0,20}(fail|missing|bypass)/.test(fields)) return "security_control_failure";
  if (/governance.{0,20}(control|guard).{0,20}(fail|missing|bypass)/.test(fields)) return "governance_control_failure";
  if (/github.{0,20}sync/.test(fields) && /(reopen|churn|status|rerout|oscillat)/.test(fields)) return "github_sync_churn";
  if (/handoff/.test(fields) && /(mismatch|wrong|stale|broken)/.test(fields)) return "handoff_mismatch";
  if (/productivity.?review|high.?churn|no.?comment|long.?active/.test(fields)) return "productivity_review";
  if (/recovery|continuation|resume/.test(fields)) return "recovery_action";
  if (/changes.?requested/.test(fields)) return "changes_requested";
  if (/blocked|blocker/.test(fields)) return "blocked";
  if (/failed|failure|error/.test(fields)) return "failed";
  return null;
}

function candidateKey(policy) {
  return [policy.category, policy.problemKey, policy.component, policy.targetSurface].join("\u0000");
}

function decisionMap(priorDecisions) {
  const result = new Map();
  for (const decision of priorDecisions ?? []) {
    if (typeof decision?.fingerprint !== "string" || !/^sha256:[a-f0-9]{64}$/.test(decision.fingerprint)) continue;
    const status = String(decision.status ?? decision.outcome ?? "").toLowerCase();
    const at = iso(decision.at ?? decision.decidedAt ?? decision.implementedAt ?? decision.updatedAt);
    if (!VALID_DECISIONS.has(status) || !at) continue;
    const normalized = {
      fingerprint: decision.fingerprint,
      status,
      at,
    };
    const current = result.get(normalized.fingerprint);
    const normalizedKey = `${normalized.at ?? ""}\u0000${normalized.status}`;
    const currentKey = current ? `${current.at ?? ""}\u0000${current.status}` : "";
    if (!current || normalizedKey > currentKey) result.set(normalized.fingerprint, normalized);
  }
  return result;
}

function thresholdFor(events) {
  const issueIds = new Set(events.map((event) => event.issueId));
  if (events.some((event) => CRITICAL_REASONS.has(event.reasonCode))) return "critical_one_off";
  if (issueIds.size >= 2 && events.length >= 3) return "cross_issue_recurrence";
  const byIssue = new Map();
  for (const event of events) {
    if (!BAD_LOOP_REASONS.has(event.reasonCode)) continue;
    const bucket = byIssue.get(event.issueId) ?? [];
    bucket.push(event);
    byIssue.set(event.issueId, bucket);
  }
  if ([...byIssue.values()].some((items) => items.length >= 3 && new Set(items.map((item) => item.runId).filter(Boolean)).size >= 2)) {
    return "concentrated_loop";
  }
  return null;
}

function issueEvidenceRows(events, issueById) {
  const grouped = new Map();
  for (const event of events) {
    const bucket = grouped.get(event.issueId) ?? [];
    bucket.push(event.id);
    grouped.set(event.issueId, bucket);
  }
  return [...grouped.entries()]
    .map(([id, eventIds]) => {
      const sortedEventIds = eventIds.sort();
      return {
        id: boundedIdentifier(id, "issue"),
        key: boundedIdentifier(issueById.get(id)?.key ?? id, "issue-key"),
        eventCount: sortedEventIds.length,
        eventIds: sortedEventIds.slice(0, MAX_EVENT_IDS_PER_ISSUE).map((eventId) => boundedIdentifier(eventId, "event")),
        ...(sortedEventIds.length > MAX_EVENT_IDS_PER_ISSUE ? { eventIdsTruncated: true } : {}),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, MAX_CANDIDATE_ISSUES);
}

export function analyzeEvidence(input) {
  const window = buildWindow(input.asOf);
  const coverage = {
    complete: input.coverage?.complete === true,
    missing: [...new Set(input.coverage?.missing ?? [])].sort(),
    ...(input.coverage?.resources ? { resources: stableSort(input.coverage.resources) } : {}),
  };
  const issueRows = [...new Map([...(input.issues ?? [])]
    .map((issue) => [String(issue.id), {
      id: String(issue.id),
      key: String(issue.key ?? issue.identifier ?? issue.id),
      status: issue.status ?? null,
      projectId: issue.projectId ?? null,
      assigneeId: issue.assigneeId ?? issue.assigneeAgentId ?? null,
      evidence: [],
    }])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const issueById = new Map(issueRows.map((issue) => [issue.id, issue]));
  const agentRows = [...new Map([...(input.agents ?? [])]
    .filter((agent) => agent?.id)
    .map((agent) => [String(agent.id), {
      id: String(agent.id),
      name: String(agent.name ?? agent.title ?? agent.id).slice(0, 120),
      role: agent.role == null ? null : String(agent.role).slice(0, 80),
    }])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const eventsById = new Map();
  const conflictingEventIds = new Set();
  let invalidTimestampCount = 0;

  for (const sourceIssue of input.issues ?? []) {
    for (const raw of sourceIssue.evidence ?? []) {
      if (raw?.invalidTimestamp) {
        invalidTimestampCount += 1;
        continue;
      }
      const event = canonicalEvent({
        ...raw,
        issueOriginKind: raw.issueOriginKind ?? sourceIssue.originKind,
        issueSurfaceVisibility: raw.issueSurfaceVisibility ?? sourceIssue.surfaceVisibility,
      }, sourceIssue.id);
      if (event?.invalid) {
        invalidTimestampCount += 1;
        continue;
      }
      if (!event || event.at < window.start || event.at >= window.end || conflictingEventIds.has(event.id)) continue;
      const existing = eventsById.get(event.id);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(event)) {
          eventsById.delete(event.id);
          conflictingEventIds.add(event.id);
        }
        continue;
      }
      eventsById.set(event.id, event);
    }
  }
  if (invalidTimestampCount > 0) {
    coverage.complete = false;
    coverage.missing = [...new Set([...coverage.missing, `invalid_event_timestamps:${invalidTimestampCount}`])].sort();
  }
  if (conflictingEventIds.size > 0) {
    coverage.complete = false;
    coverage.missing = [...new Set([...coverage.missing, `conflicting_event_ids:${conflictingEventIds.size}`])].sort();
  }

  const events = [...eventsById.values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  for (const event of events) {
    const issue = issueById.get(event.issueId);
    if (issue) issue.evidence.push(event);
  }

  const allMissingResources = [...new Set(coverage.missing)].sort();
  coverage.missing = allMissingResources.slice(0, MAX_MISSING_RESOURCES).map((entry) => boundedIdentifier(entry, "missing"));
  coverage.missingCount = allMissingResources.length;
  if (allMissingResources.length > coverage.missing.length) {
    coverage.missingTruncated = true;
    coverage.missingFingerprint = `sha256:${hash(allMissingResources)}`;
  }

  const evidenceCountByAgent = new Map();
  for (const event of events) {
    if (event.actorId) evidenceCountByAgent.set(event.actorId, (evidenceCountByAgent.get(event.actorId) ?? 0) + 1);
  }
  const base = {
    schemaVersion: 1,
    companyId: boundedIdentifier(input.companyId, "company"),
    asOf: window.end,
    window,
    coverage,
    outcome: "no_change",
    inventory: {
      issueCount: issueRows.length,
      eventCount: events.length,
      agentCount: agentRows.length,
      agentsWithEvidenceCount: agentRows.filter((agent) => (evidenceCountByAgent.get(agent.id) ?? 0) > 0).length,
      agentsWithoutEvidenceCount: agentRows.filter((agent) => (evidenceCountByAgent.get(agent.id) ?? 0) === 0).length,
      agentInventoryFingerprint: `sha256:${hash(agentRows.map((agent) => agent.id))}`,
    },
    candidates: [],
    rejected: [],
  };
  if (!coverage.complete) {
    base.outcome = "blocked_incomplete_evidence";
    return finalizeReport(base);
  }

  const groups = new Map();
  for (const event of events) {
    const policy = eventPolicy(event.reasonCode);
    if (!policy) continue;
    const key = candidateKey(policy);
    const group = groups.get(key) ?? { policy, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }

  const decisions = decisionMap(input.priorDecisions);
  for (const { policy, events: groupEvents } of groups.values()) {
    const threshold = thresholdFor(groupEvents);
    const fingerprint = fingerprintFor(policy);
    const issueCount = new Set(groupEvents.map((event) => event.issueId)).size;
    const runCount = new Set(groupEvents.map((event) => event.runId).filter(Boolean)).size;
    const common = {
      fingerprint,
      category: policy.category,
      problemKey: policy.problemKey,
      component: policy.component,
      targetSurface: policy.targetSurface,
      severity: policy.severity,
      issueCount,
      eventCount: groupEvents.length,
      runCount,
      lastAt: groupEvents.at(-1).at,
      issues: issueEvidenceRows(groupEvents, issueById),
      ...(issueCount > MAX_CANDIDATE_ISSUES ? { issueRefsTruncated: true } : {}),
    };
    if (!threshold) {
      base.rejected.push({ ...common, reasonCode: "below_threshold" });
      continue;
    }
    const prior = decisions.get(fingerprint);
    if (prior && ACTIVE_DECISIONS.has(prior.status)) {
      base.rejected.push({ ...common, threshold, reasonCode: "duplicate_active" });
      continue;
    }
    if (prior?.at && ["implemented", "rejected", "no_change", "not_worthwhile"].includes(prior.status)) {
      const freshEvents = groupEvents.filter((event) => event.at > prior.at);
      const freshThreshold = thresholdFor(freshEvents);
      if (!freshThreshold) {
        base.rejected.push({ ...common, threshold, reasonCode: "no_post_decision_recurrence" });
        continue;
      }
    }
    base.candidates.push({ ...common, threshold, dedupe: prior ? "recurred_after_decision" : "new" });
  }

  const rank = (a, b) => b.severity - a.severity
    || b.issueCount - a.issueCount
    || b.eventCount - a.eventCount
    || b.lastAt.localeCompare(a.lastAt)
    || a.fingerprint.localeCompare(b.fingerprint);
  base.candidates.sort(rank);
  if (base.candidates.length > 3) {
    for (const candidate of base.candidates.splice(3)) base.rejected.push({ ...candidate, reasonCode: "proposal_cap" });
  }
  base.rejected.sort(rank);
  if (base.rejected.length > MAX_REJECTED) {
    base.rejectedTruncated = base.rejected.length - MAX_REJECTED;
    base.rejected = base.rejected.slice(0, MAX_REJECTED);
  }
  base.outcome = base.candidates.length > 0 ? "ranked_candidates" : "no_change";
  return finalizeReport(base);
}

function collectionRows(body) {
  if (Array.isArray(body)) return body;
  for (const key of ["items", "data", "issues", "runs", "events", "results"]) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return body && typeof body === "object" ? [body] : [];
}

function collectionHasMore(body) {
  return body?.hasMore === true
    || body?.pagination?.hasMore === true
    || body?.meta?.hasMore === true
    || body?.pageInfo?.hasNextPage === true
    || (typeof body?.nextCursor === "string" && body.nextCursor.length > 0)
    || (typeof body?.pagination?.nextCursor === "string" && body.pagination.nextCursor.length > 0);
}

async function apiGet({ baseUrl, apiKey, fetchImpl }, path) {
  const configuredOrigin = new URL(baseUrl);
  if (!["http:", "https:"].includes(configuredOrigin.protocol)) throw new Error("PAPERCLIP_API_URL must use HTTP or HTTPS.");
  const target = new URL(path, `${configuredOrigin.href.replace(/\/$/, "")}/`);
  if (target.origin !== configuredOrigin.origin) throw new Error("Refusing to send Paperclip credentials across origins.");
  const response = await fetchImpl(target, {
    redirect: "error",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function apiGetOffsetPages(client, path, limit = 1000) {
  const rows = [];
  let offset = 0;
  let pages = 0;
  for (;;) {
    const separator = path.includes("?") ? "&" : "?";
    const body = await apiGet(client, `${path}${separator}limit=${limit}&offset=${offset}`);
    const pageRows = collectionRows(body);
    rows.push(...pageRows);
    pages += 1;
    const hasMore = collectionHasMore(body) || pageRows.length >= limit;
    if (!hasMore) return { rows, pages };
    if (pageRows.length === 0) throw new Error("Pagination claimed another page without returning rows.");
    offset += pageRows.length;
    if (pages >= 10_000) throw new Error("Pagination exceeded the safety page limit.");
  }
}

function extractPriorDecisions(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) extractPriorDecisions(item, output);
  } else if (value && typeof value === "object") {
    if (typeof value.fingerprint === "string") {
      output.push({
        fingerprint: value.fingerprint,
        status: value.status ?? value.outcome ?? value.decision,
        at: value.decidedAt ?? value.implementedAt ?? value.updatedAt ?? value.createdAt,
      });
    }
    for (const [key, child] of Object.entries(value)) {
      if (["content", "body", "payload"].includes(key) && typeof child === "string" && child.length <= 1_000_000 && /^[\s]*[\[{]/.test(child)) {
        try {
          extractPriorDecisions(JSON.parse(child), output);
        } catch {
          // Non-JSON document bodies are evidence text, not deduplication records.
        }
      } else {
        extractPriorDecisions(child, output);
      }
    }
  }
  return output;
}

function resourceEvents(rows, issue, resource) {
  const events = [];
  const issueId = String(issue.id);
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const event = canonicalEvent({
      ...row,
      issueId,
      resource,
      source: resource,
      issueOriginKind: issue.originKind,
      issueSurfaceVisibility: issue.surfaceVisibility,
    }, issueId);
    if (event?.invalid) events.push({ id: event.id, issueId, invalidTimestamp: true });
    else if (event) events.push(event);
  }
  return events;
}

async function mapWithConcurrency(values, limit, mapper) {
  const output = new Array(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= values.length) return;
      output[index] = await mapper(values[index], index);
    }
  }));
  return output;
}

export async function collectEvidence({ baseUrl, apiKey, companyId, asOf, fetchImpl = fetch }) {
  if (!baseUrl || !apiKey || !companyId) throw new Error("PAPERCLIP_API_URL, PAPERCLIP_API_KEY, and PAPERCLIP_COMPANY_ID are required.");
  buildWindow(asOf);
  const client = { baseUrl, apiKey, fetchImpl };
  const missing = [];
  const resources = {
    issues: { complete: false, count: 0, pages: 0 },
    agents: { complete: false, count: 0 },
    issueResources: { resourceCount: RESOURCE_NAMES.length, issuesChecked: 0, readsComplete: 0 },
  };
  let issueList = [];
  let agents = [];

  try {
    const pageSet = await apiGetOffsetPages(client, `/api/companies/${encodeURIComponent(companyId)}/issues?includePluginOperations=true`);
    issueList = pageSet.rows;
    resources.issues = { complete: true, count: issueList.length, pages: pageSet.pages };
  } catch {
    missing.push("company:issues");
  }
  try {
    const body = await apiGet(client, `/api/companies/${encodeURIComponent(companyId)}/agents`);
    agents = collectionRows(body);
    resources.agents = { complete: !collectionHasMore(body), count: agents.length };
    if (collectionHasMore(body)) missing.push("company_agents:next_page");
  } catch {
    missing.push("company:agents");
  }

  const sortedIssues = [...issueList].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const collectedIssues = await mapWithConcurrency(sortedIssues, COLLECTION_CONCURRENCY, async (issue) => {
    const issueId = String(issue.id);
    const evidence = [];
    const issuePriorDecisions = [];
    resources.issueResources.issuesChecked += 1;
    await Promise.all(RESOURCE_NAMES.map(async (resource) => {
      try {
        const body = await apiGet(client, `/api/issues/${encodeURIComponent(issueId)}/${resource}`);
        const rows = collectionRows(body);
        if (collectionHasMore(body)) missing.push(`issue:${issueId}:${resource}:next_page`);
        else resources.issueResources.readsComplete += 1;
        evidence.push(...resourceEvents(rows, issue, resource));
        if (["documents", "approvals", "interactions", "work-products"].includes(resource)) {
          extractPriorDecisions(body, issuePriorDecisions);
        }
      } catch {
        missing.push(`issue:${issueId}:${resource}`);
      }
    }));
    return {
      id: issueId,
      key: issue.identifier ?? issue.key ?? issueId,
      status: issue.status ?? null,
      projectId: issue.projectId ?? null,
      assigneeId: issue.assigneeAgentId ?? issue.assigneeId ?? null,
      evidence,
      priorDecisions: issuePriorDecisions,
    };
  });
  const priorDecisions = collectedIssues.flatMap((issue) => issue.priorDecisions);
  const issues = collectedIssues.map(({ priorDecisions: _priorDecisions, ...issue }) => issue);

  return analyzeEvidence({
    companyId,
    asOf,
    coverage: { complete: missing.length === 0, missing, resources },
    agents,
    issues,
    priorDecisions,
  });
}

function parseArgs(argv) {
  const result = { asOf: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--as-of") {
      result.asOf = argv[index + 1] ?? null;
      index += 1;
    } else if (argv[index] === "--help" || argv[index] === "-h") {
      process.stdout.write("Usage: issue-history-evidence.mjs --as-of <ISO-8601 UTC timestamp>\n");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  if (!result.asOf) throw new Error("--as-of is required; the workflow never infers the evidence boundary.");
  return result;
}

async function main() {
  const { asOf } = parseArgs(process.argv.slice(2));
  const report = await collectEvidence({
    baseUrl: process.env.PAPERCLIP_API_URL,
    apiKey: process.env.PAPERCLIP_API_KEY,
    companyId: process.env.PAPERCLIP_COMPANY_ID,
    asOf,
  });
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.outcome === "blocked_incomplete_evidence") process.exitCode = 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, outcome: "fatal", error: { code: "collector_failed", message: redact(error.message) } })}\n`);
    process.exitCode = 1;
  });
}
