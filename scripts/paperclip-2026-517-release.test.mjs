import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const TEN_MIB = 10 * 1024 * 1024;
const PAPERCLIP_RELEASE_UNDER_TEST = "2026.517.0";
const PACKAGE_AGENT_MAX_CONCURRENT_RUNS = 1;

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("package pins the Paperclip v2026.517.0 runtime for local verification", async () => {
  const packageJson = JSON.parse(await read("../package.json"));
  const setupScript = await read("./setup-local-paperclip-instance.mjs");

  assert.equal(packageJson.devDependencies.paperclipai, PAPERCLIP_RELEASE_UNDER_TEST);
  assert.match(
    setupScript,
    /DEFAULT_PAPERCLIP_PACKAGE\s*=\s*"paperclipai@2026\.517\.0"/,
  );
});

test("import verification fails fast when the Paperclip package is missing", async () => {
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
});

test("package agents explicitly cap heartbeat concurrency to one run", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");
  const agents = Object.entries(extension.agents ?? {});

  assert.ok(agents.length > 0, "Expected package agents in .paperclip.yaml.");
  for (const [agentSlug, agent] of agents) {
    assert.equal(
      agent?.runtime?.heartbeat?.maxConcurrentRuns,
      PACKAGE_AGENT_MAX_CONCURRENT_RUNS,
      `${agentSlug} must override Paperclip v2026.517.0's 20-run default.`,
    );
  }

  assert.match(
    readme,
    /Paperclip v2026\.517\.0[\s\S]{0,320}20[\s\S]{0,320}maxConcurrentRuns[\s\S]{0,320}1/i,
    "README must document the explicit single-run heartbeat concurrency override.",
  );
});

test("Paperclip company extension declares v2026.428 company defaults explicitly", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));

  assert.equal(extension.company?.requireBoardApprovalForNewAgents, false);
  assert.equal(extension.company?.attachmentMaxBytes, TEN_MIB);
});

test("guidance preserves normal delivery work as standard-mode issue work", async () => {
  const requiredPaths = [
    "../README.md",
    "../COMPANY.md",
    "../agents/architect/AGENTS.md",
    "../agents/product-manager/AGENTS.md",
    "../skills/product-discovery/SKILL.md",
    "../skills/micronaut-repo-operations/SKILL.md",
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

test("guidance handles Paperclip v2026.512 issue defaults and planning mode", async () => {
  for (const relativePath of ["../README.md", "../COMPANY.md"]) {
    const markdown = await read(relativePath);

    assert.match(
      markdown,
      /Paperclip (?:v|`?paperclipai@)2026\.512\.0[\s\S]{0,900}assigned[\s\S]{0,360}status[\s\S]{0,260}(?:todo|TODO)[\s\S]{0,360}(?:explicit|omitted)/i,
      `${relativePath} must document the assigned-issue status default introduced in Paperclip v2026.512.0.`,
    );
    assert.match(
      markdown,
      /planning mode[\s\S]{0,700}(?:plan only|planning-only|do not write code|not start implementation)[\s\S]{0,700}(?:child implementation issues|standard delivery issue|standard work mode)|(?:child implementation issues|standard delivery issue|standard work mode)[\s\S]{0,700}planning mode[\s\S]{0,700}(?:plan only|planning-only|do not write code|not start implementation)/i,
      `${relativePath} must explain that planning-mode issues are plan-only and separate from standard delivery issues.`,
    );
  }

  const source = await read("./verify-paperclip-import.mjs");
  assert.match(
    source,
    /README\.md must explain Paperclip 2026\.512 planning-mode issue semantics\./,
  );
  assert.match(
    source,
    /README\.md must explain Paperclip 2026\.512 assigned-issue status defaults\./,
  );
});

test("docs explain v2026.428 company-level attachment and hiring semantics", async () => {
  for (const relativePath of ["../README.md", "../COMPANY.md"]) {
    const markdown = await read(relativePath);

    assert.match(
      markdown,
      /attachmentMaxBytes[\s\S]{0,260}10 MiB|10 MiB[\s\S]{0,260}attachmentMaxBytes/i,
      `${relativePath} must document the explicit 10 MiB attachment cap.`,
    );
    assert.match(
      markdown,
      /process-level (?:attachment )?cap[\s\S]{0,260}(?:ceiling|final ceiling)|(?:ceiling|final ceiling)[\s\S]{0,260}process-level (?:attachment )?cap/i,
      `${relativePath} must explain that the process-level cap remains the ceiling.`,
    );
    assert.match(
      markdown,
      /requireBoardApprovalForNewAgents[\s\S]{0,260}false|new-hire approval[\s\S]{0,260}(?:opt-in|explicit)/i,
      `${relativePath} must document the explicit new-hire approval policy.`,
    );
  }
});

test("operating guidance handles productivity review issues as first-class queue-health work", async () => {
  const requiredPaths = [
    "../README.md",
    "../COMPANY.md",
    "../agents/ceo/AGENTS.md",
    "../tasks/daily-ceo-self-improvement/TASK.md",
    "../tasks/verify-imported-company-instance/TASK.md",
    "../skills/micronaut-repo-operations/SKILL.md",
    "../skills/micronaut-quality-gates/SKILL.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await read(relativePath);

    assert.match(
      markdown,
      /productivity review/i,
      `${relativePath} must mention Paperclip productivity reviews.`,
    );
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

test("source verification enforces the Paperclip v2026.428 migration guidance", async () => {
  const source = await read("./verify-paperclip-import.mjs");

  assert.match(
    source,
    /README\.md must document the explicit Paperclip company attachment cap\./,
  );
  assert.match(
    source,
    /README\.md must explain Paperclip productivity review issues\./,
  );
});
