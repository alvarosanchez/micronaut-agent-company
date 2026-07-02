import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

import {
  analyzeEvidence,
  buildWindow,
  collectEvidence,
  fingerprintFor,
} from "../skills/ceo-issue-history/scripts/issue-history-evidence.mjs";

const AS_OF = "2026-07-01T00:00:00.000Z";

function event(id, issueId, at, reasonCode, runId = null, extra = {}) {
  return { id, issueId, at, reasonCode, runId, source: "activity", ...extra };
}

function input(events, overrides = {}) {
  return {
    companyId: "company-1",
    asOf: AS_OF,
    coverage: { complete: true, missing: [] },
    issues: [
      { id: "i1", key: "MIC-1", status: "done", evidence: events.filter((item) => item.issueId === "i1") },
      { id: "i2", key: "MIC-2", status: "done", evidence: events.filter((item) => item.issueId === "i2") },
    ],
    priorDecisions: [],
    ...overrides,
  };
}

test("uses an exact half-open 30-day UTC window", () => {
  assert.deepEqual(buildWindow(AS_OF), {
    start: "2026-06-01T00:00:00.000Z",
    end: AS_OF,
  });

  const report = analyzeEvidence(input([
    event("before", "i1", "2026-05-31T23:59:59.999Z", "handoff_mismatch"),
    event("start", "i1", "2026-06-01T00:00:00.000Z", "handoff_mismatch"),
    event("middle", "i1", "2026-06-15T00:00:00.000Z", "handoff_mismatch"),
    event("other", "i2", "2026-06-20T00:00:00.000Z", "handoff_mismatch"),
    event("end", "i2", AS_OF, "handoff_mismatch"),
  ]));

  assert.equal(report.candidates[0].eventCount, 3);
  assert.deepEqual(report.candidates[0].issues.map((item) => item.id), ["i1", "i2"]);
});

test("is byte-stable under shuffled input and duplicate events do not inflate counts", () => {
  const events = [
    event("e3", "i2", "2026-06-20T00:00:00.000Z", "github_sync_churn", "r3"),
    event("e1", "i1", "2026-06-10T00:00:00.000Z", "github_sync_churn", "r1"),
    event("e2", "i1", "2026-06-11T00:00:00.000Z", "github_sync_churn", "r2"),
    event("e2", "i1", "2026-06-11T00:00:00.000Z", "github_sync_churn", "r2"),
  ];
  const first = analyzeEvidence(input(events));
  const secondInput = input([...events].reverse());
  secondInput.issues.reverse();
  const second = analyzeEvidence(secondInput);

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.candidates[0].eventCount, 3);
  assert.equal(first.candidates[0].threshold, "cross_issue_recurrence");
});

test("applies cross-issue, concentrated-loop, critical one-off, and below-threshold gates", () => {
  const report = analyzeEvidence(input([
    event("cross-1", "i1", "2026-06-02T00:00:00.000Z", "handoff_mismatch", "r1"),
    event("cross-2", "i1", "2026-06-03T00:00:00.000Z", "handoff_mismatch", "r2"),
    event("cross-3", "i2", "2026-06-04T00:00:00.000Z", "handoff_mismatch", "r3"),
    event("loop-1", "i1", "2026-06-05T00:00:00.000Z", "failed", "a"),
    event("loop-2", "i1", "2026-06-06T00:00:00.000Z", "blocked", "b"),
    event("loop-3", "i1", "2026-06-07T00:00:00.000Z", "changes_requested", "b"),
    event("critical", "i2", "2026-06-08T00:00:00.000Z", "external_write_without_approval", "c"),
    event("ordinary", "i2", "2026-06-09T00:00:00.000Z", "tool_error", "d"),
  ]));

  assert.deepEqual(report.candidates.map((candidate) => candidate.threshold), [
    "critical_one_off",
    "cross_issue_recurrence",
    "concentrated_loop",
  ]);
  assert.ok(report.rejected.some((candidate) => candidate.reasonCode === "below_threshold"));
});

test("fails closed on incomplete coverage and returns a verified no-op for complete empty evidence", () => {
  const blocked = analyzeEvidence(input([], {
    coverage: { complete: false, missing: ["issue:i2:comments", "heartbeat_runs:page_after_1000"] },
  }));
  assert.equal(blocked.outcome, "blocked_incomplete_evidence");
  assert.deepEqual(blocked.candidates, []);
  assert.deepEqual(blocked.coverage.missing, ["heartbeat_runs:page_after_1000", "issue:i2:comments"]);

  const noChange = analyzeEvidence(input([]));
  assert.equal(noChange.outcome, "no_change");
  assert.deepEqual(noChange.candidates, []);
});

test("deduplicates prior active decisions by stable controlled-field fingerprint", () => {
  const fields = {
    category: "workflow",
    problemKey: "handoff_mismatch",
    component: "paperclip",
    targetSurface: "company_package",
  };
  const fingerprint = fingerprintFor(fields);
  const report = analyzeEvidence(input([
    event("e1", "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch"),
    event("e2", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch"),
    event("e3", "i2", "2026-06-12T00:00:00.000Z", "handoff_mismatch"),
  ], {
    priorDecisions: [{ fingerprint, status: "open", at: "2026-06-13T00:00:00.000Z" }],
  }));

  assert.equal(report.outcome, "no_change");
  assert.equal(report.candidates.length, 0);
  assert.equal(report.rejected[0].reasonCode, "duplicate_active");
});

test("requires a fresh post-decision threshold after implemented or rejected outcomes", () => {
  const fields = {
    category: "workflow",
    problemKey: "handoff_mismatch",
    component: "paperclip",
    targetSurface: "company_package",
  };
  const priorDecisions = [{
    fingerprint: fingerprintFor(fields),
    status: "implemented",
    at: "2026-06-15T00:00:00.000Z",
  }];
  const historical = [
    event("old-1", "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch"),
    event("old-2", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch"),
    event("old-3", "i2", "2026-06-12T00:00:00.000Z", "handoff_mismatch"),
  ];
  const suppressed = analyzeEvidence(input([
    ...historical,
    event("new-1", "i1", "2026-06-20T00:00:00.000Z", "handoff_mismatch"),
  ], { priorDecisions }));
  assert.equal(suppressed.candidates.length, 0);
  assert.equal(suppressed.rejected[0].reasonCode, "no_post_decision_recurrence");

  const recurred = analyzeEvidence(input([
    ...historical,
    event("new-1", "i1", "2026-06-20T00:00:00.000Z", "handoff_mismatch"),
    event("new-2", "i1", "2026-06-21T00:00:00.000Z", "handoff_mismatch"),
    event("new-3", "i2", "2026-06-22T00:00:00.000Z", "handoff_mismatch"),
  ], { priorDecisions }));
  assert.equal(recurred.candidates[0].dedupe, "recurred_after_decision");
});

test("bounds and redacts excerpts without exposing raw logs or secrets", () => {
  const secret = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";
  const report = analyzeEvidence(input([
    event("e1", "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch", "r1", { excerpt: `Authorization: Bearer ${secret} ${"x".repeat(500)}` }),
    event("e2", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch", "r2"),
    event("e3", "i2", "2026-06-12T00:00:00.000Z", "handoff_mismatch", "r3"),
  ]));
  const serialized = JSON.stringify(report);

  assert.doesNotMatch(serialized, /ghp_/);
  assert.doesNotMatch(serialized, /Authorization/i);
  assert.ok(report.issues[0].evidence[0].excerpt.length <= 160);
  assert.equal(Object.hasOwn(report.issues[0].evidence[0], "log"), false);
});

test("collector records issue-by-issue coverage and fails closed when a resource read fails", async () => {
  const responses = new Map([
    ["/api/companies/company-1/issues", [{ id: "i1", identifier: "MIC-1", status: "done" }]],
    ["/api/companies/company-1/heartbeat-runs?limit=1000&summary=true", []],
    ["/api/companies/company-1/activity?limit=1000", { items: [], hasMore: true }],
  ]);
  for (const resource of ["comments", "documents", "runs", "activity", "cost-summary", "approvals", "interactions", "recovery-actions", "work-products"]) {
    responses.set(`/api/issues/i1/${resource}`, []);
  }
  responses.delete("/api/issues/i1/comments");

  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname + new URL(url).search;
    if (!responses.has(pathname)) return new Response("missing", { status: 503 });
    return Response.json(responses.get(pathname));
  };
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "secret-token",
    companyId: "company-1",
    asOf: AS_OF,
    fetchImpl,
  });

  assert.equal(report.outcome, "blocked_incomplete_evidence");
  assert.deepEqual(report.coverage.missing, ["company_activity:page_after_1000", "issue:i1:comments"]);
  assert.equal(JSON.stringify(report).includes("secret-token"), false);
});

test("CEO routine is wired to the CEO-only evidence skill and keeps broad maintenance mechanics out of the prompt", async () => {
  const root = new URL("../", import.meta.url);
  const ceo = await readFile(new URL("agents/ceo/AGENTS.md", root), "utf8");
  const routine = await readFile(new URL("tasks/monthly-ceo-self-improvement/TASK.md", root), "utf8");
  const skill = await readFile(new URL("skills/ceo-issue-history/SKILL.md", root), "utf8");
  const readme = await readFile(new URL("README.md", root), "utf8");

  assert.match(ceo, /ceo-issue-history/);
  assert.match(routine, /issue-history-evidence\.mjs[\s\S]{0,300}--as-of/i);
  assert.match(routine, /blocked_incomplete_evidence[\s\S]{0,300}no_change/i);
  assert.match(skill, /\[asOf-30d,asOf\)/);
  assert.match(readme, /deterministic 30-day issue-history/i);
  assert.ok(Buffer.byteLength(routine) < 6_000, "Routine should route to skills instead of embedding broad mechanics.");

  const ceoSkills = YAML.parse(ceo.match(/^---\n([\s\S]*?)\n---/)[1]).skills;
  assert.ok(ceoSkills.includes("ceo-issue-history"));
  for (const slug of ["product-manager", "architect", "qa-engineer", "security-engineer", "micronaut-engineer", "code-reviewer", "technical-writer"]) {
    const markdown = await readFile(new URL(`agents/${slug}/AGENTS.md`, root), "utf8");
    const skills = YAML.parse(markdown.match(/^---\n([\s\S]*?)\n---/)[1]).skills;
    assert.equal(skills.includes("ceo-issue-history"), false, `${slug} must not receive the CEO evidence skill.`);
  }
});
