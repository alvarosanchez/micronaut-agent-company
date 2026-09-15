import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/paperclip-control-plane/scripts/plugin-tool.mjs", import.meta.url));
const ISSUE_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";
const RUN_ID = "33333333-3333-4333-8333-333333333333";
const COMPANY_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const execFileAsync = promisify(execFile);

async function run(args, baseUrl, env = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [SCRIPT, ...args], {
      encoding: "utf8",
      env: { ...process.env, PAPERCLIP_API_URL: baseUrl, PAPERCLIP_API_KEY: "test-agent-key", PAPERCLIP_AGENT_ID: AGENT_ID, PAPERCLIP_RUN_ID: RUN_ID, PAPERCLIP_TASK_ID: ISSUE_ID, PAPERCLIP_COMPANY_ID: COMPANY_ID, PAPERCLIP_PROJECT_ID: PROJECT_ID, ...env },
    });
    return { status: 0, stdout, stderr };
  } catch (error) {
    return { status: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

async function fixture() {
  const requests = [];
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : null;
    requests.push({ method: req.method, url: req.url, body });
    res.setHeader("content-type", "application/json");
    if (req.headers.authorization !== "Bearer test-agent-key") { res.statusCode = 401; res.end(JSON.stringify({ error: "unauthorized" })); return; }
    if (req.url === "/api/plugins/tools" && req.method === "GET") {
      res.end(JSON.stringify([{ name: "paperclip-github-plugin:get_issue", description: "Fetch a GitHub issue", parametersSchema: { type: "object" } }])); return;
    }
    if (req.url === `/api/issues/${ISSUE_ID}` && req.method === "GET") { res.end(JSON.stringify({ id: ISSUE_ID, companyId: COMPANY_ID, projectId: PROJECT_ID })); return; }
    if (req.url === "/api/plugins/tools/execute" && req.method === "POST") {
      if (!body.runContext?.agentId || !body.runContext?.runId || !body.runContext?.companyId || !body.runContext?.projectId) {
        res.statusCode = 400; res.end(JSON.stringify({ error: '"runContext" must include agentId, runId, companyId, and projectId' })); return;
      }
      if (body.tool === "paperclip-github-plugin:create_pull_request") { res.statusCode = 403; res.end(JSON.stringify({ error: "Tool denied by policy", reasonCode: "deny_default" })); return; }
      if (body.tool === "paperclip-github-plugin:get_issue" && !body.parameters?.issueNumber) {
        res.end(JSON.stringify({ pluginId: "paperclip-github-plugin", toolName: "get_issue", result: { error: "issueNumber is required when paperclipIssueId is not provided." } })); return;
      }
      res.end(JSON.stringify({ pluginId: "paperclip-github-plugin", toolName: "get_issue", result: { number: body.parameters.issueNumber, title: "Example" } })); return;
    }
    res.statusCode = 404; res.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((resolve) => server.close(resolve)) };
}

test("call sends parameters (not arguments) and the full run context from the environment", async () => {
  const f = await fixture();
  try {
    const result = await run(["call", "paperclip-github-plugin:get_issue", "--params", '{"repository":"micronaut-projects/micronaut-maven-plugin","issueNumber":1712}'], f.baseUrl);
    assert.equal(result.status, 0, result.stderr);
    const execute = f.requests.find((r) => r.url === "/api/plugins/tools/execute");
    assert.deepEqual(execute.body, { tool: "paperclip-github-plugin:get_issue", parameters: { repository: "micronaut-projects/micronaut-maven-plugin", issueNumber: 1712 }, runContext: { agentId: AGENT_ID, runId: RUN_ID, companyId: COMPANY_ID, projectId: PROJECT_ID } });
    assert.ok(!("arguments" in execute.body));
    assert.equal(f.requests.some((r) => r.url === `/api/issues/${ISSUE_ID}`), false, "no issue lookup when the environment carries both ids");
    assert.match(result.stdout, /"title": "Example"/);
  } finally { await f.close(); }
});

test("call resolves a missing project id from the current issue", async () => {
  const f = await fixture();
  try {
    const result = await run(["call", "paperclip-github-plugin:get_issue", "--params", '{"issueNumber":1}'], f.baseUrl, { PAPERCLIP_PROJECT_ID: "" });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(f.requests.some((r) => r.url === `/api/issues/${ISSUE_ID}`));
    assert.equal(f.requests.find((r) => r.url === "/api/plugins/tools/execute").body.runContext.projectId, PROJECT_ID);
  } finally { await f.close(); }
});

test("gateway denials and tool-level errors exit 2 with the payload printed", async () => {
  const f = await fixture();
  try {
    const denied = await run(["call", "paperclip-github-plugin:create_pull_request", "--params", "{}"], f.baseUrl);
    assert.equal(denied.status, 2);
    assert.match(denied.stdout, /deny_default/);
    const toolError = await run(["call", "paperclip-github-plugin:get_issue"], f.baseUrl);
    assert.equal(toolError.status, 2);
    assert.match(toolError.stdout, /issueNumber is required/);
  } finally { await f.close(); }
});

test("list prints the gateway tool inventory and exits 2 when it is empty", async () => {
  const f = await fixture();
  try {
    const result = await run(["list"], f.baseUrl);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"count": 1/);
    assert.match(result.stdout, /paperclip-github-plugin:get_issue/);
  } finally { await f.close(); }
});

test("usage errors fail before any network access", async () => {
  const f = await fixture();
  try {
    for (const args of [["call"], ["call", "get_issue"], ["call", "paperclip-github-plugin:get_issue", "--params", "[1]"], ["call", "paperclip-github-plugin:get_issue", "--arguments", "{}"], ["execute", "x:y"]]) {
      const result = await run(args, f.baseUrl);
      assert.equal(result.status, 1, `${args.join(" ")} should fail with exit 1`);
    }
    assert.equal(f.requests.length, 0);
    const unsafe = await run(["call", "paperclip-github-plugin:get_issue", "--params", "{}"], "http://example.com");
    assert.equal(unsafe.status, 1);
    assert.match(unsafe.stderr, /requires HTTPS outside loopback/);
    assert.equal(f.requests.length, 0);
  } finally { await f.close(); }
});
