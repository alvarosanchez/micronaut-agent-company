#!/usr/bin/env node

import { createHash } from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;
const FULL_WINDOW_MS = 30 * DAY_MS;
const CONTAINMENT_WINDOW_MS = 6 * 60 * 60 * 1000;
const MAX_EXCERPT = 160;
const MAX_IDENTIFIER = 96;
const MAX_REPORT_BYTES = 32_000;
const MAX_CANDIDATE_ISSUES = 5;
const MAX_EVENT_IDS_PER_ISSUE = 8;
const MAX_MISSING_RESOURCES = 100;
const MAX_REJECTED = 5;
const MAX_TELEMETRY_RUNS = 100;
const ACTIONABLE_STATUSES = ["backlog", "todo", "in_progress", "blocked", "in_review"];
const OPERATIONAL_PROBLEMS = new Set([
  "github_sync_churn",
  "liveness_escalation",
  "github_sync_liveness_escalation",
  "recovery_loop",
  "stale_recovery_recursion",
]);
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
  liveness_escalation: ["workflow", "liveness_escalation", "paperclip", "upstream_dependency", 3],
  github_sync_liveness_escalation: ["integration", "github_sync_liveness_escalation", "github_sync", "upstream_dependency", 4],
  productivity_review: ["workflow", "productivity_loop", "paperclip", "company_package", 3],
  recovery_action: ["workflow", "recovery_loop", "paperclip", "company_package", 3],
  stale_recovery_recursion: ["execution", "stale_recovery_recursion", "paperclip", "company_package", 4],
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
const COMPOSITE_CORRELATION_MS = 60 * 60 * 1_000;
const TERMINAL_RUN_STATUSES = new Set(["succeeded", "failed", "cancelled", "timed_out"]);

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
    incidents: [],
    rejected: [],
  });
}

export function buildWindow(asOf, mode = "full") {
  if (typeof asOf !== "string" || !/(?:Z|\+00:00)$/i.test(asOf)) {
    throw new Error("--as-of must include an explicit UTC designator (Z or +00:00).");
  }
  if (!["full", "containment"].includes(mode)) throw new Error("mode must be full or containment.");
  const endMs = new Date(asOf).getTime();
  if (!Number.isFinite(endMs)) throw new Error("--as-of must be a valid ISO-8601 timestamp.");
  const windowMs = mode === "containment" ? CONTAINMENT_WINDOW_MS : FULL_WINDOW_MS;
  return { start: new Date(endMs - windowMs).toISOString(), end: new Date(endMs).toISOString() };
}

export function fingerprintFor(fields) {
  return `sha256:${hash([
    "1",
    fields.category,
    fields.problemKey,
    fields.component,
    fields.targetSurface,
    fields.incidentIdentity ?? "unspecified",
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
  const details = raw.details && typeof raw.details === "object" && !Array.isArray(raw.details) ? raw.details : {};
  const context = raw.contextSnapshot && typeof raw.contextSnapshot === "object" && !Array.isArray(raw.contextSnapshot)
    ? raw.contextSnapshot
    : {};
  const suppliedReasonCode = raw.reasonCode;
  const reasonCode = suppliedReasonCode === "github_sync_churn" && !githubSyncProvenance(raw).matched
    ? null
    : suppliedReasonCode ?? inferReasonCode(raw);
  if (!REASON_POLICY[reasonCode]) return null;
  const at = iso(raw.at ?? raw.createdAt ?? raw.updatedAt ?? raw.timestamp ?? raw.startedAt ?? raw.finishedAt);
  if (!at) return { invalid: true, id: String(raw.id ?? raw.runId ?? "unknown") };
  const issueCandidate = reasonCode === "liveness_escalation"
    ? (details.escalationIssueId ?? raw.entityId ?? raw.issueId ?? fallbackIssueId)
    : (raw.issueId ?? details.sourceIssueId ?? details.issueId ?? context.issueId ?? fallbackIssueId);
  const issueId = String(issueCandidate ?? "");
  if (!issueId) return null;
  const source = String(raw.source ?? raw.resource ?? raw.kind ?? "activity").slice(0, 48);
  const runId = raw.runId ?? raw.heartbeatRunId ?? raw.executionRunId
    ?? (raw.resource === "runs" ? raw.id : null)
    ?? (raw.entityType === "heartbeat_run" ? raw.entityId : null);
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
    runRecord: raw.resource === "runs" || Object.hasOwn(raw, "usageJson") || Object.hasOwn(raw, "retryOfRunId"),
    runStatus: typeof raw.status === "string" ? raw.status : null,
    usageJson: raw.usageJson && typeof raw.usageJson === "object" && !Array.isArray(raw.usageJson) ? raw.usageJson : null,
  };
  const operandValid = (value) => typeof value === "string" && value.length > 0 && value.length <= MAX_IDENTIFIER
    && /^[A-Za-z0-9][A-Za-z0-9_.:/@#-]*$/.test(value);
  if (result.runId != null && !operandValid(result.runId)) return { invalidControl: true, id };
  if (OPERATIONAL_PROBLEMS.has(eventPolicy(reasonCode)?.problemKey) && !operandValid(result.issueId)) {
    return { invalidControl: true, id };
  }
  const aliases = {
    incidentKey: ["incidentKey"],
    sourceIssueId: ["sourceIssueId"],
    existingEvaluationIssueId: ["existingEvaluationIssueId", "evaluationIssueId"],
    rootRunId: ["rootRunId", "sourceRunId"],
    retryRunId: ["retryRunId", "recoveryRunId"],
    mappingId: ["mappingId", "syncMappingId"],
    remoteFingerprint: ["remoteFingerprint", "actionFingerprint"],
  };
  for (const [field, names] of Object.entries(aliases)) {
    const value = names.map((name) => raw[name] ?? details[name]).find((item) => item != null);
    if (value == null) {
      result[field] = null;
      continue;
    }
    if (!operandValid(value)) return { invalidControl: true, id };
    result[field] = value;
  }
  if (raw.retryOfRunId != null && !operandValid(raw.retryOfRunId)) return { invalidControl: true, id };
  result.sourceIssueId ??= typeof context.issueId === "string" ? context.issueId : result.issueId;
  result.rootRunId = raw.retryOfRunId == null ? (result.rootRunId ?? result.runId) : raw.retryOfRunId;
  result.retryRunId = reasonCode === "recovery_action" ? (result.retryRunId ?? result.runId) : result.retryRunId;
  result.errorCode = typeof raw.errorCode === "string" ? raw.errorCode : null;
  const retryReason = [raw.scheduledRetryReason, context.retryReason, context.wakeReason, context.cause]
    .find((value) => typeof value === "string" && value.length > 0);
  const invocationSource = typeof raw.invocationSource === "string" && raw.invocationSource.length > 0
    ? raw.invocationSource
    : "unknown";
  result.retryCategory = `${invocationSource}:${retryReason ?? "unknown"}`;
  const causeFingerprint = [context.failureFingerprint, context.retryFingerprint, context.fingerprint, context.cause]
    .find((value) => typeof value === "string" && value.length > 0);
  result.causeFingerprint = typeof causeFingerprint === "string" ? boundedIdentifier(causeFingerprint, "cause") : null;
  result.existingEvaluationIssueId ??= ["liveness_escalation", "stale_recovery_recursion"].includes(reasonCode)
    ? result.issueId
    : null;
  return result;
}

function evidenceText(raw) {
  const values = [
    raw.reasonCode,
    raw.type,
    raw.kind,
    raw.action,
    raw.status,
    raw.errorCode,
    raw.scheduledRetryReason,
    raw.invocationSource,
    raw.outcome,
    raw.reason,
    raw.summary,
    raw.message,
    raw.title,
    raw.body,
    raw.content,
    raw.details,
    raw.contextSnapshot,
    raw.issueOriginKind,
    raw.issueSurfaceVisibility,
  ];
  if (raw.details && typeof raw.details === "object") values.push(JSON.stringify(stableSort(raw.details)).slice(0, 4_000));
  return values.filter((value) => typeof value === "string").join(" ").toLowerCase();
}

function isGitHubSyncNamespace(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return ["paperclip-github-plugin", "github-sync"].some((namespace) =>
    normalized === namespace
      || normalized.startsWith(`${namespace}.`)
      || normalized.startsWith(`${namespace}:`)
      || normalized.startsWith(`${namespace}/`));
}

function githubSyncProvenance(raw) {
  const originKind = String(raw.issueOriginKind ?? "").toLowerCase();
  const details = raw.details && typeof raw.details === "object" ? raw.details : {};
  const isPluginOrigin = originKind.startsWith("plugin:");
  const pluginProvenance = [
    raw.pluginKey,
    raw.sourcePluginKey,
    raw.sourcePluginId,
    raw.contextSource,
    details.pluginKey,
    details.sourcePluginKey,
    details.sourcePluginId,
    details.contextSource,
  ].filter((value) => typeof value === "string");
  return {
    details,
    matched: (isPluginOrigin && isGitHubSyncNamespace(originKind.slice("plugin:".length)))
      || pluginProvenance.some(isGitHubSyncNamespace),
    structured: isPluginOrigin || pluginProvenance.length > 0,
  };
}

function inferReasonCode(raw) {
  const fields = evidenceText(raw);
  const provenance = githubSyncProvenance(raw);
  const { details } = provenance;
  const previousStatus = details._previous?.status ?? details.reopenedFrom;
  const currentStatus = details.status;
  const statusRank = new Map([["backlog", 0], ["todo", 1], ["in_progress", 2], ["blocked", 2], ["in_review", 3], ["done", 4], ["cancelled", 4]]);
  const isStatusRegression = typeof previousStatus === "string" && typeof currentStatus === "string"
    && statusRank.has(previousStatus) && statusRank.has(currentStatus)
    && statusRank.get(currentStatus) < statusRank.get(previousStatus);
  const isChurnUpdate = raw.action === "issue.updated" && (details.reopened === true || isStatusRegression);
  if (provenance.matched && isChurnUpdate) return "github_sync_churn";
  if (raw.action === "issue.harness_liveness_escalation_created") return "liveness_escalation";
  if (raw.action === "heartbeat.output_stale_recovery_recursion_refused") return "stale_recovery_recursion";
  if (raw.errorCode === "adapter_failed" && typeof raw.retryOfRunId === "string") return "recovery_action";
  if (/external.{0,20}write.{0,30}(without|missing).{0,20}approval/.test(fields)) return "external_write_without_approval";
  if (/data.{0,10}loss/.test(fields)) return "data_loss_risk";
  if (/security.{0,20}(control|guard).{0,20}(fail|missing|bypass)/.test(fields)) return "security_control_failure";
  if (/governance.{0,20}(control|guard).{0,20}(fail|missing|bypass)/.test(fields)) return "governance_control_failure";
  if (!provenance.structured && /github.{0,20}sync/.test(fields) && /(reopen|churn|status|rerout|oscillat)/.test(fields)) return "github_sync_churn";
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

function compareEvidenceEvents(a, b) {
  return a.at.localeCompare(b.at) || a.id.localeCompare(b.id);
}

function correlatedCompositeEvents(events) {
  const byIssue = new Map();
  for (const event of events) {
    if (!["github_sync_churn", "liveness_escalation"].includes(event.reasonCode)) continue;
    const bucket = byIssue.get(event.issueId) ?? [];
    bucket.push(event);
    byIssue.set(event.issueId, bucket);
  }
  const correlated = new Map();
  for (const issueEvents of byIssue.values()) {
    const ordered = [...issueEvents].sort(compareEvidenceEvents);
    const churn = ordered
      .filter((event) => event.reasonCode === "github_sync_churn")
      .map((event) => ({ event, atMs: new Date(event.at).getTime() }));
    const escalations = ordered
      .filter((event) => event.reasonCode === "liveness_escalation")
      .map((event) => ({ event, atMs: new Date(event.at).getTime() }));

    let churnStart = 0;
    let churnEnd = 0;
    for (const escalation of escalations) {
      while (churnStart < churn.length && churn[churnStart].atMs < escalation.atMs - COMPOSITE_CORRELATION_MS) churnStart += 1;
      while (churnEnd < churn.length && churn[churnEnd].atMs < escalation.atMs) churnEnd += 1;
      if (churnEnd > churnStart) correlated.set(escalation.event.id, escalation.event);
    }

    let escalationIndex = 0;
    for (const churnEvent of churn) {
      while (escalationIndex < escalations.length && escalations[escalationIndex].atMs <= churnEvent.atMs) escalationIndex += 1;
      if (escalationIndex < escalations.length
        && escalations[escalationIndex].atMs <= churnEvent.atMs + COMPOSITE_CORRELATION_MS) {
        correlated.set(churnEvent.event.id, churnEvent.event);
      }
    }
  }
  return [...correlated.values()].sort(compareEvidenceEvents);
}

function thresholdFor(events, policy) {
  if (policy?.problemKey === "github_sync_liveness_escalation") {
    return correlatedCompositeEvents(events).length >= 2 ? "critical_one_off" : null;
  }
  const issueIds = new Set(events.map((event) => event.issueId));
  const byIssueCount = new Map();
  for (const event of events) byIssueCount.set(event.issueId, (byIssueCount.get(event.issueId) ?? 0) + 1);
  const maxIssueEvents = Math.max(0, ...byIssueCount.values());
  if (policy?.problemKey === "stale_recovery_recursion" && maxIssueEvents >= 2) return "concentrated_loop";
  if (policy?.problemKey === "liveness_escalation" && maxIssueEvents >= 2) return "duplicate_incident";
  if (policy?.problemKey === "recovery_loop" && maxIssueEvents >= 3) return "recovery_fanout";
  if (policy?.problemKey === "github_sync_churn" && maxIssueEvents >= 3) return "concentrated_loop";
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

function incidentFingerprint(problemKey, identity) {
  return `sha256:${hash(["incident-v1", problemKey, ...identity])}`;
}

function actionId(fingerprint, operation, target) {
  return `sha256:${hash([fingerprint, operation, JSON.stringify(stableSort(target))])}`;
}

function issueCancelAction({ companyId, fingerprint, issueId }) {
  const target = { issueId };
  return {
    operation: "paperclip.issue.update",
    surface: { method: "PATCH", path: `/api/issues/${issueId}` },
    target,
    parameters: { status: "cancelled" },
    preconditions: {
      method: "GET",
      path: `/api/issues/${issueId}`,
      companyId,
      status: ACTIONABLE_STATUSES,
    },
    idempotencyKey: actionId(fingerprint, "paperclip.issue.update", target),
    onPreconditionFailure: "abort_noop",
  };
}

function boardRunCancelApproval({ companyId, fingerprint, issueId, runId, title, reason }) {
  const target = { issueId, runId };
  const idempotencyKey = actionId(fingerprint, "paperclip.board.run.cancel", target);
  return {
    operation: "paperclip.approval.request",
    surface: { method: "POST", path: `/api/companies/${companyId}/approvals` },
    target,
    parameters: {
      type: "request_board_approval",
      payload: {
        idempotencyKey,
        title,
        reason,
        recommendedBoardAction: {
          method: "POST",
          path: `/api/heartbeat-runs/${runId}/cancel`,
          body: {},
          preconditions: {
            method: "GET",
            path: `/api/heartbeat-runs/${runId}`,
            companyId,
            status: ["queued", "running", "scheduled_retry"],
          },
        },
      },
      issueIds: [issueId],
    },
    preflight: {
      method: "GET",
      path: `/api/companies/${companyId}/approvals`,
      absentPayloadIdempotencyKey: idempotencyKey,
    },
    idempotencyKey,
    onPreconditionFailure: "abort_noop",
  };
}

function mappingRemovalApproval({ companyId, fingerprint, issueId, mappingId, reason }) {
  const target = { mappingId, issueId };
  const idempotencyKey = actionId(fingerprint, "github_sync.mapping.remove", target);
  return {
    operation: "paperclip.approval.request",
    target,
    surface: { method: "POST", path: `/api/companies/${companyId}/approvals` },
    parameters: {
      type: "request_board_approval",
      payload: {
        idempotencyKey,
        title: `Remove GitHub Sync mapping ${mappingId}`,
        reason,
        recommendedBoardAction: { operation: "github_sync.mapping.remove", mappingId },
      },
      issueIds: [issueId],
    },
    preflight: {
      method: "GET",
      path: `/api/companies/${companyId}/approvals`,
      absentPayloadIdempotencyKey: idempotencyKey,
    },
    idempotencyKey,
    onPreconditionFailure: "abort_noop",
  };
}

function buildOperationalIncidents(events, companyId) {
  const incidents = [];
  const livenessGroups = new Map();
  const staleGroups = new Map();
  const recoveryGroups = new Map();
  const churnGroups = new Map();
  const add = (map, key, event) => map.set(key, [...(map.get(key) ?? []), event]);

  for (const event of events) {
    if (event.reasonCode === "liveness_escalation" && event.incidentKey && event.sourceIssueId) {
      add(livenessGroups, event.incidentKey, event);
    } else if (event.reasonCode === "stale_recovery_recursion" && event.sourceIssueId && event.rootRunId
      && event.existingEvaluationIssueId) {
      add(staleGroups, `${event.sourceIssueId}\u0000${event.rootRunId}`, event);
    } else if (event.reasonCode === "recovery_action" && event.sourceIssueId && event.rootRunId
      && event.retryRunId && event.retryCategory && event.errorCode === "adapter_failed") {
      add(recoveryGroups, `${event.sourceIssueId}\u0000${event.rootRunId}`, event);
    } else if (event.reasonCode === "github_sync_churn" && event.mappingId && event.remoteFingerprint) {
      add(churnGroups, `${event.issueId}\u0000${event.mappingId}\u0000${event.remoteFingerprint}`, event);
    }
  }

  for (const [incidentKey, group] of livenessGroups) {
    const issueIds = [...new Set(group.map((event) => event.issueId))].sort();
    const sourceIds = [...new Set(group.map((event) => event.sourceIssueId))];
    if (issueIds.length < 2 || sourceIds.length !== 1) continue;
    const declaredCanonical = [...new Set(group.map((event) => event.existingEvaluationIssueId).filter(Boolean))].sort();
    const canonicalIssueId = declaredCanonical.find((id) => issueIds.includes(id)) ?? issueIds[0];
    const duplicateIssueIds = issueIds.filter((id) => id !== canonicalIssueId);
    const fingerprint = incidentFingerprint("liveness_escalation", [companyId, incidentKey, sourceIds[0]]);
    incidents.push({
      fingerprint, problemKey: "liveness_escalation", severity: 4, threshold: "duplicate_incident",
      incidentKey, sourceIssueId: sourceIds[0], canonicalIssueId, duplicateIssueIds,
      existingEvaluationIssueId: canonicalIssueId,
      runIds: [...new Set(group.map((event) => event.runId).filter(Boolean))].sort(),
      eventCount: group.length, lastAt: [...group].sort(compareEvidenceEvents).at(-1).at,
      actionManifest: {
        version: 1, owner: "company_package", maxResponseMinutes: 15,
        actions: duplicateIssueIds.map((issueId) => issueCancelAction({ companyId, fingerprint, issueId, canonicalIssueId, incidentKey })),
      },
    });
  }

  for (const group of staleGroups.values()) {
    const evaluationIssueIds = [...new Set(group.map((event) => event.existingEvaluationIssueId))].sort();
    if (group.length < 2 || evaluationIssueIds.length === 0) continue;
    const first = group[0];
    const canonicalIssueId = evaluationIssueIds[0];
    const duplicateIssueIds = evaluationIssueIds.slice(1);
    const fingerprint = incidentFingerprint("stale_recovery_recursion", [companyId, first.sourceIssueId, first.rootRunId]);
    const runTarget = { issueId: first.sourceIssueId, runId: first.rootRunId };
    incidents.push({
      fingerprint, problemKey: "stale_recovery_recursion", severity: 4, threshold: "concentrated_loop",
      sourceIssueId: first.sourceIssueId, rootRunId: first.rootRunId, canonicalIssueId, duplicateIssueIds,
      existingEvaluationIssueId: canonicalIssueId,
      evaluationIssueIds, eventCount: group.length, lastAt: [...group].sort(compareEvidenceEvents).at(-1).at,
      actionManifest: {
        version: 1, owner: "company_package", maxResponseMinutes: 15,
        actions: [boardRunCancelApproval({
          companyId, fingerprint, issueId: first.sourceIssueId, runId: first.rootRunId,
          title: `Cancel stale recovery run ${first.rootRunId}`,
          reason: "Contain repeated stale-recovery recursion; run cancellation is Board-only.",
        }), ...duplicateIssueIds.map((issueId) => issueCancelAction({ companyId, fingerprint, issueId }))],
      },
    });
  }

  for (const group of recoveryGroups.values()) {
    const runs = [...new Map(group.map((event) => [event.retryRunId, {
      issueId: event.sourceIssueId,
      runId: event.retryRunId,
      retryCategory: event.retryCategory,
      causeFingerprint: event.causeFingerprint,
    }])).values()].sort((a, b) => a.retryCategory.localeCompare(b.retryCategory) || a.runId.localeCompare(b.runId));
    const retryCategories = [...new Set(runs.map((run) => run.retryCategory))].sort();
    if (runs.length < 2 || retryCategories.length < 2) continue;
    const first = group[0];
    const canonical = runs[0];
    const siblingRuns = runs.slice(1);
    const fingerprint = incidentFingerprint("recovery_loop", [companyId, first.sourceIssueId, first.rootRunId]);
    const actions = siblingRuns.map((sibling) => boardRunCancelApproval({
      companyId,
      fingerprint,
      issueId: sibling.issueId,
      runId: sibling.runId,
      title: `Cancel duplicate adapter-failure run ${sibling.runId}`,
      reason: "Contain adapter_failed retry fan-out; run cancellation is Board-only.",
    }));
    incidents.push({
      fingerprint, problemKey: "recovery_loop", severity: 4, threshold: "recovery_fanout",
      sourceIssueId: first.sourceIssueId, rootRunId: first.rootRunId,
      canonicalRunId: canonical.runId,
      runIds: runs.map((run) => run.runId).sort(),
      retryCategories,
      causeFingerprints: [...new Set(runs.map((run) => run.causeFingerprint).filter(Boolean))].sort(),
      siblingRuns, eventCount: group.length, lastAt: [...group].sort(compareEvidenceEvents).at(-1).at,
      actionManifest: { version: 1, owner: "company_package", maxResponseMinutes: 60, actions },
    });
  }

  for (const group of churnGroups.values()) {
    if (group.length < 3) continue;
    const first = group[0];
    const fingerprint = incidentFingerprint("github_sync_churn", [companyId, first.issueId, first.mappingId, first.remoteFingerprint]);
    const target = { mappingId: first.mappingId, issueId: first.issueId };
    incidents.push({
      fingerprint, problemKey: "github_sync_churn", severity: 3, threshold: "concentrated_loop",
      mappingId: first.mappingId, remoteFingerprint: first.remoteFingerprint, canonicalIssueId: first.issueId,
      eventCount: group.length, lastAt: [...group].sort(compareEvidenceEvents).at(-1).at,
      actionManifest: {
        version: 1, owner: "github_sync_plugin", maxResponseMinutes: 15,
        actions: [mappingRemovalApproval({
          companyId, fingerprint, issueId: first.issueId, mappingId: first.mappingId,
          reason: "No per-mapping pause capability exists; removal is destructive and requires Board approval.",
        })],
      },
    });
  }

  const liveness = [...incidents].filter((incident) => incident.problemKey === "liveness_escalation");
  for (const incident of liveness) {
    const related = events.filter((event) => event.reasonCode === "github_sync_churn" && event.mappingId
      && [incident.sourceIssueId, incident.canonicalIssueId, ...incident.duplicateIssueIds].includes(event.issueId));
    const correlated = correlatedCompositeEvents([...related, ...events.filter((event) =>
      event.reasonCode === "liveness_escalation" && event.incidentKey === incident.incidentKey)]);
    const churn = correlated.find((event) => event.reasonCode === "github_sync_churn");
    if (!churn) continue;
    const fingerprint = incidentFingerprint("github_sync_liveness_escalation", [companyId, incident.incidentKey, churn.mappingId, churn.remoteFingerprint ?? "unknown"]);
    const target = { mappingId: churn.mappingId, issueId: incident.sourceIssueId };
    incidents.push({
      fingerprint, problemKey: "github_sync_liveness_escalation", severity: 4, threshold: "critical_one_off",
      incidentKey: incident.incidentKey, sourceIssueId: incident.sourceIssueId, canonicalIssueId: incident.canonicalIssueId,
      mappingId: churn.mappingId, remoteFingerprint: churn.remoteFingerprint,
      eventCount: correlated.length, lastAt: correlated.at(-1).at,
      actionManifest: {
        version: 1, owner: "company_package", maxResponseMinutes: 15,
        actions: [...incident.actionManifest.actions, mappingRemovalApproval({
          companyId, fingerprint, issueId: incident.sourceIssueId, mappingId: churn.mappingId,
          reason: "Composite sync/liveness containment; mapping removal requires Board approval.",
        })],
      },
    });
  }

  const compositeFingerprints = new Set(incidents.filter((incident) => incident.problemKey === "github_sync_liveness_escalation").map((incident) => incident.fingerprint));
  const byIssue = new Map();
  for (const event of events) {
    if (!["github_sync_churn", "liveness_escalation"].includes(event.reasonCode)) continue;
    add(byIssue, event.issueId, event);
  }
  for (const issueEvents of byIssue.values()) {
    const correlated = correlatedCompositeEvents(issueEvents);
    const churn = correlated.find((event) => event.reasonCode === "github_sync_churn" && event.mappingId && event.remoteFingerprint);
    const escalation = correlated.find((event) => event.reasonCode === "liveness_escalation" && event.incidentKey && event.sourceIssueId);
    if (!churn || !escalation) continue;
    const fingerprint = incidentFingerprint("github_sync_liveness_escalation", [companyId, escalation.incidentKey, churn.mappingId, churn.remoteFingerprint]);
    if (compositeFingerprints.has(fingerprint)) continue;
    compositeFingerprints.add(fingerprint);
    const target = { mappingId: churn.mappingId, issueId: escalation.sourceIssueId };
    incidents.push({
      fingerprint, problemKey: "github_sync_liveness_escalation", severity: 4, threshold: "critical_one_off",
      incidentKey: escalation.incidentKey, sourceIssueId: escalation.sourceIssueId,
      canonicalIssueId: escalation.existingEvaluationIssueId, mappingId: churn.mappingId, remoteFingerprint: churn.remoteFingerprint,
      eventCount: correlated.length, lastAt: correlated.at(-1).at,
      actionManifest: {
        version: 1, owner: "company_package", maxResponseMinutes: 15,
        actions: [mappingRemovalApproval({
          companyId, fingerprint, issueId: escalation.sourceIssueId, mappingId: churn.mappingId,
          reason: "Composite sync/liveness containment; mapping removal requires Board approval.",
        })],
      },
    });
  }

  return incidents.sort((a, b) => b.severity - a.severity || b.lastAt.localeCompare(a.lastAt) || a.fingerprint.localeCompare(b.fingerprint));
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

function runUsageTelemetry(issues) {
  const byRun = new Map();
  for (const issue of issues ?? []) {
    for (const row of issue.evidence ?? []) {
      const runId = row?.runId ?? (row?.resource === "runs" ? row?.id : null);
      if (!runId || !TERMINAL_RUN_STATUSES.has(row.status)) continue;
      byRun.set(String(runId), row);
    }
  }
  const rows = [...byRun.entries()].sort(([left], [right]) => left.localeCompare(right));
  const metricAliases = {
    inputTokens: ["inputTokens", "input_tokens"],
    outputTokens: ["outputTokens", "output_tokens"],
    costUsd: ["costUsd", "cost_usd", "total_cost_usd"],
  };
  const metricNames = Object.keys(metricAliases);
  const knownTotals = Object.fromEntries(metricNames.map((name) => [name, 0]));
  const knownRunCounts = Object.fromEntries(metricNames.map((name) => [name, 0]));
  const unknownUsage = Object.fromEntries(metricNames.map((name) => [name, "unknown"]));
  const runTelemetry = [];
  let available = 0;
  for (const [runId, row] of rows) {
    const usageJson = row.usageJson && typeof row.usageJson === "object" && !Array.isArray(row.usageJson)
      ? row.usageJson
      : {};
    const parsed = {};
    for (const [metricName, aliases] of Object.entries(metricAliases)) {
      const candidates = aliases.flatMap((alias) => [row?.[alias], usageJson?.[alias]]);
      const value = candidates.find((candidate) => (
        typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0
      ));
      parsed[metricName] = value ?? "unknown";
      if (value !== undefined) {
        knownTotals[metricName] += value;
        knownRunCounts[metricName] += 1;
      }
    }
    if (metricNames.some((name) => parsed[name] !== "unknown")) available += 1;
    if (runTelemetry.length < MAX_TELEMETRY_RUNS) {
      runTelemetry.push({ runId: boundedIdentifier(runId, "run"), status: row.status, usage: parsed });
    }
  }
  const unavailable = rows.length - available;
  const partialTotals = Object.fromEntries(metricNames.map((name) => [
    name,
    knownRunCounts[name] > 0 ? knownTotals[name] : "unknown",
  ]));
  const completeTotals = Object.fromEntries(metricNames.map((name) => [
    name,
    rows.length > 0 && knownRunCounts[name] === rows.length ? knownTotals[name] : "unknown",
  ]));
  return {
    terminalRuns: rows.length,
    usageAvailableRuns: available,
    usageUnavailableRuns: unavailable,
    availability: rows.length === 0 || available === 0 ? "unknown" : unavailable > 0 ? "partial" : "complete",
    runs: runTelemetry,
    runsTruncated: rows.length > MAX_TELEMETRY_RUNS,
    knownRunCounts,
    knownTotals: rows.length > 0 ? partialTotals : unknownUsage,
    totals: completeTotals,
  };
}

export function analyzeEvidence(input) {
  const mode = input.mode ?? input.collection?.mode ?? "full";
  const window = buildWindow(input.asOf, mode);
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
  let invalidControlOperandCount = 0;

  for (const sourceIssue of input.issues ?? []) {
    for (const raw of sourceIssue.evidence ?? []) {
      if (raw?.invalidControl) {
        invalidControlOperandCount += 1;
        continue;
      }
      if (raw?.invalidTimestamp) {
        invalidTimestampCount += 1;
        continue;
      }
      const event = canonicalEvent({
        ...raw,
        issueOriginKind: raw.issueOriginKind ?? sourceIssue.originKind,
        issueSurfaceVisibility: raw.issueSurfaceVisibility ?? sourceIssue.surfaceVisibility,
      }, sourceIssue.id);
      if (event?.invalidControl) {
        invalidControlOperandCount += 1;
        continue;
      }
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
  if (invalidControlOperandCount > 0) {
    coverage.complete = false;
    coverage.missing = [...new Set([...coverage.missing, `invalid_control_operands:${invalidControlOperandCount}`])].sort();
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

  const incidentSources = new Map();
  for (const event of events) {
    if (event.reasonCode !== "liveness_escalation" || !event.incidentKey || !event.sourceIssueId) continue;
    const sources = incidentSources.get(event.incidentKey) ?? new Set();
    sources.add(event.sourceIssueId);
    incidentSources.set(event.incidentKey, sources);
  }
  const conflictingIncidentIdentityCount = [...incidentSources.values()].filter((sources) => sources.size > 1).length;
  if (conflictingIncidentIdentityCount > 0) {
    coverage.complete = false;
    coverage.missing = [...new Set([...coverage.missing, `conflicting_incident_identity:${conflictingIncidentIdentityCount}`])].sort();
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
    ...(input.collection ? { collection: stableSort(input.collection) } : {}),
    telemetry: runUsageTelemetry(input.issues),
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
    incidents: [],
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

  const compositePolicy = eventPolicy("github_sync_liveness_escalation");
  for (const issue of issueRows) {
    const correlated = correlatedCompositeEvents(issue.evidence);
    if (correlated.length === 0) continue;
    const key = candidateKey(compositePolicy);
    const group = groups.get(key) ?? { policy: compositePolicy, events: [] };
    group.events.push(...correlated);
    groups.set(key, group);
  }

  const decisions = decisionMap(input.priorDecisions);
  base.incidents = buildOperationalIncidents(events, base.companyId).filter((incident) => {
    const prior = decisions.get(incident.fingerprint);
    if (!prior) return true;
    if (ACTIVE_DECISIONS.has(prior.status)) return false;
    return buildOperationalIncidents(events.filter((event) => event.at > prior.at), base.companyId)
      .some((fresh) => fresh.fingerprint === incident.fingerprint);
  });
  if (mode === "containment") {
    base.outcome = base.incidents.length > 0 ? "operational_incidents" : "no_change";
    return finalizeReport(base);
  }
  for (const { policy, events: unsortedEvents } of groups.values()) {
    if (OPERATIONAL_PROBLEMS.has(policy.problemKey)) continue;
    const groupEvents = [...unsortedEvents].sort(compareEvidenceEvents);
    const threshold = thresholdFor(groupEvents, policy);
    const incidentIdentity = `sha256:${hash([
      ...new Set(groupEvents.map((event) => event.issueId)).values(),
      ...new Set(groupEvents.map((event) => event.runId).filter(Boolean)).values(),
    ].sort())}`;
    const fingerprint = fingerprintFor({ ...policy, incidentIdentity });
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
      const freshThreshold = thresholdFor(freshEvents, policy);
      if (!freshThreshold) {
        base.rejected.push({ ...common, threshold, reasonCode: "no_post_decision_recurrence" });
        continue;
      }
    }
    base.candidates.push({
      ...common,
      threshold,
      dedupe: prior ? "recurred_after_decision" : "new",
    });
  }

  const rank = (a, b) => b.severity - a.severity
    || b.issueCount - a.issueCount
    || b.eventCount - a.eventCount
    || b.lastAt.localeCompare(a.lastAt)
    || a.fingerprint.localeCompare(b.fingerprint);
  base.candidates.sort(rank);
  if (base.candidates.length > 3) {
    for (const candidate of base.candidates.splice(3)) {
      base.rejected.push({ ...candidate, reasonCode: "proposal_cap" });
    }
  }
  base.rejected.sort(rank);
  if (base.rejected.length > MAX_REJECTED) {
    base.rejectedTruncated = base.rejected.length - MAX_REJECTED;
    base.rejected = base.rejected.slice(0, MAX_REJECTED);
  }
  if (base.candidates.length > 0 && base.incidents.length > 0) base.outcome = "ranked_candidates_and_incidents";
  else if (base.incidents.length > 0) base.outcome = "operational_incidents";
  else if (base.candidates.length > 0) base.outcome = "ranked_candidates";
  else base.outcome = "no_change";
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
    if (event?.invalidControl) events.push({ id: event.id, issueId, invalidControl: true });
    else if (event?.invalid) events.push({ id: event.id, issueId, invalidTimestamp: true });
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

function surfaceRowTimestamp(row) {
  return iso(row?.createdAt ?? row?.updatedAt ?? row?.timestamp ?? row?.startedAt ?? row?.finishedAt);
}

function boundedSurfaceCoverage(rows, cap, window) {
  const timestamps = rows.map(surfaceRowTimestamp);
  const base = {
    boundaryReached: false,
    cap,
    complete: false,
    count: rows.length,
    newestAt: timestamps[0] ?? null,
    oldestAt: timestamps.at(-1) ?? null,
    reads: 1,
    reason: "invalid_boundary_timestamp",
    windowStart: window.start,
  };
  if (timestamps.some((timestamp) => timestamp == null)) return base;
  if (timestamps.some((timestamp, index) => index > 0 && timestamp > timestamps[index - 1])) {
    return { ...base, reason: "response_not_newest_first" };
  }
  if (timestamps[0] && timestamps[0] > window.end) return { ...base, reason: "record_after_as_of" };
  if (rows.length < cap) return { ...base, complete: true, reason: "below_cap" };
  if (rows.length > cap) return { ...base, reason: "response_exceeded_cap" };
  if (timestamps.at(-1) < window.start) {
    return { ...base, boundaryReached: true, complete: true, reason: "window_boundary_reached" };
  }
  return { ...base, reason: "window_boundary_not_reached" };
}

function surfaceMissingCode(label, coverage) {
  if (coverage.complete) return null;
  if (coverage.reason === "window_boundary_not_reached") return `${label}:truncated`;
  return `${label}:${coverage.reason}`;
}

export async function collectEvidence({ baseUrl, apiKey, companyId, asOf, mode = "full", fetchImpl = fetch }) {
  if (!baseUrl || !apiKey || !companyId) throw new Error("PAPERCLIP_API_URL, PAPERCLIP_API_KEY, and PAPERCLIP_COMPANY_ID are required.");
  if (!["full", "containment"].includes(mode)) throw new Error("mode must be full or containment.");
  const window = buildWindow(asOf, mode);
  const client = { baseUrl, apiKey, fetchImpl };
  const missing = [];
  const activityPath = `/api/companies/${encodeURIComponent(companyId)}/activity?entityType=heartbeat_run&limit=500`;
  let companyActivity = [];
  let heartbeatRunActivityCoverage = null;
  try {
    companyActivity = collectionRows(await apiGet(client, activityPath));
    heartbeatRunActivityCoverage = boundedSurfaceCoverage(companyActivity, 500, window);
    const missingCode = surfaceMissingCode("company:heartbeat_run_activity", heartbeatRunActivityCoverage);
    if (missingCode) missing.push(missingCode);
  } catch {
    missing.push("company:heartbeat_run_activity");
  }

  let issueActivity = [];
  let companyRuns = [];
  let issueActivityCoverage = null;
  let heartbeatRunsCoverage = null;
  if (mode === "containment") {
    try {
      issueActivity = collectionRows(await apiGet(
        client,
        `/api/companies/${encodeURIComponent(companyId)}/activity?entityType=issue&limit=500`
      ));
      issueActivityCoverage = boundedSurfaceCoverage(issueActivity, 500, window);
      const missingCode = surfaceMissingCode("company:issue_activity", issueActivityCoverage);
      if (missingCode) missing.push(missingCode);
    } catch {
      missing.push("company:issue_activity");
    }
    try {
      companyRuns = collectionRows(await apiGet(
        client,
        `/api/companies/${encodeURIComponent(companyId)}/heartbeat-runs?limit=1000`
      ));
      heartbeatRunsCoverage = boundedSurfaceCoverage(companyRuns, 1000, window);
      const missingCode = surfaceMissingCode("company:heartbeat_runs", heartbeatRunsCoverage);
      if (missingCode) missing.push(missingCode);
    } catch {
      missing.push("company:heartbeat_runs");
    }
  }

  const rowInWindow = (row) => {
    const at = surfaceRowTimestamp(row);
    return at != null && at >= window.start && at < window.end;
  };
  const allCompanyActivity = [...companyActivity, ...issueActivity];
  const windowCompanyActivity = allCompanyActivity.filter(rowInWindow);
  const windowCompanyRuns = companyRuns.filter(rowInWindow);
  const activityClassifications = windowCompanyActivity.map((row) => ({
    row,
    event: canonicalEvent({ ...row, resource: "company_activity", source: "company_activity" }),
  }));
  const invalidActivityControlCount = activityClassifications
    .filter(({ event }) => event?.invalidControl)
    .length;
  if (invalidActivityControlCount > 0) {
    missing.push(`invalid_control_operands:${invalidActivityControlCount}`);
  }
  const validWindowCompanyActivity = activityClassifications
    .filter(({ event }) => event && !event.invalid && !event.invalidControl)
    .map(({ row }) => row);
  const activityEvents = activityClassifications
    .map(({ event }) => event)
    .filter((event) => event && !event.invalid && !event.invalidControl);

  if (mode === "containment") {
    const companyRunIssueId = (run) => {
      const snapshot = run?.contextSnapshot && typeof run.contextSnapshot === "object"
        ? run.contextSnapshot
        : {};
      return run?.issueId ?? snapshot.issueId;
    };
    const issueIds = [...new Set([
      ...activityEvents.map((event) => event.sourceIssueId ?? event.issueId),
      ...windowCompanyRuns.map(companyRunIssueId),
    ].filter(Boolean).map(String))].sort();
    const issues = issueIds.map((issueId) => ({
      id: issueId,
      key: issueId,
      evidence: [
        ...validWindowCompanyActivity.filter((row) => {
          const details = row?.details && typeof row.details === "object" ? row.details : {};
          return String(details.sourceIssueId ?? details.issueId ?? row.issueId ?? row.entityId ?? "") === issueId;
        }),
        ...windowCompanyRuns
          .filter((run) => String(companyRunIssueId(run) ?? "") === issueId)
          .map((run) => ({ ...run, resource: "runs", issueId })),
      ],
    }));
    const report = analyzeEvidence({
      companyId,
      asOf,
      mode,
      coverage: {
        complete: missing.length === 0,
        missing,
        resources: {
          heartbeatRunActivity: heartbeatRunActivityCoverage ?? {
            complete: false,
            count: companyActivity.length,
            reads: 1,
            reason: "read_failed",
          },
          issueActivity: issueActivityCoverage ?? {
            complete: false,
            count: issueActivity.length,
            reads: 1,
            reason: "read_failed",
          },
          heartbeatRuns: heartbeatRunsCoverage ?? {
            complete: false,
            count: companyRuns.length,
            reads: 1,
            reason: "read_failed",
          },
        },
      },
      agents: [],
      issues,
      priorDecisions: [],
      collection: {
        mode,
        companyActivityReads: 2,
        companyRunReads: 1,
        issueRunReads: 0,
        incidentsFound: 0,
      },
    });
    report.collection.incidentsFound = report.incidents.length;
    return stableSort(report);
  }

  const resources = {
    companyActivity: heartbeatRunActivityCoverage ?? {
      complete: false,
      count: companyActivity.length,
      reads: 1,
      reason: "read_failed",
    },
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
    const evidence = companyActivity.filter((row) => {
      const details = row?.details && typeof row.details === "object" ? row.details : {};
      return String(details.sourceIssueId ?? details.issueId ?? row.issueId ?? "") === issueId;
    });
    const issuePriorDecisions = [];
    resources.issueResources.issuesChecked += 1;
    await Promise.all(RESOURCE_NAMES.map(async (resource) => {
      try {
        const body = await apiGet(client, `/api/issues/${encodeURIComponent(issueId)}/${resource}`);
        const rows = collectionRows(body);
        if (collectionHasMore(body)) missing.push(`issue:${issueId}:${resource}:next_page`);
        else resources.issueResources.readsComplete += 1;
        evidence.push(...(resource === "runs"
          ? rows.map((row) => ({ ...row, issueId, resource: "runs" }))
          : resourceEvents(rows, issue, resource)));
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
    collection: { mode, companyActivityReads: 1, issueRunReads: issueList.length, modelStartRequired: true },
  });
}

function parseArgs(argv) {
  const result = { asOf: null, mode: "full" };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--as-of") {
      result.asOf = argv[index + 1] ?? null;
      index += 1;
    } else if (argv[index] === "--mode") {
      result.mode = argv[index + 1] ?? null;
      index += 1;
    } else if (argv[index] === "--help" || argv[index] === "-h") {
      process.stdout.write("Usage: issue-history-evidence.mjs --as-of <ISO-8601 UTC timestamp> [--mode full|containment]\n");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  if (!result.asOf) throw new Error("--as-of is required; the workflow never infers the evidence boundary.");
  if (!["full", "containment"].includes(result.mode)) throw new Error("--mode must be full or containment.");
  return result;
}

async function main() {
  const { asOf, mode } = parseArgs(process.argv.slice(2));
  const report = await collectEvidence({
    baseUrl: process.env.PAPERCLIP_API_URL,
    apiKey: process.env.PAPERCLIP_API_KEY,
    companyId: process.env.PAPERCLIP_COMPANY_ID,
    asOf,
    mode,
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
