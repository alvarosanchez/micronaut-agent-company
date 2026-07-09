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

async function run(args, baseUrl, extraEnv = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [SCRIPT, ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        PAPERCLIP_API_URL: baseUrl,
        PAPERCLIP_API_KEY: "test-agent-key",
        PAPERCLIP_RUN_ID: RUN_ID,
        PAPERCLIP_AGENT_ID: AGENT_ID,
        ...extraEnv,
      },
    });
    return { status: 0, stdout, stderr };
  } catch (error) {
    return { status: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

async function fixture() {
  let document = {
    id: "66666666-6666-4666-8666-666666666666",
    key: "qa-intake",
    title: "QA intake",
    body: "old\n",
    latestRevisionId: "77777777-7777-4777-8777-777777777777",
  };
  let issue = {
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
    if (req.url === `/api/issues/${ISSUE_ID}` && req.method === "PATCH") {
      if (req.headers["x-paperclip-run-id"] !== RUN_ID) { res.statusCode = 401; res.end(JSON.stringify({ error: "missing run" })); return; }
      issue = {
        ...issue,
        status: "in_review",
        assigneeAgentId: NEXT_ID,
        executionState: {
          ...issue.executionState,
          currentParticipant: { type: "agent", agentId: NEXT_ID },
          lastDecisionOutcome: body.status === "done" ? "approved" : "changes_requested",
        },
      };
      res.end(JSON.stringify(issue)); return;
    }
    if (req.url === `/api/issues/${ISSUE_ID}/heartbeat-context`) { res.end(JSON.stringify({ issueId: ISSUE_ID, blockerAttention: null })); return; }
    if (req.url === `/api/issues/${ISSUE_ID}/documents`) { res.end(JSON.stringify([document])); return; }
    if (req.url === `/api/issues/${ISSUE_ID}/documents/qa-intake` && req.method === "GET") { res.end(JSON.stringify(document)); return; }
    if (req.url === `/api/issues/${ISSUE_ID}/documents/missing` && req.method === "GET") { res.statusCode = 404; res.end(JSON.stringify({ error: "Document not found" })); return; }
    if (req.url === `/api/issues/${ISSUE_ID}/documents/qa-intake` && req.method === "PUT") {
      if (req.headers["x-paperclip-run-id"] !== RUN_ID) { res.statusCode = 401; res.end(JSON.stringify({ error: "missing run" })); return; }
      assert.equal(body.baseRevisionId, document.latestRevisionId);
      document = { ...document, ...body, latestRevisionId: "88888888-8888-4888-8888-888888888888" };
      res.end(JSON.stringify({ document, revision: { id: document.latestRevisionId } })); return;
    }
    if (req.url === `/api/approvals/${APPROVAL_ID}/issues`) { res.end(JSON.stringify([{ id: ISSUE_ID }])); return; }
    res.statusCode = 404; res.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("snapshot and verify reduce repeated issue/document reads to structured JSON", async () => {
  const api = await fixture();
  try {
    const snapshot = await run(["snapshot", "--issue", ISSUE_ID, "--document", "qa-intake"], api.baseUrl);
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
    await api.close();
  }
});

test("approval linkage, revision-safe document writes, and guarded transitions read back their results", async () => {
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

    const comment = path.join(directory, "decision.md");
    await writeFile(comment, "Approved exact SHA abc123.");
    const transitioned = await run(["transition", "--issue", ISSUE_ID, "--status", "done", "--comment-file", comment], api.baseUrl);
    assert.equal(transitioned.status, 0, transitioned.stdout);
    const result = JSON.parse(transitioned.stdout);
    assert.equal(result.transitioned, true);
    assert.equal(result.after.participant, NEXT_ID);
    assert.equal(result.after.lastDecisionOutcome, "approved");
    const writes = api.requests.filter((request) => ["PUT", "PATCH"].includes(request.method));
    assert.ok(writes.every((request) => request.headers["x-paperclip-run-id"] === RUN_ID));
  } finally {
    await rm(directory, { recursive: true, force: true });
    await api.close();
  }
});

test("transition fails closed before mutation when the current participant differs", async () => {
  const api = await fixture();
  const directory = await mkdtemp(path.join(tmpdir(), "paperclip-workflow-mismatch-"));
  try {
    const comment = path.join(directory, "decision.md");
    await writeFile(comment, "Approved.");
    const result = await run(["transition", "--issue", ISSUE_ID, "--status", "done", "--comment-file", comment, "--expect-participant", NEXT_ID], api.baseUrl);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).transitioned, false);
    assert.equal(api.requests.some((request) => request.method === "PATCH"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
    await api.close();
  }
});
