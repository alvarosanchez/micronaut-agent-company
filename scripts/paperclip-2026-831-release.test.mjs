import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const TEN_MIB = 10 * 1024 * 1024;
const PAPERCLIP_RELEASE_UNDER_TEST = "2026.831.1";
const PACKAGE_AGENT_MAX_CONCURRENT_RUNS = 1;

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("package pins the Paperclip v2026.831.1 runtime for local verification", async () => {
  const packageJson = JSON.parse(await read("../package.json"));
  const setupScript = await read("./setup-local-paperclip-instance.mjs");

  assert.equal(packageJson.devDependencies.paperclipai, PAPERCLIP_RELEASE_UNDER_TEST);
  assert.match(
    setupScript,
    /DEFAULT_PAPERCLIP_PACKAGE\s*=\s*"paperclipai@2026\.831\.1"/,
  );
});

test("import verification fails fast when the Paperclip package or Node runtime is unsupported", async () => {
  const source = await read("./verify-paperclip-import.mjs");

  assert.match(
    source,
    /paperclipPackageEntrypointPath\s*=\s*path\.join\([\s\S]{0,240}"node_modules"[\s\S]{0,240}"paperclipai"[\s\S]{0,240}"dist"[\s\S]{0,240}"index\.js"/,
    "verify-paperclip-import must keep an explicit pointer to the installed Paperclip package entrypoint.",
  );
  assert.match(
    source,
    /existsSync\(paperclipPackageEntrypointPath\)/,
    "verify-paperclip-import must check the installed Paperclip package, not just the committed CLI wrapper.",
  );
  assert.match(
    source,
    />=24\.11\.0/,
    "verify-paperclip-import must enforce the pinned Paperclip runtime's Node >= 24.11 engine floor.",
  );
  assert.doesNotMatch(source, /\^20\.19\.0|\^22\.12\.0/, "Node 20/22 are no longer supported by paperclipai@2026.831.1.");
});

test("import verification compares the built-in claude_local and codex_local adapter configs", async () => {
  const source = await read("./verify-paperclip-import.mjs");

  assert.match(source, /claude_local[\s\S]{0,400}"effort"[\s\S]{0,200}"dangerouslySkipPermissions"/);
  assert.match(source, /codex_local[\s\S]{0,400}"modelReasoningEffort"[\s\S]{0,200}"dangerouslyBypassApprovalsAndSandbox"/);
  assert.match(source, /--skip-git-repo-check/, "verify-paperclip-import must tolerate the codex_local arg Paperclip import appends.");
  assert.match(source, /hermes_local/, "verify-paperclip-import keeps the legacy hermes_local comparison for older packages.");
});

test("package agents explicitly cap heartbeat concurrency below the runtime default of 20", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const agents = Object.entries(extension.agents ?? {});

  assert.ok(agents.length > 0, "Expected package agents in .paperclip.yaml.");
  for (const [agentSlug, agent] of agents) {
    assert.equal(
      agent?.runtime?.heartbeat?.maxConcurrentRuns,
      PACKAGE_AGENT_MAX_CONCURRENT_RUNS,
      `${agentSlug} must keep this package's explicit single-run heartbeat override.`,
    );
  }

  for (const markdown of [readme, company]) {
    assert.match(
      markdown,
      /20 concurrent runs per agent[\s\S]{0,200}paperclipai@2026\.831\.1[\s\S]{0,400}maxConcurrentRuns: 1/i,
      "Docs must document the 2026.831.1 concurrency default and the package override.",
    );
  }
});

test("Paperclip company extension keeps the explicit company defaults", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));

  assert.equal(extension.schema, "paperclip/v1");
  assert.equal(extension.schemaVersion, 7, "package must declare the 2026.831.1 bundle schemaVersion so import does not warn about an unstamped bundle");
  assert.equal(extension.company?.requireBoardApprovalForNewAgents, false);
  assert.equal(extension.company?.attachmentMaxBytes, TEN_MIB);
});

test("docs explain that 2026.831.1 retired the per-company attachment cap", async () => {
  for (const relativePath of ["../README.md", "../COMPANY.md", "../tasks/verify-imported-company-instance/TASK.md"]) {
    const markdown = await read(relativePath);
    assert.match(
      markdown,
      /attachmentMaxBytes[\s\S]{0,400}(?:retired|strips that key|ignored by)[\s\S]{0,300}process-level (?:attachment )?cap[\s\S]{0,120}(?:ceiling|final ceiling)/i,
      `${relativePath} must explain that the attachment cap key is retired and the process-level cap is the ceiling.`,
    );
  }
});

test("guidance preserves normal delivery work as standard-mode issue work", async () => {
  const requiredPaths = [
    "../README.md",
    "../COMPANY.md",
    "../agents/architect/AGENTS.md",
    "../agents/product-manager/AGENTS.md",
    "../skills/product-discovery/SKILL.md",
    "../skills/micronaut-repo-operations/references/workflow-control-plane.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await read(relativePath);

    assert.match(
      markdown,
      /workMode:\s*standard|standard work mode|standard-mode issue/i,
      `${relativePath} must require standard work mode for normal delivery issues.`,
    );
  }
});

test("guidance re-verifies the assigned-issue status default and planning mode against 2026.831.1", async () => {
  for (const relativePath of ["../README.md", "../COMPANY.md", "../skills/micronaut-repo-operations/references/workflow-control-plane.md"]) {
    const markdown = await read(relativePath);

    assert.match(
      markdown,
      /Paperclip v2026\.512\.0, still true in (?:the current )?`paperclipai@2026\.831\.1`[\s\S]{0,400}assigned[\s\S]{0,360}(?:todo|TODO)[\s\S]{0,360}(?:explicit|omitted)/i,
      `${relativePath} must document that assigned issues still default to todo in paperclipai@2026.831.1.`,
    );
    assert.doesNotMatch(markdown, /paperclipai@2026\.626/, `${relativePath} must not cite the superseded 2026.626 runtime.`);
  }

  for (const relativePath of ["../README.md", "../COMPANY.md"]) {
    const markdown = await read(relativePath);
    assert.match(
      markdown,
      /planning mode[\s\S]{0,700}(?:plan only|planning-only|do not write code|not start implementation)[\s\S]{0,700}(?:child implementation issues|standard delivery issue|standard work mode)|(?:child implementation issues|standard delivery issue|standard work mode)[\s\S]{0,700}planning mode[\s\S]{0,700}(?:plan only|planning-only|do not write code|not start implementation)/i,
      `${relativePath} must explain that planning-mode issues are plan-only and separate from standard delivery issues.`,
    );
  }

  const source = await read("./verify-paperclip-import.mjs");
  assert.match(source, /README\.md must explain Paperclip 2026\.512 planning-mode issue semantics\./);
  assert.match(source, /README\.md must explain Paperclip 2026\.512 assigned-issue status defaults\./);
});

test("guidance uses Paperclip planning mode for explicit precursor issues", async () => {
  const planningBoundaryPaths = [
    "../README.md",
    "../COMPANY.md",
    "../agents/ceo/AGENTS.md",
    "../agents/product-manager/AGENTS.md",
    "../agents/architect/AGENTS.md",
  ];

  for (const relativePath of planningBoundaryPaths) {
    const markdown = await read(relativePath);
    assert.match(markdown, /planning[- ]only precursor/i, `${relativePath} must name explicit planning-only precursor issues.`);
    assert.match(markdown, /workMode:\s*planning/i, `${relativePath} must use workMode: planning only for the precursor case.`);
  }
});

test("guidance converts accepted plans through Paperclip accepted-plan decomposition", async () => {
  const decompositionPaths = [
    "../README.md",
    "../COMPANY.md",
    "../agents/architect/AGENTS.md",
    "../skills/micronaut-repo-operations/references/workflow-control-plane.md",
    "../tasks/verify-imported-company-instance/TASK.md",
  ];

  for (const relativePath of decompositionPaths) {
    const markdown = await read(relativePath);
    assert.match(markdown, /accepted-plan-decompositions/i, `${relativePath} must mention /accepted-plan-decompositions.`);
    assert.match(
      markdown,
      /standard[- ]mode child implementation issues|workMode:\s*standard/i,
      `${relativePath} must create standard-mode child implementation issues from accepted plans.`,
    );
  }
});

test("execution-stage guidance still treats approvalsNeeded as the literal 1", async () => {
  for (const relativePath of ["../README.md", "../skills/micronaut-repo-operations/references/workflow-control-plane.md"]) {
    const markdown = await read(relativePath);
    assert.match(
      markdown,
      /paperclipai@2026\.831\.1[\s\S]{0,200}approvalsNeeded: 1[\s\S]{0,300}(?:separate sequential stages|single multi-participant stage)/i,
      `${relativePath} must keep sequential stages because approvalsNeeded is still the literal 1.`,
    );
  }
});

test("operating guidance handles productivity review issues as first-class queue-health work", async () => {
  const requiredPaths = [
    "../README.md",
    "../COMPANY.md",
    "../agents/ceo/AGENTS.md",
    "../tasks/monthly-ceo-self-improvement/TASK.md",
    "../tasks/verify-imported-company-instance/TASK.md",
    "../skills/micronaut-repo-operations/references/workflow-control-plane.md",
    "../skills/micronaut-quality-gates/SKILL.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await read(relativePath);
    assert.match(markdown, /productivity review/i, `${relativePath} must mention Paperclip productivity reviews.`);
    assert.match(
      markdown,
      /issue_productivity_review|no-comment|long-active|high-churn|high churn|long active/i,
      `${relativePath} must name the productivity review origin or triggers.`,
    );
    assert.match(
      markdown,
      /source issue|source work|review issue|manager decision|queue-health|queue health/i,
      `${relativePath} must explain how to route the review against the source work.`,
    );
  }
});

test("source verification enforces the attachment and productivity-review guidance", async () => {
  const source = await read("./verify-paperclip-import.mjs");

  assert.match(source, /README\.md must document the explicit Paperclip company attachment cap\./);
  assert.match(source, /README\.md must explain Paperclip productivity review issues\./);
});

const HOST_DEFAULT_DOC_PATHS = ["../README.md", "../COMPANY.md", "../tasks/verify-imported-company-instance/TASK.md"];

test("docs treat the fail-closed tool gateway as a tool-access profile prerequisite", async () => {
  for (const relativePath of HOST_DEFAULT_DOC_PATHS) {
    const markdown = await read(relativePath);

    assert.match(markdown, /fail-closed/i, `${relativePath} must say the 2026.831 tool gateway is fail-closed.`);
    assert.match(
      markdown,
      /`tool_name` (?:include entries|includes)[\s\S]{0,200}paperclip-github-plugin/i,
      `${relativePath} must require tool_name include entries for the paperclip-github-plugin tools.`,
    );
    assert.match(
      markdown,
      /(?:empty list|comes back empty|list is empty)[\s\S]{0,400}deny_default|deny_default[\s\S]{0,400}(?:empty list|comes back empty|list is empty)/i,
      `${relativePath} must explain the empty tool list and deny_default rejection when no profile is bound.`,
    );
  }

  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  for (const markdown of [readme, company]) {
    assert.match(markdown, /bind (?:that profile )?at company scope|bound (?:it )?at company scope|profile at company scope/i, "Docs must bind the tool-access profile at company scope.");
  }

  const verifyTask = await read("../tasks/verify-imported-company-instance/TASK.md");
  assert.match(
    verifyTask,
    /GET \/api\/plugins\/tools[\s\S]{0,400}paperclip-github-plugin/,
    "Bootstrap verification must check that GET /api/plugins/tools returns the GitHub plugin tools.",
  );
});

test("docs require pauseAutomations on import and resume from the CEO bootstrap issue", async () => {
  for (const relativePath of HOST_DEFAULT_DOC_PATHS) {
    const markdown = await read(relativePath);

    assert.match(markdown, /pauseAutomations: true/, `${relativePath} must require pauseAutomations: true on import or sync.`);
    assert.match(markdown, /pauseReason: "import"/, `${relativePath} must name the import pause reason imported agents carry.`);
    assert.match(
      markdown,
      /bootstrap (?:verification )?issue is the (?:single )?point where[\s\S]{0,160}resumed/i,
      `${relativePath} must make the CEO bootstrap verification issue the resume point.`,
    );
  }
});

test("docs treat the execution-policy review-rounds cap as expected escalation", async () => {
  for (const relativePath of HOST_DEFAULT_DOC_PATHS) {
    const markdown = await read(relativePath);

    assert.match(
      markdown,
      /maxReviewRounds[\s\S]{0,40}(?:host )?default(?:s to)? 3[\s\S]{0,700}responsibleUserId/i,
      `${relativePath} must document the default cap of 3 agent review rounds and the responsibleUserId escalation.`,
    );
    assert.match(markdown, /not a stuck stage/i, `${relativePath} must say a capped-out stage is not a stuck stage.`);
    assert.match(
      markdown,
      /(?:comment|comments|report)[\s\S]{0,300}(?:rounds (?:already )?spent|rounds spent)/i,
      `${relativePath} must tell the capped-out agent how to report the cap.`,
    );
  }
});

test("docs record the deliberate non-use of Decisions, Cases, status cards, and summary slots", async () => {
  for (const relativePath of HOST_DEFAULT_DOC_PATHS) {
    const markdown = await read(relativePath);

    assert.match(
      markdown,
      /Decisions[\s\S]{0,200}Cases[\s\S]{0,80}status cards[\s\S]{0,60}summary slots[\s\S]{0,80}deliberately (?:not used|unused)[\s\S]{0,120}`request_confirmation`/i,
      `${relativePath} must record that Decisions, Cases, status cards, and summary slots are deliberately unused.`,
    );
  }
});

test("guidance covers Paperclip v2026.831.1 runtime surfaces without hard-coding deployment choices", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const verifyTask = await read("../tasks/verify-imported-company-instance/TASK.md");
  const githubOps = await read("../skills/micronaut-github-operations/SKILL.md");
  const controlPlane = await read("../skills/micronaut-repo-operations/references/workflow-control-plane.md");

  // Adapters and engine.
  assert.match(readme, /claude_local[\s\S]{0,400}codex_local[\s\S]{0,600}engine: auto/i);
  assert.match(readme, /ACP[\s\S]{0,200}persistent[\s\S]{0,300}PAPERCLIP_WORKSPACE_\*/);
  assert.match(company, /engine: auto[\s\S]{0,400}PAPERCLIP_WORKSPACE_\*/);
  assert.match(readme, /--dangerously-skip-permissions[\s\S]{0,200}policy, not a runtime guard/i);

  // Plugin tool access through the tool gateway.
  for (const [label, markdown] of [["README", readme], ["COMPANY", company], ["github-operations", githubOps], ["verify task", verifyTask]]) {
    assert.match(markdown, /GET \/api\/plugins\/tools[\s\S]{0,200}POST \/api\/plugins\/tools\/execute/, `${label} must name the plugin tool API.`);
    assert.match(markdown, /tool-access policy|tool gateway/i, `${label} must mention the company tool-access policy.`);
  }
  assert.match(githubOps, /missing or denied[\s\S]{0,120}policy blocker/i);

  // Run token, interactions, trust, import/export, skills.
  assert.match(readme, /48h[\s\S]{0,200}PAPERCLIP_API_KEY/);
  assert.match(readme, /resolver policy defaults to `anyone`[\s\S]{0,200}not_creator[\s\S]{0,60}human_only/);
  assert.match(controlPlane, /resolver policy defaults to `anyone`/);
  assert.match(readme, /standard-trust agents can write to company-visible issues/i);
  assert.match(readme, /declares 7[\s\S]{0,200}async jobs?/i);
  assert.match(readme, /explicit merge mode[\s\S]{0,200}collisionStrategy: replace/);
  assert.match(verifyTask, /explicit replace merge mode/i);
  assert.match(verifyTask, /claude_local[\s\S]{0,600}codex_local[\s\S]{0,300}gpt-6-astra/);
  assert.match(verifyTask, /task watchdogs are limited to non-GitHub waits/i);
  assert.match(readme, /task watchdog/i);
  assert.match(readme, /ask work mode|question-and-answer/i);
  assert.match(readme, /routine date variables|date variable/i);
  assert.match(readme, /workspace file viewer|artifact links|PR-visible artifacts/i);
  assert.match(readme, /Teams Catalog/i);
  assert.match(readme, /Skills Store/i);

  // No Hermes-era surfaces remain.
  for (const [label, markdown] of [["README", readme], ["COMPANY", company], ["verify task", verifyTask], ["github-operations", githubOps]]) {
    assert.doesNotMatch(markdown, /hermes|mcp_paperclip_plugin_tools|MCP-bridged/i, `${label} must not carry Hermes-era guidance.`);
  }
});
