#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

function usage() {
  return `Usage:
  paperclip-workflow.mjs snapshot --issue <id> [--document <key>]...
  paperclip-workflow.mjs verify --issue <id> [--status <status>] [--participant <agent-id|none>] [--assignee <agent-id|none>] [--outcome <outcome|none>] [--document <key>]...
  paperclip-workflow.mjs approval-link --approval <id> --issue <id>
  paperclip-workflow.mjs put-document --issue <id> --key <key> --file <path> [--title <title>] [--change-summary <text>]
  paperclip-workflow.mjs transition --issue <id> --status <done|in_progress> --comment-file <path> [--expect-participant <agent-id>]

Environment: PAPERCLIP_API_URL, PAPERCLIP_API_KEY, and, for writes, PAPERCLIP_RUN_ID.
PAPERCLIP_AGENT_ID supplies transition's default expected participant.`;
}

function parseArgs(argv) {
  const command = argv.shift();
  if (!command || command === "--help" || command === "-h") return { command: "help" };
  const values = { document: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${token} requires a value.`);
    if (key === "document") values.document.push(value);
    else values[key.replaceAll("-", "_")] = value;
    index += 1;
  }
  return { command, ...values };
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function config({ write = false } = {}) {
  const baseUrl = required(process.env.PAPERCLIP_API_URL, "PAPERCLIP_API_URL");
  const apiKey = required(process.env.PAPERCLIP_API_KEY, "PAPERCLIP_API_KEY");
  const origin = new URL(baseUrl);
  if (!["http:", "https:"].includes(origin.protocol)) throw new Error("PAPERCLIP_API_URL must use HTTP or HTTPS.");
  return {
    origin,
    apiKey,
    runId: write ? required(process.env.PAPERCLIP_RUN_ID, "PAPERCLIP_RUN_ID for writes") : process.env.PAPERCLIP_RUN_ID,
  };
}

async function request(client, pathname, { method = "GET", body, allow404 = false } = {}) {
  const target = new URL(pathname.replace(/^\//, ""), `${client.origin.href.replace(/\/$/, "")}/`);
  if (target.origin !== client.origin.origin) throw new Error("Refusing to send Paperclip credentials across origins.");
  const headers = { Authorization: `Bearer ${client.apiKey}`, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (client.runId) headers["X-Paperclip-Run-Id"] = client.runId;
  const response = await fetch(target, {
    method,
    redirect: "error",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (allow404 && response.status === 404) return null;
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 500) }; }
  }
  if (!response.ok) {
    const detail = payload?.error ?? payload?.message ?? `HTTP ${response.status}`;
    throw new Error(`${method} ${target.pathname} failed: ${response.status} ${detail}`);
  }
  return payload;
}

function participantId(issue) {
  const participant = issue?.executionState?.currentParticipant;
  return participant?.type === "agent" ? participant.agentId ?? null : null;
}

async function snapshot(client, issueId, documents = []) {
  const [issue, heartbeatContext, listedDocuments] = await Promise.all([
    request(client, `/api/issues/${encodeURIComponent(issueId)}`),
    request(client, `/api/issues/${encodeURIComponent(issueId)}/heartbeat-context`),
    request(client, `/api/issues/${encodeURIComponent(issueId)}/documents`),
  ]);
  const selected = {};
  await Promise.all(documents.map(async (key) => {
    selected[key] = await request(
      client,
      `/api/issues/${encodeURIComponent(issueId)}/documents/${encodeURIComponent(key)}`,
      { allow404: true },
    );
  }));
  return {
    schemaVersion: 1,
    issue: {
      id: issue.id,
      identifier: issue.identifier ?? null,
      status: issue.status,
      assigneeAgentId: issue.assigneeAgentId ?? null,
      executionState: issue.executionState ?? null,
      checkoutRunId: issue.checkoutRunId ?? null,
      executionRunId: issue.executionRunId ?? null,
    },
    heartbeatContext,
    documents: listedDocuments,
    selectedDocuments: selected,
  };
}

function expectedValue(value) {
  return value === "none" ? null : value;
}

function assertSnapshot(report, args) {
  const mismatches = [];
  const checks = [
    ["status", args.status, report.issue.status],
    ["participant", args.participant, participantId(report.issue)],
    ["assignee", args.assignee, report.issue.assigneeAgentId],
    ["outcome", args.outcome, report.issue.executionState?.lastDecisionOutcome ?? null],
  ];
  for (const [field, expected, actual] of checks) {
    if (expected !== undefined && expectedValue(expected) !== actual) mismatches.push({ field, expected: expectedValue(expected), actual });
  }
  for (const key of args.document ?? []) {
    if (!report.selectedDocuments[key]) mismatches.push({ field: `document:${key}`, expected: "present", actual: "missing" });
  }
  return mismatches;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help") {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (args.command === "snapshot" || args.command === "verify") {
    const issueId = required(args.issue, "--issue");
    const report = await snapshot(config(), issueId, args.document);
    if (args.command === "verify") {
      const mismatches = assertSnapshot(report, args);
      const result = { ...report, verification: { passed: mismatches.length === 0, mismatches } };
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (mismatches.length > 0) process.exitCode = 2;
    } else {
      process.stdout.write(`${JSON.stringify(report)}\n`);
    }
    return;
  }

  if (args.command === "approval-link") {
    const approvalId = required(args.approval, "--approval");
    const issueId = required(args.issue, "--issue");
    const issues = await request(config(), `/api/approvals/${encodeURIComponent(approvalId)}/issues`);
    const linked = Array.isArray(issues) && issues.some((issue) => issue.id === issueId);
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, approvalId, issueId, linked, issueIds: Array.isArray(issues) ? issues.map((issue) => issue.id) : [] })}\n`);
    if (!linked) process.exitCode = 2;
    return;
  }

  if (args.command === "put-document") {
    const issueId = required(args.issue, "--issue");
    const key = required(args.key, "--key");
    const file = required(args.file, "--file");
    const client = config({ write: true });
    const body = await readFile(file, "utf8");
    const existing = await request(client, `/api/issues/${encodeURIComponent(issueId)}/documents/${encodeURIComponent(key)}`, { allow404: true });
    const payload = {
      title: args.title ?? existing?.title ?? null,
      format: "markdown",
      body,
      changeSummary: args.change_summary ?? null,
      baseRevisionId: existing?.latestRevisionId ?? null,
    };
    const written = await request(client, `/api/issues/${encodeURIComponent(issueId)}/documents/${encodeURIComponent(key)}`, { method: "PUT", body: payload });
    const verified = await request(client, `/api/issues/${encodeURIComponent(issueId)}/documents/${encodeURIComponent(key)}`);
    if (verified.body !== body) throw new Error("Document read-back body did not match the input file.");
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, issueId, key, documentId: verified.id, revisionId: verified.latestRevisionId, created: existing === null, verified: true, response: written })}\n`);
    return;
  }

  if (args.command === "transition") {
    const issueId = required(args.issue, "--issue");
    const status = required(args.status, "--status");
    if (!["done", "in_progress"].includes(status)) throw new Error("--status must be done or in_progress.");
    const comment = await readFile(required(args.comment_file, "--comment-file"), "utf8");
    if (!comment.trim()) throw new Error("--comment-file must not be empty.");
    const expectedParticipant = args.expect_participant ?? required(process.env.PAPERCLIP_AGENT_ID, "--expect-participant or PAPERCLIP_AGENT_ID");
    const client = config({ write: true });
    const before = await request(client, `/api/issues/${encodeURIComponent(issueId)}`);
    const actualParticipant = participantId(before);
    if (actualParticipant !== expectedParticipant) {
      process.stdout.write(`${JSON.stringify({ schemaVersion: 1, transitioned: false, mismatch: { field: "participant", expected: expectedParticipant, actual: actualParticipant } })}\n`);
      process.exitCode = 2;
      return;
    }
    await request(client, `/api/issues/${encodeURIComponent(issueId)}`, { method: "PATCH", body: { status, comment } });
    const after = await request(client, `/api/issues/${encodeURIComponent(issueId)}`);
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, transitioned: true, before: { status: before.status, participant: actualParticipant }, after: { status: after.status, participant: participantId(after), assigneeAgentId: after.assigneeAgentId ?? null, lastDecisionOutcome: after.executionState?.lastDecisionOutcome ?? null } })}\n`);
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

try {
  await main();
} catch (error) {
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, error: error.message })}\n`);
  process.exitCode = 1;
}
