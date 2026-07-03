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
  return {
    id,
    issueId,
    at,
    reasonCode,
    runId,
    source: "activity",
    ...(reasonCode === "github_sync_churn" ? { sourcePluginId: "paperclip-github-plugin" } : {}),
    ...extra,
  };
}

function input(events, overrides = {}) {
  return {
    companyId: "company-1",
    asOf: AS_OF,
    coverage: { complete: true, missing: [] },
    agents: [
      { id: "a1", name: "Agent One", role: "engineer" },
      { id: "a2", name: "Agent Two", role: "qa" },
    ],
    issues: [
      { id: "i1", key: "MIC-1", status: "done", evidence: events.filter((item) => item.issueId === "i1") },
      { id: "i2", key: "MIC-2", status: "done", evidence: events.filter((item) => item.issueId === "i2") },
    ],
    priorDecisions: [],
    ...overrides,
  };
}

test("uses the exact UTC half-open 30-day window", () => {
  assert.throws(() => buildWindow("2026-07-01T00:00:00"), /explicit UTC designator/);
  assert.throws(() => buildWindow("2026-07-01T02:00:00+02:00"), /explicit UTC designator/);
  assert.deepEqual(buildWindow("2026-07-01T00:00:00+00:00"), {
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

test("uses a six-hour rolling containment window with a four-hour overlap", () => {
  assert.deepEqual(buildWindow(AS_OF, "containment"), {
    start: "2026-06-30T18:00:00.000Z",
    end: AS_OF,
  });

  const sharedIncident = [
    event("stale-a", "source-1", "2026-06-30T22:00:00.000Z", "stale_recovery_recursion", "run-root", {
      sourceIssueId: "source-1",
      existingEvaluationIssueId: "eval-1",
      rootRunId: "run-root",
    }),
    event("stale-b", "source-1", "2026-06-30T22:01:00.000Z", "stale_recovery_recursion", "run-root", {
      sourceIssueId: "source-1",
      existingEvaluationIssueId: "eval-1",
      rootRunId: "run-root",
    }),
  ];
  const first = analyzeEvidence(input(sharedIncident, {
    mode: "containment",
    issues: [{ id: "source-1", key: "source-1", status: "in_progress", evidence: sharedIncident }],
  }));
  const second = analyzeEvidence(input(sharedIncident, {
    asOf: "2026-07-01T02:00:00.000Z",
    mode: "containment",
    issues: [{ id: "source-1", key: "source-1", status: "in_progress", evidence: sharedIncident }],
  }));

  assert.equal(first.incidents.length, 1);
  assert.equal(second.incidents.length, 1);
  assert.equal(first.incidents[0].fingerprint, second.incidents[0].fingerprint);
  const suppressed = analyzeEvidence(input(sharedIncident, {
    asOf: "2026-07-01T02:00:00.000Z",
    mode: "containment",
    issues: [{ id: "source-1", key: "source-1", status: "in_progress", evidence: sharedIncident }],
    priorDecisions: [{
      fingerprint: first.incidents[0].fingerprint,
      status: "implemented",
      at: "2026-07-01T00:30:00.000Z",
    }],
  }));
  assert.equal(suppressed.incidents.length, 0);

  const monthlyOnlyEvidence = [
    event("monthly-a", "i1", "2026-06-30T22:00:00.000Z", "handoff_mismatch", "run-a"),
    event("monthly-b", "i1", "2026-06-30T22:01:00.000Z", "handoff_mismatch", "run-b"),
    event("monthly-c", "i2", "2026-06-30T22:02:00.000Z", "handoff_mismatch", "run-c"),
  ];
  const containmentOnly = analyzeEvidence(input(monthlyOnlyEvidence, { mode: "containment" }));
  assert.equal(containmentOnly.outcome, "no_change");
  assert.deepEqual(containmentOnly.candidates, []);
});

test("is byte-stable under shuffled input and duplicate events do not inflate counts", () => {
  const events = [
    event("e3", "i2", "2026-06-20T00:00:00.000Z", "handoff_mismatch", "r3"),
    event("e1", "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch", "r1"),
    event("e2", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch", "r2"),
    event("e2", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch", "r2"),
  ];
  const first = analyzeEvidence(input(events));
  const secondInput = input([...events].reverse());
  secondInput.issues.reverse();
  const second = analyzeEvidence(secondInput);

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.candidates[0].eventCount, 3);
  assert.equal(first.candidates[0].threshold, "cross_issue_recurrence");
});

test("groups duplicate liveness escalation issues by incidentKey and emits exact safe actions", () => {
  const evidence = [
    event("live-1", "eval-2", "2026-06-11T00:00:00.000Z", "liveness_escalation", "run-live-1", {
      incidentKey: "incident-77", sourceIssueId: "source-1", existingEvaluationIssueId: "eval-1",
    }),
    event("live-2", "eval-1", "2026-06-11T00:01:00.000Z", "liveness_escalation", "run-live-2", {
      incidentKey: "incident-77", sourceIssueId: "source-1", existingEvaluationIssueId: "eval-1",
    }),
  ];
  const report = analyzeEvidence(input(evidence, {
    issues: [
      { id: "eval-1", key: "MIC-10", status: "todo", evidence: evidence.filter((item) => item.issueId === "eval-1") },
      { id: "eval-2", key: "MIC-11", status: "todo", evidence: evidence.filter((item) => item.issueId === "eval-2") },
    ],
  }));

  assert.equal(report.incidents.length, 1);
  const incident = report.incidents[0];
  assert.equal(incident.problemKey, "liveness_escalation");
  assert.equal(incident.incidentKey, "incident-77");
  assert.equal(incident.canonicalIssueId, "eval-1");
  assert.deepEqual(incident.duplicateIssueIds, ["eval-2"]);
  assert.deepEqual(incident.actionManifest.actions.map((action) => [action.operation, action.target.issueId]), [
    ["paperclip.issue.update", "eval-2"],
  ]);
  assert.deepEqual(incident.actionManifest.actions[0].preconditions, {
    method: "GET", path: "/api/issues/eval-2", companyId: "company-1",
    status: ["backlog", "todo", "in_progress", "blocked", "in_review"],
  });
});

test("groups stale recursion only by company, source issue, and identical run and names evaluation actions", () => {
  const evidence = [
    event("stale-1", "eval-a", "2026-06-10T00:00:00.000Z", "stale_recovery_recursion", "run-root", {
      sourceIssueId: "source-1", existingEvaluationIssueId: "eval-a", rootRunId: "run-root",
    }),
    event("stale-2", "eval-b", "2026-06-10T00:01:00.000Z", "stale_recovery_recursion", "run-root", {
      sourceIssueId: "source-1", existingEvaluationIssueId: "eval-b", rootRunId: "run-root",
    }),
    event("other-run", "eval-c", "2026-06-10T00:02:00.000Z", "stale_recovery_recursion", "run-other", {
      sourceIssueId: "source-1", existingEvaluationIssueId: "eval-c", rootRunId: "run-other",
    }),
  ];
  const report = analyzeEvidence(input(evidence, {
    issues: evidence.map((item) => ({ id: item.issueId, key: item.issueId, status: "todo", evidence: [item] })),
  }));
  const incident = report.incidents.find((item) => item.problemKey === "stale_recovery_recursion");
  assert.equal(incident?.rootRunId, "run-root");
  assert.equal(incident?.canonicalIssueId, "eval-a");
  assert.deepEqual(incident?.duplicateIssueIds, ["eval-b"]);
  assert.deepEqual(incident?.actionManifest.actions.map((action) => [action.operation, action.target]), [
    ["paperclip.approval.request", { issueId: "source-1", runId: "run-root" }],
    ["paperclip.issue.update", { issueId: "eval-b" }],
  ]);
  assert.equal(report.incidents.some((item) => item.rootRunId === "run-other"), false);
});

test("contains repeated stale-recursion refusals when one evaluation issue already exists", () => {
  const evidence = [
    event("stale-1", "source-1", "2026-06-10T00:00:00.000Z", "stale_recovery_recursion", "run-root", {
      sourceIssueId: "source-1", existingEvaluationIssueId: "eval-a", rootRunId: "run-root",
    }),
    event("stale-2", "source-1", "2026-06-10T00:01:00.000Z", "stale_recovery_recursion", "run-root", {
      sourceIssueId: "source-1", existingEvaluationIssueId: "eval-a", rootRunId: "run-root",
    }),
  ];
  const report = analyzeEvidence(input(evidence, {
    issues: [{ id: "source-1", key: "DEV-1", status: "in_progress", evidence }],
  }));
  const incident = report.incidents.find((item) => item.problemKey === "stale_recovery_recursion");
  assert.equal(incident?.existingEvaluationIssueId, "eval-a");
  assert.deepEqual(incident?.duplicateIssueIds, []);
  assert.deepEqual(incident?.actionManifest.actions.map((action) => [action.operation, action.target]), [
    ["paperclip.approval.request", { issueId: "source-1", runId: "run-root" }],
  ]);
  assert.equal(incident?.actionManifest.actions[0].parameters.type, "request_board_approval");
  assert.deepEqual(incident?.actionManifest.actions[0].parameters.issueIds, ["source-1"]);
});

test("derives adapter-failed fan-out from real issue run fields and distinct retry categories", () => {
  const evidence = [
    { runId: "retry-a", issueId: "source-1", createdAt: "2026-06-12T00:00:00.000Z", status: "failed",
      errorCode: "adapter_failed", retryOfRunId: "root-1", scheduledRetryReason: "transient_failure",
      invocationSource: "automation", contextSnapshot: { issueId: "source-1", retryReason: "transient_failure", failureFingerprint: "fp-9" } },
    { runId: "retry-b", issueId: "source-1", createdAt: "2026-06-12T00:01:00.000Z", status: "failed",
      errorCode: "adapter_failed", retryOfRunId: "root-1", scheduledRetryReason: "max_turns_continuation",
      invocationSource: "automation", contextSnapshot: { issueId: "source-1", cause: "adapter_failed", failureFingerprint: "fp-9" } },
    { runId: "retry-c", issueId: "source-2", createdAt: "2026-06-12T00:02:00.000Z", status: "failed",
      errorCode: "adapter_failed", retryOfRunId: "root-2", scheduledRetryReason: "transient_failure",
      invocationSource: "automation", contextSnapshot: { issueId: "source-2", retryReason: "transient_failure" } },
    { runId: "retry-d", issueId: "source-2", createdAt: "2026-06-12T00:03:00.000Z", status: "failed",
      errorCode: "adapter_failed", retryOfRunId: "root-2", scheduledRetryReason: "transient_failure",
      invocationSource: "automation", contextSnapshot: { issueId: "source-2", retryReason: "transient_failure" } },
    { runId: "not-adapter", issueId: "source-1", createdAt: "2026-06-12T00:04:00.000Z", status: "failed",
      errorCode: "process_lost", retryOfRunId: "root-1", scheduledRetryReason: "transient_failure", invocationSource: "automation" },
  ];
  const report = analyzeEvidence(input(evidence, {
    issues: evidence.map((item) => ({ id: item.issueId, key: item.issueId, status: "in_progress", evidence: [item] })),
  }));
  assert.equal(report.incidents.filter((item) => item.problemKey === "recovery_loop").length, 1);
  const incident = report.incidents.find((item) => item.problemKey === "recovery_loop");
  assert.equal(incident?.rootRunId, "root-1");
  assert.deepEqual(incident?.runIds, ["retry-a", "retry-b"]);
  assert.deepEqual(incident?.retryCategories, ["automation:max_turns_continuation", "automation:transient_failure"]);
  assert.equal(Object.hasOwn(incident, "recoveryLaneId"), false);
  assert.equal(Object.hasOwn(incident, "adapterFailureCode"), false);
  assert.equal(Object.hasOwn(incident, "adapterFailureSignature"), false);
  const approval = incident?.actionManifest.actions.find((action) => action.operation === "paperclip.approval.request");
  assert.deepEqual(approval?.parameters, {
    type: "request_board_approval",
    payload: {
      idempotencyKey: approval.idempotencyKey,
      title: "Cancel duplicate adapter-failure run retry-a",
      reason: "Contain adapter_failed retry fan-out; run cancellation is Board-only.",
      recommendedBoardAction: {
        method: "POST", path: "/api/heartbeat-runs/retry-a/cancel", body: {},
        preconditions: { method: "GET", path: "/api/heartbeat-runs/retry-a", companyId: "company-1", status: ["queued", "running", "scheduled_retry"] },
      },
    },
    issueIds: ["source-1"],
  });
  assert.deepEqual(approval?.preflight, {
    method: "GET", path: "/api/companies/company-1/approvals",
    absentPayloadIdempotencyKey: approval.idempotencyKey,
  });
  assert.equal(incident?.actionManifest.actions.some((action) => action.operation === "paperclip.run.cancel"), false,
    "CEO manifests must not claim authority to execute Board-only cancellation");
});

test("keeps containment incidents outside the top-three improvement cap and maps composite controls", () => {
  const evidence = [
    event("sync-1", "eval-1", "2026-06-10T00:00:00.000Z", "github_sync_churn", "sync-run", { mappingId: "mapping-1", remoteFingerprint: "remote-1" }),
    event("live-1", "eval-1", "2026-06-10T00:01:00.000Z", "liveness_escalation", "live-1", { incidentKey: "inc-1", sourceIssueId: "source-1", existingEvaluationIssueId: "eval-1" }),
    event("live-2", "eval-2", "2026-06-10T00:02:00.000Z", "liveness_escalation", "live-2", { incidentKey: "inc-1", sourceIssueId: "source-1", existingEvaluationIssueId: "eval-1" }),
    event("h1", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch"), event("h2", "i1", "2026-06-11T00:01:00.000Z", "handoff_mismatch"), event("h3", "i2", "2026-06-11T00:02:00.000Z", "handoff_mismatch"),
    event("f1", "i1", "2026-06-12T00:00:00.000Z", "failed", "r1"), event("f2", "i1", "2026-06-12T00:01:00.000Z", "blocked", "r2"), event("f3", "i1", "2026-06-12T00:02:00.000Z", "changes_requested", "r2"),
    event("critical", "i2", "2026-06-13T00:00:00.000Z", "data_loss_risk"),
  ];
  const report = analyzeEvidence(input(evidence, {
    issues: [...new Set(evidence.map((item) => item.issueId))].map((id) => ({ id, key: id, status: "todo", evidence: evidence.filter((item) => item.issueId === id) })),
  }));
  assert.equal(report.candidates.length, 3);
  assert.ok(report.incidents.some((item) => item.problemKey === "liveness_escalation"));
  const composite = report.incidents.find((item) => item.problemKey === "github_sync_liveness_escalation");
  assert.equal(composite?.mappingId, "mapping-1");
  const mappingApproval = composite?.actionManifest.actions.find((action) => action.operation === "paperclip.approval.request");
  assert.deepEqual(mappingApproval?.parameters, {
    type: "request_board_approval",
    payload: {
      idempotencyKey: mappingApproval.idempotencyKey,
      title: "Remove GitHub Sync mapping mapping-1",
      reason: "Composite sync/liveness containment; mapping removal requires Board approval.",
      recommendedBoardAction: { operation: "github_sync.mapping.remove", mappingId: "mapping-1" },
    },
    issueIds: ["source-1"],
  });
  assert.deepEqual(mappingApproval?.preflight, {
    method: "GET",
    path: "/api/companies/company-1/approvals",
    absentPayloadIdempotencyKey: mappingApproval.idempotencyKey,
  });
  assert.ok(composite?.actionManifest.actions.every((action) => action.operation !== "github_sync.mapping.pause"));
});

test("uses incident-specific decision fingerprints and fails closed on malformed control operands", () => {
  const make = (incidentKey, issueId) => [
    event(`${incidentKey}-1`, issueId, "2026-06-10T00:00:00.000Z", "liveness_escalation", "r1", { incidentKey, sourceIssueId: `source-${incidentKey}`, existingEvaluationIssueId: issueId }),
    event(`${incidentKey}-2`, `${issueId}-duplicate`, "2026-06-10T00:01:00.000Z", "liveness_escalation", "r2", { incidentKey, sourceIssueId: `source-${incidentKey}`, existingEvaluationIssueId: issueId }),
  ];
  const firstEvents = make("inc-a", "eval-a");
  const first = analyzeEvidence(input(firstEvents, { issues: firstEvents.map((item) => ({ id: item.issueId, key: item.issueId, evidence: [item] })) }));
  const prior = [{ fingerprint: first.incidents[0].fingerprint, status: "open", at: "2026-06-11T00:00:00.000Z" }];
  const secondEvents = make("inc-b", "eval-b");
  const second = analyzeEvidence(input(secondEvents, { priorDecisions: prior, issues: secondEvents.map((item) => ({ id: item.issueId, key: item.issueId, evidence: [item] })) }));
  assert.equal(second.incidents.length, 1, "a decision for incident A must not suppress incident B");

  const malformed = make(`bad-${"x".repeat(200)}`, "eval-z");
  const blocked = analyzeEvidence(input(malformed, { issues: malformed.map((item) => ({ id: item.issueId, key: item.issueId, evidence: [item] })) }));
  assert.equal(blocked.outcome, "blocked_incomplete_evidence");
  assert.match(blocked.coverage.missing.join(" "), /invalid_control_operands/);
});

test("fails closed on conflicting incident identity and unbounded operational run IDs", () => {
  const conflicting = [
    event("a", "eval-a", "2026-06-10T00:00:00.000Z", "liveness_escalation", "run-a", { incidentKey: "same", sourceIssueId: "source-a", existingEvaluationIssueId: "eval-a" }),
    event("b", "eval-b", "2026-06-10T00:01:00.000Z", "liveness_escalation", "run-b", { incidentKey: "same", sourceIssueId: "source-b", existingEvaluationIssueId: "eval-a" }),
  ];
  const conflictReport = analyzeEvidence(input(conflicting, {
    issues: conflicting.map((item) => ({ id: item.issueId, key: item.issueId, evidence: [item] })),
  }));
  assert.equal(conflictReport.outcome, "blocked_incomplete_evidence");
  assert.match(conflictReport.coverage.missing.join(" "), /conflicting_incident_identity/);

  const hugeRun = "run-" + "x".repeat(200);
  const invalid = event("bad-run", "eval-a", "2026-06-10T00:00:00.000Z", "stale_recovery_recursion", hugeRun, {
    sourceIssueId: "source-a", existingEvaluationIssueId: "eval-a",
  });
  const invalidReport = analyzeEvidence(input([invalid], { issues: [{ id: "eval-a", key: "eval-a", evidence: [invalid] }] }));
  assert.equal(invalidReport.outcome, "blocked_incomplete_evidence");
  assert.match(invalidReport.coverage.missing.join(" "), /invalid_control_operands/);
});

test("classifies real Paperclip issue.updated activity for GitHub plugin-operation issues", () => {
  const evidence = [
    { id: "a1", issueId: "i1", createdAt: "2026-06-10T00:00:00.000Z", action: "issue.updated", details: { status: "todo", reopened: true, reopenedFrom: "done", _previous: { status: "done" } } },
    { id: "a2", issueId: "i2", createdAt: "2026-06-11T00:00:00.000Z", action: "issue.updated", details: { status: "in_progress", _previous: { status: "in_review" } } },
    { id: "a3", issueId: "i2", createdAt: "2026-06-12T00:00:00.000Z", action: "issue.updated", details: { status: "todo", reopened: true, reopenedFrom: "done" } },
    { id: "a4", issueId: "i1", createdAt: "2026-06-13T00:00:00.000Z", content: "recovery continuation resume" },
  ];
  const testInput = input(evidence);
  testInput.issues = testInput.issues.map((issue) => ({
    ...issue,
    originKind: "plugin:paperclip-github-plugin",
    surfaceVisibility: "plugin_operation",
  }));
  const report = analyzeEvidence(testInput);

  assert.equal(report.inventory.eventCount, 4);
  assert.equal(report.incidents.some((incident) => incident.problemKey === "github_sync_churn"), false, "classification alone must not invent missing mapping operands");
});

test("classifies structured GitHub Sync regressions on ordinary manual issues", () => {
  const evidence = [
    { id: "a1", issueId: "i1", createdAt: "2026-06-10T00:00:00.000Z", action: "issue.updated", details: { pluginKey: "paperclip-github-plugin", status: "in_review", _previous: { status: "done" } } },
    { id: "a2", issueId: "i2", createdAt: "2026-06-11T00:00:00.000Z", action: "issue.updated", details: { sourcePluginId: "paperclip-github-plugin", status: "todo", reopened: true, reopenedFrom: "done" } },
    { id: "a3", issueId: "i2", createdAt: "2026-06-12T00:00:00.000Z", action: "issue.updated", contextSource: "github-sync.status-transition", details: { status: "in_progress", _previous: { status: "in_review" } } },
    { id: "forward", issueId: "i1", createdAt: "2026-06-13T00:00:00.000Z", action: "issue.updated", details: { pluginKey: "paperclip-github-plugin", status: "in_review", _previous: { status: "todo" } } },
  ];
  const testInput = input(evidence);
  testInput.issues = testInput.issues.map((issue) => ({ ...issue, originKind: "manual" }));
  const report = analyzeEvidence(testInput);

  assert.equal(report.inventory.eventCount, 3);
  assert.equal(report.incidents.some((incident) => incident.problemKey === "github_sync_churn"), false);
});

test("requires exact GitHub Sync provenance namespaces", () => {
  const testInput = input([
    {
      id: "unrelated-plugin",
      issueId: "i1",
      createdAt: "2026-06-10T12:00:00.000Z",
      action: "issue.updated",
      details: { pluginKey: "not-github", status: "in_review", _previous: { status: "done" } },
    },
    {
      id: "unrelated-escalation",
      issueId: "i1",
      createdAt: "2026-06-10T12:05:00.000Z",
      action: "issue.harness_liveness_escalation_created",
    },
    {
      id: "unrelated-context",
      issueId: "i2",
      createdAt: "2026-06-10T13:00:00.000Z",
      action: "issue.updated",
      contextSource: "github-actions-unrelated",
      details: { status: "in_review", _previous: { status: "done" } },
    },
    {
      id: "unrelated-context-escalation",
      issueId: "i2",
      createdAt: "2026-06-10T13:05:00.000Z",
      action: "issue.harness_liveness_escalation_created",
    },
    {
      id: "caller-labelled-churn",
      issueId: "i2",
      createdAt: "2026-06-10T14:00:00.000Z",
      action: "issue.updated",
      reasonCode: "github_sync_churn",
      details: { pluginKey: "unrelated-plugin", status: "in_review", _previous: { status: "done" } },
    },
    {
      id: "caller-labelled-escalation",
      issueId: "i2",
      createdAt: "2026-06-10T14:05:00.000Z",
      action: "issue.harness_liveness_escalation_created",
    },
  ]);
  testInput.issues = testInput.issues.map((issue) => ({ ...issue, originKind: "manual" }));

  const report = analyzeEvidence(testInput);

  assert.equal(report.candidates.some((candidate) => candidate.problemKey === "github_sync_churn"), false);
  assert.equal(report.candidates.some((candidate) => candidate.problemKey === "github_sync_liveness_escalation"), false);
});

test("promotes a GitHub Sync regression followed by a harness liveness escalation as one critical incident", () => {
  const testInput = input([
    {
      id: "sync-regression",
      issueId: "i1",
      createdAt: "2026-06-10T12:25:09.537Z",
      action: "issue.updated",
      details: {
        pluginKey: "paperclip-github-plugin",
        mappingId: "mapping-1",
        remoteFingerprint: "remote-1",
        status: "in_review",
        _previous: { status: "done" },
      },
    },
    {
      id: "liveness-escalation",
      issueId: "i1",
      createdAt: "2026-06-10T12:28:51.189Z",
      action: "issue.harness_liveness_escalation_created",
      details: { reason: "in_review_without_action_path", incidentKey: "inc-1", sourceIssueId: "source-1", existingEvaluationIssueId: "i1" },
    },
    {
      id: "stale-sync-regression",
      issueId: "i2",
      createdAt: "2026-06-09T10:00:00.000Z",
      action: "issue.updated",
      details: { pluginKey: "paperclip-github-plugin", status: "in_review", _previous: { status: "done" } },
    },
    {
      id: "uncorrelated-escalation",
      issueId: "i2",
      createdAt: "2026-06-10T12:28:51.189Z",
      action: "issue.harness_liveness_escalation_created",
      details: { reason: "in_review_without_action_path" },
    },
    {
      id: "later-sync-regression",
      issueId: "i2",
      createdAt: "2026-06-10T13:00:00.000Z",
      action: "issue.updated",
      details: { contextSource: "github-sync.status-transition", status: "in_review", _previous: { status: "done" } },
    },
    {
      id: "earlier-escalation",
      issueId: "i2",
      createdAt: "2026-06-10T12:00:00.000Z",
      action: "issue.harness_liveness_escalation_created",
      details: { reason: "in_review_without_action_path" },
    },
  ]);
  testInput.issues = testInput.issues.map((issue) => ({ ...issue, originKind: "manual" }));
  const report = analyzeEvidence(testInput);
  const candidate = report.incidents.find((item) => item.problemKey === "github_sync_liveness_escalation");

  assert.equal(candidate?.threshold, "critical_one_off");
  assert.equal(candidate?.severity, 4);
  assert.equal(candidate?.sourceIssueId, "source-1");
  assert.equal(candidate?.eventCount, 2);
  assert.equal(candidate?.mappingId, "mapping-1");
});

test("does not correlate equal-timestamp churn and escalation events", () => {
  const at = "2026-06-10T12:00:00.000Z";
  const report = analyzeEvidence(input([
    event("z-churn", "i1", at, "github_sync_churn"),
    event("a-escalation", "i1", at, "liveness_escalation"),
  ]));

  assert.equal(report.candidates.some((candidate) => candidate.problemKey === "github_sync_liveness_escalation"), false);
});

test("correlates large composite evidence sets in bounded near-linear time", { timeout: 2_000 }, () => {
  const baseMs = Date.parse("2026-06-10T12:00:00.000Z");
  const evidence = [];
  for (let index = 0; index < 5_000; index += 1) {
    evidence.push(event(`churn-${index}`, "i1", new Date(baseMs + index).toISOString(), "github_sync_churn", null, { mappingId: "mapping-stress", remoteFingerprint: "remote-stress" }));
  }
  for (let index = 0; index < 5_000; index += 1) {
    evidence.push(event(`escalation-${index}`, "i1", new Date(baseMs + 10_000 + index).toISOString(), "liveness_escalation", null, { incidentKey: "incident-stress", sourceIssueId: "source-stress", existingEvaluationIssueId: "i1" }));
  }

  const startedAt = performance.now();
  const report = analyzeEvidence(input(evidence));
  const elapsedMs = performance.now() - startedAt;
  const candidate = report.incidents.find((item) => item.problemKey === "github_sync_liveness_escalation");

  assert.equal(candidate?.eventCount, 10_000);
  assert.ok(elapsedMs < 2_000, `expected near-linear correlation, took ${elapsedMs.toFixed(0)}ms`);
});

test("requires a fresh correlated sync-regression and liveness-escalation pair after a terminal decision", () => {
  const evidence = [
    event("old-sync-regression", "i1", "2026-06-10T12:00:00.000Z", "github_sync_churn", null, { mappingId: "mapping-1", remoteFingerprint: "remote-1" }),
    event("old-liveness-escalation", "i1", "2026-06-10T12:05:00.000Z", "liveness_escalation", null, { incidentKey: "incident-1", sourceIssueId: "source-1", existingEvaluationIssueId: "i1" }),
    event("new-liveness-escalation-only", "i1", "2026-06-10T12:15:00.000Z", "liveness_escalation", null, { incidentKey: "incident-1", sourceIssueId: "source-1", existingEvaluationIssueId: "i1" }),
  ];
  const baseline = analyzeEvidence(input(evidence));
  const fingerprint = baseline.incidents.find((item) => item.problemKey === "github_sync_liveness_escalation").fingerprint;
  const report = analyzeEvidence(input(evidence, {
    priorDecisions: [{ fingerprint, status: "implemented", at: "2026-06-10T12:10:00.000Z" }],
  }));

  assert.equal(report.incidents.some((item) => item.problemKey === "github_sync_liveness_escalation"), false);
});

test("uses maximum event time for composite incident recency regardless of issue ordering", () => {
  const raw = [
    ["new-sync", "i1", "2026-06-20T12:00:00.000Z", "issue.updated", { pluginKey: "paperclip-github-plugin", mappingId: "mapping-new", remoteFingerprint: "remote-new", status: "in_review", _previous: { status: "done" } }],
    ["new-escalation", "i1", "2026-06-20T12:05:00.000Z", "issue.harness_liveness_escalation_created", { reason: "in_review_without_action_path", incidentKey: "incident-new", sourceIssueId: "source-new", existingEvaluationIssueId: "i1" }],
    ["old-sync", "i2", "2026-06-10T12:00:00.000Z", "issue.updated", { pluginKey: "paperclip-github-plugin", mappingId: "mapping-old", remoteFingerprint: "remote-old", status: "in_review", _previous: { status: "done" } }],
    ["old-escalation", "i2", "2026-06-10T12:05:00.000Z", "issue.harness_liveness_escalation_created", { reason: "in_review_without_action_path", incidentKey: "incident-old", sourceIssueId: "source-old", existingEvaluationIssueId: "i2" }],
  ].map(([id, issueId, createdAt, action, details]) => ({ id, issueId, createdAt, action, details }));
  const report = analyzeEvidence(input(raw));
  const candidate = report.incidents.find((item) => item.problemKey === "github_sync_liveness_escalation");

  assert.equal(candidate?.lastAt, "2026-06-20T12:05:00.000Z");
  assert.equal(candidate?.eventCount, 2);
});

test("same-time prior decisions and bounded references remain deterministic and compact", () => {
  const issues = Array.from({ length: 20 }, (_, issueIndex) => ({
    id: `issue-${String(issueIndex).padStart(2, "0")}`,
    key: `MIC-${issueIndex + 1}`,
    status: "done",
    evidence: Array.from({ length: 20 }, (_, eventIndex) => event(
      `event-${String(issueIndex).padStart(2, "0")}-${String(eventIndex).padStart(2, "0")}`,
      `issue-${String(issueIndex).padStart(2, "0")}`,
      `2026-06-${String((eventIndex % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      "handoff_mismatch"
    )),
  }));
  const baseline = analyzeEvidence(input([], { issues }));
  const fingerprint = baseline.candidates[0].fingerprint;
  const decisions = [
    { fingerprint, status: "implemented", at: "2026-06-30T00:00:00.000Z" },
    { fingerprint, status: "open", at: "2026-06-30T00:00:00.000Z" },
  ];
  const first = analyzeEvidence(input([], { issues, priorDecisions: decisions }));
  const second = analyzeEvidence(input([], { issues: [...issues].reverse(), priorDecisions: [...decisions].reverse() }));

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.candidates.length, 0);
  assert.equal(first.rejected[0].reasonCode, "duplicate_active");
  assert.equal(first.rejected[0].issues.length, 5);
  assert.ok(first.rejected[0].issues.every((issue) => issue.eventIds.length <= 8));
  assert.ok(Buffer.byteLength(JSON.stringify(first)) < 8_000);
});

test("unbounded secret-bearing identifiers fail closed or become bounded opaque references", () => {
  const secret = `ghp_${"x".repeat(200_000)}`;
  const report = analyzeEvidence(input([
    event(secret, "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch"),
    event(`${secret}-2`, "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch"),
    event(`${secret}-3`, "i2", "2026-06-12T00:00:00.000Z", "handoff_mismatch"),
  ], {
    companyId: secret,
    issues: [
      { id: "i1", key: secret, evidence: [
        event(secret, "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch"),
        event(`${secret}-2`, "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch"),
      ] },
      { id: "i2", key: `${secret}-key`, evidence: [event(`${secret}-3`, "i2", "2026-06-12T00:00:00.000Z", "handoff_mismatch")] },
    ],
  }));
  const serialized = JSON.stringify(report);
  assert.ok(Buffer.byteLength(serialized) <= 32_000);
  assert.doesNotMatch(serialized, /ghp_/);
});

test("malformed prior decisions cannot suppress a qualifying candidate", () => {
  const fields = { category: "workflow", problemKey: "handoff_mismatch", component: "paperclip", targetSurface: "company_package" };
  const fingerprint = fingerprintFor(fields);
  const report = analyzeEvidence(input([
    event("e1", "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch"),
    event("e2", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch"),
    event("e3", "i2", "2026-06-12T00:00:00.000Z", "handoff_mismatch"),
  ], { priorDecisions: [{ fingerprint, status: "open" }] }));
  assert.match(report.candidates[0]?.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(report.candidates[0]?.fingerprint, fingerprint, "category-only fingerprint must not identify an incident");
  assert.equal(report.candidates[0]?.dedupe, "new");
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

test("deduplicates prior active decisions by incident-specific fingerprint", () => {
  const evidence = [
    event("e1", "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch"),
    event("e2", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch"),
    event("e3", "i2", "2026-06-12T00:00:00.000Z", "handoff_mismatch"),
  ];
  const fingerprint = analyzeEvidence(input(evidence)).candidates[0].fingerprint;
  const report = analyzeEvidence(input(evidence, {
    priorDecisions: [{ fingerprint, status: "open", at: "2026-06-13T00:00:00.000Z" }],
  }));

  assert.equal(report.outcome, "no_change");
  assert.equal(report.candidates.length, 0);
  assert.equal(report.rejected[0].reasonCode, "duplicate_active");
});

test("requires a fresh post-decision threshold after implemented or rejected outcomes", () => {
  const historical = [
    event("old-1", "i1", "2026-06-10T00:00:00.000Z", "handoff_mismatch"),
    event("old-2", "i1", "2026-06-11T00:00:00.000Z", "handoff_mismatch"),
    event("old-3", "i2", "2026-06-12T00:00:00.000Z", "handoff_mismatch"),
  ];
  const priorDecisions = [{
    fingerprint: analyzeEvidence(input(historical)).candidates[0].fingerprint,
    status: "implemented",
    at: "2026-06-15T00:00:00.000Z",
  }];
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
  assert.equal(Object.hasOwn(report, "issues"), false, "Compact output must not return the full normalized issue inventory.");
  assert.equal(report.inventory.issueCount, 2);
  assert.ok(Buffer.byteLength(serialized) < 8_000, "The deterministic report should remain compact.");
});

test("collector records issue-by-issue and canonical-agent coverage and fails closed when a resource read fails", async () => {
  const responses = new Map([
    ["/api/companies/company-1/issues?includePluginOperations=true&limit=1000&offset=0", [{ id: "i1", identifier: "MIC-1", status: "done" }]],
    ["/api/companies/company-1/activity?entityType=heartbeat_run&limit=500", []],
    ["/api/companies/company-1/agents", [
      { id: "a1", name: "Agent One", role: "engineer" },
      { id: "a2", name: "Agent Two", role: "qa" },
    ]],
  ]);
  for (const resource of ["comments", "documents", "runs", "activity", "cost-summary", "approvals", "interactions", "recovery-actions", "work-products"]) {
    responses.set(`/api/issues/i1/${resource}`, []);
  }
  responses.set("/api/issues/i1/runs", [{
    id: "run-1",
    issueId: "i1",
    agentId: "a1",
    status: "failed",
    createdAt: "2026-06-10T00:00:00.000Z",
  }]);
  responses.delete("/api/issues/i1/comments");
  const fetchOptions = [];

  const fetchImpl = async (url, options) => {
    fetchOptions.push(options);
    const pathname = new URL(url).pathname + new URL(url).search;
    if (!responses.has(pathname)) return new Response("missing", { status: 503 });
    return Response.json(responses.get(pathname));
  };
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "test-key",
    companyId: "company-1",
    asOf: AS_OF,
    fetchImpl,
  });

  assert.equal(report.outcome, "blocked_incomplete_evidence");
  assert.deepEqual(report.coverage.missing, ["issue:i1:comments"]);
  assert.equal(report.inventory.agentCount, 2);
  assert.equal(report.inventory.agentsWithEvidenceCount, 1);
  assert.equal(report.inventory.agentsWithoutEvidenceCount, 1);
  assert.match(report.inventory.agentInventoryFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.ok(fetchOptions.every((options) => options.redirect === "error"));
  assert.equal(JSON.stringify(report).includes("secret-token"), false);
});

test("collector exhausts the offset-paginated company issue inventory", async () => {
  const allIssues = Array.from({ length: 1001 }, (_, index) => ({
    id: `i-${String(index).padStart(4, "0")}`,
    identifier: `MIC-${index + 1}`,
    status: "done",
  }));
  let issuePageReads = 0;
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/api/companies/company-1/activity") {
      assert.equal(parsed.searchParams.get("entityType"), "heartbeat_run");
      assert.equal(parsed.searchParams.get("limit"), "500");
      return Response.json([]);
    }
    if (parsed.pathname === "/api/companies/company-1/issues") {
      assert.equal(parsed.searchParams.get("includePluginOperations"), "true");
      issuePageReads += 1;
      const limit = Number(parsed.searchParams.get("limit"));
      const offset = Number(parsed.searchParams.get("offset"));
      return Response.json(allIssues.slice(offset, offset + limit));
    }
    if (parsed.pathname === "/api/companies/company-1/agents") {
      return Response.json([{ id: "a1", name: "Agent One", role: "engineer" }]);
    }
    if (/^\/api\/issues\/i-\d{4}\/(?:comments|documents|runs|activity|cost-summary|approvals|interactions|recovery-actions|work-products)$/.test(parsed.pathname)) {
      return Response.json([]);
    }
    return new Response("missing", { status: 503 });
  };

  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "test-key",
    companyId: "company-1",
    asOf: AS_OF,
    fetchImpl,
  });

  assert.equal(report.outcome, "no_change");
  assert.equal(report.inventory.issueCount, 1001);
  assert.equal(report.coverage.resources.issues.pages, 2);
  assert.equal(report.coverage.resources.issueResources.issuesChecked, 1001);
  assert.equal(issuePageReads, 2);
});

test("containment collector reads bounded company activity and run surfaces without issue inventory", async () => {
  const paths = [];
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "fixture",
    companyId: "company-1",
    asOf: AS_OF,
    mode: "containment",
    fetchImpl: async (url) => {
      paths.push(new URL(url).pathname + new URL(url).search);
      return Response.json([]);
    },
  });

  assert.deepEqual(paths, [
    "/api/companies/company-1/activity?entityType=heartbeat_run&limit=500",
    "/api/companies/company-1/activity?entityType=issue&limit=500",
    "/api/companies/company-1/heartbeat-runs?limit=1000",
  ]);
  assert.equal(report.outcome, "no_change");
  assert.equal(report.collection.mode, "containment");
  assert.equal(report.collection.incidentsFound, 0);
  assert.deepEqual(report.telemetry.totals, { costUsd: "unknown", inputTokens: "unknown", outputTokens: "unknown" });
});

test("collector observes heartbeat-run stale recursion, dedupes activity, and reads only implicated issue runs", async () => {
  const stale = {
    id: "activity-stale", entityType: "heartbeat_run", entityId: "run-root", runId: "run-root",
    action: "heartbeat.output_stale_recovery_recursion_refused", createdAt: "2026-06-30T22:00:00.000Z",
    details: { sourceIssueId: "source-1", existingEvaluationIssueId: "eval-1" },
  };
  const paths = [];
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "test-key",
    companyId: "company-1",
    asOf: AS_OF,
    mode: "containment",
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + new URL(url).search;
      paths.push(path);
      if (path === "/api/companies/company-1/activity?entityType=heartbeat_run&limit=500") return Response.json([stale, stale]);
      if (path === "/api/companies/company-1/activity?entityType=issue&limit=500") return Response.json([]);
      if (path === "/api/companies/company-1/heartbeat-runs?limit=1000") return Response.json([]);
      return new Response("unexpected", { status: 500 });
    },
  });

  assert.deepEqual(paths, [
    "/api/companies/company-1/activity?entityType=heartbeat_run&limit=500",
    "/api/companies/company-1/activity?entityType=issue&limit=500",
    "/api/companies/company-1/heartbeat-runs?limit=1000",
  ]);
  assert.equal(report.inventory.eventCount, 1);
  assert.equal(report.collection.companyActivityReads, 2);
  assert.equal(report.collection.companyRunReads, 1);
  assert.equal(report.collection.issueRunReads, 0);
});

test("containment collector recognizes real company-run issue context and real liveness activity identities", async () => {
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "fixture",
    companyId: "company-1",
    asOf: AS_OF,
    mode: "containment",
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + new URL(url).search;
      if (path === "/api/companies/company-1/activity?entityType=heartbeat_run&limit=500") return Response.json([]);
      if (path === "/api/companies/company-1/activity?entityType=issue&limit=500") {
        return Response.json([
          { id: "act-live-a", action: "issue.harness_liveness_escalation_created", entityType: "issue",
            entityId: "eval-a", createdAt: "2026-06-30T22:01:00.000Z", runId: "live-run-a",
            details: { incidentKey: "incident-real", sourceIssueId: "source-live", escalationIssueId: "eval-a" } },
          { id: "act-live-b", action: "issue.harness_liveness_escalation_created", entityType: "issue",
            entityId: "eval-b", createdAt: "2026-06-30T22:00:00.000Z", runId: "live-run-b",
            details: { incidentKey: "incident-real", sourceIssueId: "source-live", escalationIssueId: "eval-b" } },
        ]);
      }
      if (path === "/api/companies/company-1/heartbeat-runs?limit=1000") {
        return Response.json([
          { id: "retry-a", createdAt: "2026-06-30T22:03:00.000Z", status: "failed",
            errorCode: "adapter_failed", retryOfRunId: "root-1", scheduledRetryReason: "transient_failure",
            invocationSource: "automation", contextSnapshot: { issueId: "source-run", retryReason: "transient_failure", failureFingerprint: "fp-9" } },
          { id: "retry-b", createdAt: "2026-06-30T22:02:00.000Z", status: "failed",
            errorCode: "adapter_failed", retryOfRunId: "root-1", scheduledRetryReason: "max_turns_continuation",
            invocationSource: "automation", contextSnapshot: { issueId: "source-run", cause: "adapter_failed", failureFingerprint: "fp-9" } },
        ]);
      }
      throw new Error(`Unexpected request: ${path}`);
    },
  });

  const liveness = report.incidents.find((item) => item.problemKey === "liveness_escalation");
  assert.equal(liveness?.sourceIssueId, "source-live");
  assert.equal(liveness?.canonicalIssueId, "eval-a");
  assert.deepEqual(liveness?.duplicateIssueIds, ["eval-b"]);
  const recovery = report.incidents.find((item) => item.problemKey === "recovery_loop");
  assert.equal(recovery?.sourceIssueId, "source-run");
  assert.deepEqual(recovery?.runIds, ["retry-a", "retry-b"]);
});

test("containment collector accepts an exact-cap response when its newest-first boundary covers the window", async () => {
  const windowStartMs = Date.parse("2026-06-30T18:00:00.000Z");
  const windowEndMs = Date.parse(AS_OF);
  const heartbeatActivity = Array.from({ length: 500 }, (_, index) => ({
    id: `activity-${index}`,
    entityType: "heartbeat_run",
    entityId: `run-${index}`,
    action: "heartbeat.completed",
    createdAt: new Date(windowEndMs - ((windowEndMs - windowStartMs + 1) * index) / 499).toISOString(),
  }));
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "test-key",
    companyId: "company-1",
    asOf: AS_OF,
    mode: "containment",
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + new URL(url).search;
      if (path === "/api/companies/company-1/activity?entityType=heartbeat_run&limit=500") {
        return Response.json(heartbeatActivity);
      }
      return Response.json([]);
    },
  });

  assert.equal(report.outcome, "no_change");
  assert.equal(report.coverage.complete, true);
  assert.deepEqual(report.coverage.resources.heartbeatRunActivity, {
    boundaryReached: true,
    cap: 500,
    complete: true,
    count: 500,
    newestAt: AS_OF,
    oldestAt: "2026-06-30T17:59:59.999Z",
    reads: 1,
    reason: "window_boundary_reached",
    windowStart: "2026-06-30T18:00:00.000Z",
  });
});

test("containment collector fails closed when an exact-cap response only reaches the inclusive window start", async () => {
  const windowStartMs = Date.parse("2026-06-30T18:00:00.000Z");
  const windowEndMs = Date.parse(AS_OF);
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "test-key",
    companyId: "company-1",
    asOf: AS_OF,
    mode: "containment",
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + new URL(url).search;
      if (path === "/api/companies/company-1/activity?entityType=heartbeat_run&limit=500") {
        return Response.json(Array.from({ length: 500 }, (_, index) => ({
          id: `activity-${index}`,
          entityType: "heartbeat_run",
          entityId: `run-${index}`,
          action: "heartbeat.completed",
          createdAt: new Date(windowEndMs - ((windowEndMs - windowStartMs) * index) / 499).toISOString(),
        })));
      }
      return Response.json([]);
    },
  });

  assert.equal(report.outcome, "blocked_incomplete_evidence");
  assert.equal(report.coverage.complete, false);
  assert.ok(report.coverage.missing.includes("company:heartbeat_run_activity:truncated"));
  assert.equal(report.coverage.resources.heartbeatRunActivity.reason, "window_boundary_not_reached");
});

test("containment collector fails closed on malformed cap timestamps and records newer than as-of", async () => {
  for (const variant of ["malformed", "future"]) {
    const rows = Array.from({ length: 500 }, (_, index) => ({
      id: `activity-${index}`,
      entityType: "heartbeat_run",
      entityId: `run-${index}`,
      action: "heartbeat.completed",
      createdAt: new Date(Date.parse(AS_OF) - index * 60_000).toISOString(),
    }));
    rows[variant === "malformed" ? 250 : 0].createdAt = variant === "malformed"
      ? "not-a-timestamp"
      : "2026-07-01T00:00:01.000Z";
    const report = await collectEvidence({
      baseUrl: "https://paperclip.invalid",
      apiKey: "test-key",
      companyId: "company-1",
      asOf: AS_OF,
      mode: "containment",
      fetchImpl: async (url) => {
        const path = new URL(url).pathname + new URL(url).search;
        return Response.json(path.includes("entityType=heartbeat_run") ? rows : []);
      },
    });

    assert.equal(report.outcome, "blocked_incomplete_evidence");
    assert.equal(report.coverage.resources.heartbeatRunActivity.reason,
      variant === "malformed" ? "invalid_boundary_timestamp" : "record_after_as_of");
  }
});

test("containment collector ignores invalid control operands outside the rolling window", async () => {
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "test-key",
    companyId: "company-1",
    asOf: AS_OF,
    mode: "containment",
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + new URL(url).search;
      if (path.includes("heartbeat-runs")) {
        return Response.json([{
          id: `old-${"x".repeat(200)}`,
          issueId: "source-1",
          status: "failed",
          createdAt: "2026-06-30T17:59:59.000Z",
          errorCode: "adapter_failed",
          retryOfRunId: "root-1",
          scheduledRetryReason: "transient_failure",
          invocationSource: "automation",
        }]);
      }
      return Response.json([]);
    },
  });

  assert.equal(report.outcome, "no_change");
  assert.equal(report.coverage.complete, true);
  assert.equal(report.rejected.length, 0);
});

test("containment collector fails closed on invalid in-window activity controls", async () => {
  const report = await collectEvidence({
    baseUrl: "https://paperclip.invalid",
    apiKey: "test-key",
    companyId: "company-1",
    asOf: AS_OF,
    mode: "containment",
    fetchImpl: async (url) => {
      const path = new URL(url).pathname + new URL(url).search;
      if (path.includes("entityType=heartbeat_run")) {
        return Response.json([{
          id: "invalid-control-activity",
          entityType: "heartbeat_run",
          entityId: `run-${"x".repeat(200)}`,
          action: "heartbeat.output_stale_recovery_recursion_refused",
          createdAt: "2026-06-30T22:00:00.000Z",
          details: { sourceIssueId: "source-1" },
        }]);
      }
      return Response.json([]);
    },
  });

  assert.equal(report.outcome, "blocked_incomplete_evidence");
  assert.equal(report.coverage.complete, false);
  assert.deepEqual(report.coverage.missing, ["invalid_control_operands:1"]);
  assert.equal(report.inventory.issueCount, 0);
  assert.equal(report.inventory.eventCount, 0);
});

test("terminal run usage telemetry is explicit and unavailable totals stay unknown rather than zero", () => {
  const report = analyzeEvidence(input([
    { runId: "terminal-known", issueId: "i1", status: "succeeded", createdAt: "2026-06-10T00:00:00.000Z",
      inputTokens: 120, outputTokens: 30, costUsd: 0.07 },
    { runId: "terminal-unknown", issueId: "i2", status: "failed", createdAt: "2026-06-11T00:00:00.000Z", usageJson: null },
  ]));

  assert.deepEqual(report.telemetry, {
    terminalRuns: 2,
    usageAvailableRuns: 1,
    usageUnavailableRuns: 1,
    availability: "partial",
    runs: [
      { runId: "terminal-known", status: "succeeded", usage: { inputTokens: 120, outputTokens: 30, costUsd: 0.07 } },
      { runId: "terminal-unknown", status: "failed", usage: { inputTokens: "unknown", outputTokens: "unknown", costUsd: "unknown" } },
    ],
    runsTruncated: false,
    knownRunCounts: { inputTokens: 1, outputTokens: 1, costUsd: 1 },
    knownTotals: { inputTokens: 120, outputTokens: 30, costUsd: 0.07 },
    totals: { inputTokens: "unknown", outputTokens: "unknown", costUsd: "unknown" },
  });
});

test("CEO routine is wired to the CEO-only evidence skill and keeps broad maintenance mechanics out of the prompt", async () => {
  const root = new URL("../", import.meta.url);
  const ceo = await readFile(new URL("agents/ceo/AGENTS.md", root), "utf8");
  const routine = await readFile(new URL("tasks/monthly-ceo-self-improvement/TASK.md", root), "utf8");
  const containmentRoutine = await readFile(new URL("tasks/frequent-ceo-incident-containment/TASK.md", root), "utf8");
  const skill = await readFile(new URL("skills/ceo-issue-history/SKILL.md", root), "utf8");
  const readme = await readFile(new URL("README.md", root), "utf8");

  assert.match(ceo, /ceo-issue-history/);
  assert.match(routine, /issue-history-evidence\.mjs[\s\S]{0,300}--as-of/i);
  assert.match(routine, /blocked_incomplete_evidence[\s\S]{0,300}no_change/i);
  assert.match(skill, /\[asOf-30d,asOf\)/);
  assert.match(skill, /\[asOf-6h,asOf\)/);
  assert.match(containmentRoutine, /six-hour interval/);
  assert.match(containmentRoutine, /oldest record is strictly before `asOf-6h`/);
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
