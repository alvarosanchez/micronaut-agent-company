import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../skills/paperclip-control-plane/scripts/paperclip-workflow.mjs", import.meta.url));
const ISSUE_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";
const NEXT_ID = "33333333-3333-4333-8333-333333333333";
const APPROVAL_ID = "44444444-4444-4444-8444-444444444444";
const RUN_ID = "55555555-5555-4555-8555-555555555555";
const execFileAsync = promisify(execFile);

async function run(args, baseUrl, { env = {}, cwd } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [SCRIPT, ...args], {
      encoding: "utf8",
      cwd,
      env: {
        ...process.env,
        PAPERCLIP_API_URL: baseUrl,
        PAPERCLIP_API_KEY: "test-agent-key",
        PAPERCLIP_RUN_ID: RUN_ID,
        PAPERCLIP_AGENT_ID: AGENT_ID,
        ...env,
      },
    });
    return { status: 0, stdout, stderr };
  } catch (error) {
    return { status: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

async function fixture({ locked = false } = {}) {
  let document = {
    id: "66666666-6666-4666-8666-666666666666",
    key: "qa-intake",
    title: "QA intake",
    body: "old\n",
    latestRevisionId: "77777777-7777-4777-8777-777777777777",
    lockedAt: locked ? "2026-07-09T00:00:00.000Z" : null,
  };
  const issue = {
    id: ISSUE_ID,
    identifier: "MAC-1",
    status: "in_review",
    assigneeAgentId: AGENT_ID,
    checkoutRunId: RUN_ID,
    executionRunId: RUN_ID,
    executionState: {
      currentParticipant: { type: "agent", agentId: AGENT_ID },
      lastDecisionOutcome: null,
    },
  };
  const requests = [];
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : null;
    requests.push({ method: req.method, url: req.url, headers: req.headers, body });
    res.setHeader("content-type", "application/json");
    if (req.headers.authorization !== "Bearer test-agent-key") {
      res.statusCode = 401; res.end(JSON.stringify({ error: "unauthorized" })); return;
    }
    if (req.url === `/api/issues/${ISSUE_ID}` && req.method === "GET") { res.end(JSON.stringify(issue)); return; }
    if (req.url === `/api/issues/${ISSUE_ID}/heartbeat-context`) { res.end(JSON.stringify({ issueId: ISSUE_ID, blockerAttention: null })); return; }
    if (req.url === `/api/issues/${ISSUE_ID}/documents`) { res.end(JSON.stringify([document])); return; }
    if (req.url === `/api/issues/${ISSUE_ID}/documents/qa-intake` && req.method === "GET") { res.end(JSON.stringify(document)); return; }
    if (req.url === `/api/issues/${ISSUE_ID}/documents/missing` && req.method === "GET") {
      res.statusCode = 404; res.end(JSON.stringify({ error: "Document not found" })); return;
    }
    if (req.url === `/api/issues/${ISSUE_ID}/documents/qa-intake` && req.method === "PUT") {
      if (req.headers["x-paperclip-run-id"] !== RUN_ID) {
        res.statusCode = 401; res.end(JSON.stringify({ error: "missing run" })); return;
      }
      assert.equal(body.baseRevisionId, document.latestRevisionId);
      document = { ...document, ...body, key: "qa-intake", latestRevisionId: "88888888-8888-4888-8888-888888888888" };
      res.end(JSON.stringify({ document, revision: { id: document.latestRevisionId } })); return;
    }
    if (req.url === `/api/approvals/${APPROVAL_ID}/issues`) { res.end(JSON.stringify([{ id: ISSUE_ID }])); return; }
    res.statusCode = 404; res.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("snapshot and verify work from an unrelated managed-workspace directory", async () => {
  const api = await fixture();
  const directory = await mkdtemp(path.join(tmpdir(), "managed-workspace-"));
  try {
    const snapshot = await run(["snapshot", "--issue", ISSUE_ID, "--document", "qa-intake"], api.baseUrl, { cwd: directory });
    assert.equal(snapshot.status, 0, snapshot.stderr || snapshot.stdout);
    const report = JSON.parse(snapshot.stdout);
    assert.equal(report.issue.status, "in_review");
    assert.equal(report.selectedDocuments["qa-intake"].body, "old\n");

    const verified = await run(["verify", "--issue", ISSUE_ID, "--status", "in_review", "--participant", AGENT_ID, "--assignee", AGENT_ID, "--outcome", "none", "--document", "qa-intake"], api.baseUrl);
    assert.equal(verified.status, 0, verified.stdout);
    assert.equal(JSON.parse(verified.stdout).verification.passed, true);

    const mismatch = await run(["verify", "--issue", ISSUE_ID, "--participant", NEXT_ID, "--document", "missing"], api.baseUrl);
    assert.equal(mismatch.status, 2);
    assert.deepEqual(JSON.parse(mismatch.stdout).verification.mismatches.map((entry) => entry.field), ["participant", "document:missing"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
    await api.close();
  }
});

test("approval linkage and revision-safe document writes read back their results", async () => {
  const api = await fixture();
  const directory = await mkdtemp(path.join(tmpdir(), "paperclip-workflow-"));
  try {
    const approval = await run(["approval-link", "--approval", APPROVAL_ID, "--issue", ISSUE_ID], api.baseUrl);
    assert.equal(approval.status, 0, approval.stdout);
    assert.equal(JSON.parse(approval.stdout).linked, true);

    const artifact = path.join(directory, "artifact.md");
    await writeFile(artifact, "new artifact\n");
    const written = await run(["put-document", "--issue", ISSUE_ID, "--key", "qa-intake", "--file", artifact, "--change-summary", "refresh"], api.baseUrl);
    assert.equal(written.status, 0, written.stdout);
    assert.equal(JSON.parse(written.stdout).verified, true);
    const writes = api.requests.filter((request) => request.method === "PUT");
    assert.equal(writes.length, 1);
    assert.ok(writes.every((request) => request.headers["x-paperclip-run-id"] === RUN_ID));
  } finally {
    await rm(directory, { recursive: true, force: true });
    await api.close();
  }
});

test("put-document refuses locked targets before mutation", async () => {
  const api = await fixture({ locked: true });
  const directory = await mkdtemp(path.join(tmpdir(), "paperclip-workflow-locked-"));
  try {
    const artifact = path.join(directory, "artifact.md");
    await writeFile(artifact, "must not be written\n");
    const result = await run(["put-document", "--issue", ISSUE_ID, "--key", "qa-intake", "--file", artifact], api.baseUrl);
    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).error, /is locked; refusing a write/);
    assert.equal(api.requests.some((request) => request.method === "PUT"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
    await api.close();
  }
});

test("writes require a run id and API URLs fail closed before credentials leave loopback", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "paperclip-workflow-config-"));
  const artifact = path.join(directory, "artifact.md");
  await writeFile(artifact, "artifact\n");
  try {
    const missingRun = await run(
      ["put-document", "--issue", ISSUE_ID, "--key", "qa-intake", "--file", artifact],
      "http://127.0.0.1:1",
      { env: { PAPERCLIP_RUN_ID: "" } },
    );
    assert.equal(missingRun.status, 1);
    assert.match(JSON.parse(missingRun.stdout).error, /PAPERCLIP_RUN_ID/);

    for (const url of [
      "http://example.com",
      "http://user:password@127.0.0.1:1",
      "http://127.0.0.1:1/api",
      "http://127.0.0.1:1/?token=secret",
      "http://127.0.0.1:1/#fragment",
    ]) {
      const result = await run(["snapshot", "--issue", ISSUE_ID], url);
      assert.equal(result.status, 1, `${url}: ${result.stdout}`);
      assert.match(JSON.parse(result.stdout).error, /requires HTTPS|must not contain|without a path/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
