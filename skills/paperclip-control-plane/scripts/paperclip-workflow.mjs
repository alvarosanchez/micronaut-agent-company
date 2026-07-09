#!/usr/bin/env node

import process from "node:process";

const COMMAND_OPTIONS = {
  snapshot: { singleton: new Set(["issue"]), repeated: new Set(["document"]) },
  verify: { singleton: new Set(["issue", "status", "participant", "assignee", "outcome"]), repeated: new Set(["document"]) },
  "approval-link": { singleton: new Set(["approval", "issue"]), repeated: new Set() },
};

function usage() {
  return `Usage:
  paperclip-workflow.mjs snapshot --issue <id> [--document <key>]...
  paperclip-workflow.mjs verify --issue <id> [--status <status>] [--participant <agent-id|none>] [--assignee <agent-id|none>] [--outcome <outcome|none>] [--document <key>]...
  paperclip-workflow.mjs approval-link --approval <id> --issue <id>

Environment: PAPERCLIP_API_URL and PAPERCLIP_API_KEY.`;
}

function parseArgs(argv) {
  const command = argv.shift();
  if (!command || command === "--help" || command === "-h") return { command: "help" };
  const schema = COMMAND_OPTIONS[command];
  if (!schema) throw new Error(`Unknown command: ${command}`);
  const values = { document: [] };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (!schema.singleton.has(key) && !schema.repeated.has(key)) throw new Error(`Unknown option --${key} for ${command}.`);
    if (schema.singleton.has(key) && seen.has(key)) throw new Error(`Duplicate option --${key}.`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${token} requires a value.`);
    if (schema.repeated.has(key)) values[key].push(value);
    else values[key] = value;
    seen.add(key);
    index += 1;
  }
  return { command, ...values };
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function config() {
  const baseUrl = required(process.env.PAPERCLIP_API_URL, "PAPERCLIP_API_URL");
  const apiKey = required(process.env.PAPERCLIP_API_KEY, "PAPERCLIP_API_KEY");
  const configured = new URL(baseUrl);
  if (!["http:", "https:"].includes(configured.protocol)) throw new Error("PAPERCLIP_API_URL must use HTTP or HTTPS.");
  if (configured.username || configured.password || configured.search || configured.hash) {
    throw new Error("PAPERCLIP_API_URL must not contain credentials, query parameters, or a fragment.");
  }
  if (configured.pathname !== "/") throw new Error("PAPERCLIP_API_URL must be an origin without a path.");
  const loopback = ["127.0.0.1", "[::1]", "localhost"].includes(configured.hostname);
  if (configured.protocol === "http:" && !loopback) throw new Error("PAPERCLIP_API_URL requires HTTPS outside loopback.");
  const origin = new URL(configured.origin);
  return {
    origin,
    apiKey,
  };
}

async function request(client, pathname, { method = "GET", body, allow404 = false } = {}) {
  const target = new URL(pathname.replace(/^\//, ""), `${client.origin.href.replace(/\/$/, "")}/`);
  if (target.origin !== client.origin.origin) throw new Error("Refusing to send Paperclip credentials across origins.");
  const headers = { Authorization: `Bearer ${client.apiKey}`, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

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

  throw new Error(`Unknown command: ${args.command}`);
}

try {
  await main();
} catch (error) {
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, error: error.message })}\n`);
  process.exitCode = 1;
}
