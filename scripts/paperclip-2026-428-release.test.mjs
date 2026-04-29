import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const TEN_MIB = 10 * 1024 * 1024;

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("package pins the Paperclip v2026.428.0 runtime for local verification", async () => {
  const packageJson = JSON.parse(await read("../package.json"));
  const setupScript = await read("./setup-local-paperclip-instance.mjs");

  assert.equal(packageJson.devDependencies.paperclipai, "2026.428.0");
  assert.match(
    setupScript,
    /DEFAULT_PAPERCLIP_PACKAGE\s*=\s*"paperclipai@2026\.428\.0"/,
  );
});

test("Paperclip company extension declares v2026.428 company defaults explicitly", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));

  assert.equal(extension.company?.requireBoardApprovalForNewAgents, false);
  assert.equal(extension.company?.attachmentMaxBytes, TEN_MIB);
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
