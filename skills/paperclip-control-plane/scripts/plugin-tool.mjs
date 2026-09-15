#!/usr/bin/env node
// Deterministic Paperclip tool-gateway client for agent runs.
// Builds the exact `POST /api/plugins/tools/execute` body the host expects
// ({ tool, parameters, runContext: { agentId, runId, companyId, projectId } })
// from the run environment, so no run has to rediscover the payload shape.

import process from "node:process";
import { readFileSync } from "node:fs";

function usage() {
  return `Usage:
  plugin-tool.mjs list
  plugin-tool.mjs call <pluginId:tool> [--params '<json object>' | --params-file <path>]

Environment: PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_AGENT_ID, PAPERCLIP_RUN_ID,
PAPERCLIP_COMPANY_ID, PAPERCLIP_TASK_ID (the current issue id), optional PAPERCLIP_PROJECT_ID.
When PAPERCLIP_PROJECT_ID is unset or empty the project id is read from the current issue.

Exit codes: 0 success; 1 usage or environment error; 2 the gateway denied or the tool returned an error.`;
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function config() {
  const baseUrl = required(process.env.PAPERCLIP_API_URL, "PAPERCLIP_API_URL");
  const configured = new URL(baseUrl);
  if (!["http:", "https:"].includes(configured.protocol)) throw new Error("PAPERCLIP_API_URL must use HTTP or HTTPS.");
  if (configured.username || configured.password || configured.search || configured.hash) {
    throw new Error("PAPERCLIP_API_URL must not contain credentials, query parameters, or a fragment.");
  }
  if (configured.pathname !== "/") throw new Error("PAPERCLIP_API_URL must be an origin without a path.");
  const loopback = ["127.0.0.1", "[::1]", "localhost"].includes(configured.hostname);
  if (configured.protocol === "http:" && !loopback) throw new Error("PAPERCLIP_API_URL requires HTTPS outside loopback.");
  return { origin: new URL(configured.origin), apiKey: required(process.env.PAPERCLIP_API_KEY, "PAPERCLIP_API_KEY") };
}

async function request(client, pathname, { method = "GET", body } = {}) {
  const target = new URL(pathname.replace(/^\//, ""), `${client.origin.href.replace(/\/$/, "")}/`);
  if (target.origin !== client.origin.origin) throw new Error("Refusing to send Paperclip credentials across origins.");
  const headers = { Authorization: `Bearer ${client.apiKey}`, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(target, { method, redirect: "error", headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 500) }; }
  }
  return { status: response.status, ok: response.ok, payload };
}

function parseArgs(argv) {
  const command = argv.shift();
  if (!command || command === "--help" || command === "-h") return { command: "help" };
  if (command === "list") {
    if (argv.length) throw new Error(`Unexpected argument: ${argv[0]}`);
    return { command };
  }
  if (command !== "call") throw new Error(`Unknown command: ${command}`);
  const tool = argv.shift();
  if (!tool || tool.startsWith("-")) throw new Error("call requires a <pluginId:tool> name.");
  if (!/^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+$/.test(tool)) throw new Error("Tool names look like <pluginId>:<tool>, e.g. paperclip-github-plugin:get_issue.");
  let params;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--params" || token === "--params-file") {
      if (params !== undefined) throw new Error("Give --params or --params-file once.");
      if (!value || value.startsWith("--")) throw new Error(`${token} requires a value.`);
      const raw = token === "--params" ? value : readFileSync(value, "utf8");
      try { params = JSON.parse(raw); } catch { throw new Error("Parameters must be a JSON object."); }
      if (!params || typeof params !== "object" || Array.isArray(params)) throw new Error("Parameters must be a JSON object.");
      index += 1;
      continue;
    }
    throw new Error(`Unknown option ${token} for call.`);
  }
  return { command, tool, params: params ?? {} };
}

async function runContext(client) {
  const agentId = required(process.env.PAPERCLIP_AGENT_ID, "PAPERCLIP_AGENT_ID");
  const runId = required(process.env.PAPERCLIP_RUN_ID, "PAPERCLIP_RUN_ID");
  const issueId = required(process.env.PAPERCLIP_TASK_ID, "PAPERCLIP_TASK_ID");
  let companyId = process.env.PAPERCLIP_COMPANY_ID || "";
  let projectId = process.env.PAPERCLIP_PROJECT_ID || "";
  if (!companyId || !projectId) {
    const issue = await request(client, `/api/issues/${encodeURIComponent(issueId)}`);
    if (!issue.ok) throw new Error(`GET /api/issues/${issueId} failed: ${issue.status} ${issue.payload?.error ?? ""}`.trim());
    companyId ||= issue.payload?.companyId ?? "";
    projectId ||= issue.payload?.projectId ?? "";
  }
  if (!companyId) throw new Error("Could not resolve companyId from PAPERCLIP_COMPANY_ID or the current issue.");
  if (!projectId) throw new Error("Could not resolve projectId: set PAPERCLIP_PROJECT_ID or run from an issue that belongs to a project.");
  return { agentId, runId, companyId, projectId };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.command === "help") { process.stdout.write(`${usage()}\n`); return 0; }
  const client = config();
  if (parsed.command === "list") {
    const response = await request(client, "/api/plugins/tools");
    if (!response.ok) throw new Error(`GET /api/plugins/tools failed: ${response.status} ${response.payload?.error ?? ""}`.trim());
    const tools = Array.isArray(response.payload) ? response.payload : response.payload?.tools ?? response.payload?.items ?? [];
    process.stdout.write(`${JSON.stringify({ count: tools.length, tools: tools.map((t) => ({ name: t.name ?? t.toolName ?? t.id, description: t.description ?? null, parametersSchema: t.parametersSchema ?? t.inputSchema ?? null })) }, null, 2)}\n`);
    return tools.length === 0 ? 2 : 0;
  }
  const context = await runContext(client);
  const response = await request(client, "/api/plugins/tools/execute", { method: "POST", body: { tool: parsed.tool, parameters: parsed.params, runContext: context } });
  process.stdout.write(`${JSON.stringify({ tool: parsed.tool, httpStatus: response.status, ...(response.payload && typeof response.payload === "object" ? response.payload : { result: response.payload }) }, null, 2)}\n`);
  if (!response.ok) return 2;
  const result = response.payload?.result;
  if (result && typeof result === "object" && !Array.isArray(result) && typeof result.error === "string") return 2;
  return 0;
}

main().then((code) => { process.exitCode = code; }).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
