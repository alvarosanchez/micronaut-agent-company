import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(match, "Expected Markdown file to include frontmatter.");
  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

test("CEO self-improvement routine runs monthly", async () => {
  const source = await readFile(new URL("../.paperclip.yaml", import.meta.url), "utf8");
  const config = YAML.parse(source);
  const trigger = config.routines?.["monthly-ceo-self-improvement"]?.triggers?.[0];

  assert.ok(trigger, "Expected monthly-ceo-self-improvement routine trigger.");
  assert.equal(trigger.label, "Monthly CEO Self-Improvement");
  assert.equal(trigger.cronExpression, "0 3 20 * *");
  assert.equal(trigger.timezone, "Europe/Madrid");

  const taskMarkdown = await readFile(
    new URL("../tasks/monthly-ceo-self-improvement/TASK.md", import.meta.url),
    "utf8",
  );
  const { frontmatter } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Monthly CEO Self-Improvement");
});

test("CEO self-improvement guidance requires a durable delegated action and respects bundled system skills", async () => {
  const requiredPaths = [
    "../agents/ceo/AGENTS.md",
    "../tasks/monthly-ceo-self-improvement/TASK.md",
    "../skills/company-package-evolution/SKILL.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.match(markdown, /scoped[\s\S]{0,180}(?:child|delivery)[\s\S]{0,220}acceptance criteria|acceptance criteria[\s\S]{0,220}scoped[\s\S]{0,180}(?:child|delivery)/i);
    assert.match(markdown, /Technical Writer|Writer/i);
    assert.match(markdown, /Micronaut Engineer|Engineer/i);
    assert.match(markdown, /paperclip-create-agent|paperclip-create-plugin|para-memory-files|bundled system skills/i);
  }
});

test("CEO self-improvement routes Paperclip-to-Hermes skill reconciliation to Engineer", async () => {
  const task = await readFile(new URL("../tasks/monthly-ceo-self-improvement/TASK.md", import.meta.url), "utf8");
  const markdown = await readFile(new URL("../skills/ceo-issue-history/references/maintenance-lanes.md", import.meta.url), "utf8");

  assert.match(task, /maintenance-lanes\.md[\s\S]{0,80}ceo-issue-history|ceo-issue-history[\s\S]{0,80}maintenance-lanes\.md/i);
  assert.match(task, /Hermes Runtime Skill Sync/i);
  assert.match(markdown, /Paperclip-managed skills[\s\S]{0,260}all company agents/i);
  assert.match(markdown, /skills_list[\s\S]{0,160}skill_view|skill_view[\s\S]{0,160}skills_list/i);
  assert.match(markdown, /executable reconciliation[\s\S]{0,180}Micronaut Engineer/i);
  assert.match(markdown, /CEO does not mutate Hermes skill storage/i);
});

test("README and COMPANY explain .company-runtime overlays in plain language", async () => {
  for (const relativePath of ["../README.md", "../COMPANY.md"]) {
    const markdown = await readFile(new URL(relativePath, import.meta.url), "utf8");

    assert.match(
      markdown,
      /\.company-runtime\/.*optional local sidecar/i,
      `${relativePath} must explain that .company-runtime is an optional local sidecar folder.`,
    );
    assert.match(
      markdown,
      /if (?:the )?folder is absent|if that folder does not exist/i,
      `${relativePath} must explain what it means when no overlay is present.`,
    );
  }
});

test("managed Micronaut repo AGENTS.md findings route to the writer with conditional gates", async () => {
  const requiredPaths = [
    "../agents/ceo/AGENTS.md",
    "../skills/ceo-issue-history/references/maintenance-lanes.md",
    "../skills/company-package-evolution/SKILL.md",
    "../tasks/monthly-ceo-self-improvement/TASK.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.match(markdown, /Managed Repository AGENTS\.md Audit|managed[- ]repository `?AGENTS\.md`?/i);
    assert.match(markdown, /durable\/current[\s\S]{0,220}stale\/generated[\s\S]{0,220}missing/i);
    assert.match(markdown, /Technical Writer|Writer/i);
    assert.match(markdown, /Architect/i);
    assert.match(markdown, /Security/i);
  }
});

test("CEO delegates repository and PR work to the durable implementation owner", async () => {
  const [ceo, routine, maintenance, evolution] = await Promise.all([
    "../agents/ceo/AGENTS.md",
    "../tasks/monthly-ceo-self-improvement/TASK.md",
    "../skills/ceo-issue-history/references/maintenance-lanes.md",
    "../skills/company-package-evolution/SKILL.md",
  ].map((relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8")));

  assert.match(ceo, /CEO never branches, edits, commits, pushes, creates or updates PRs, repairs CI, replies to review threads, or performs PR rediscovery/i);
  assert.match(routine, /CEO never branches, edits, commits, pushes, creates or updates PRs, repairs CI, replies to review threads, or performs PR rediscovery/i);
  for (const markdown of [ceo, routine, maintenance, evolution]) {
    assert.match(markdown, /implementation owner|Technical Writer|Micronaut Engineer/i);
  }
  assert.match(evolution, /implementation owner owns branch, commits, PR creation\/update, CI repair, review replies, and PR follow-through/i);
});
