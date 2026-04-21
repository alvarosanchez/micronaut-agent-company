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

test("CEO self-improvement routine runs daily", async () => {
  const source = await readFile(new URL("../.paperclip.yaml", import.meta.url), "utf8");
  const config = YAML.parse(source);
  const trigger = config.routines?.["daily-ceo-self-improvement"]?.triggers?.[0];

  assert.ok(trigger, "Expected daily-ceo-self-improvement routine trigger.");
  assert.equal(trigger.label, "Daily CEO Self-Improvement");
  assert.equal(trigger.cronExpression, "0 15 * * *");
  assert.equal(trigger.timezone, "Europe/Madrid");

  const taskMarkdown = await readFile(
    new URL("../tasks/daily-ceo-self-improvement/TASK.md", import.meta.url),
    "utf8",
  );
  const { frontmatter } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Daily CEO Self-Improvement");
});

test("CEO self-improvement guidance requires action and respects bundled system skills", async () => {
  const requiredPaths = [
    "../agents/ceo/AGENTS.md",
    "../tasks/daily-ceo-self-improvement/TASK.md",
    "../skills/company-package-evolution/SKILL.md",
    "../README.md",
    "../COMPANY.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await readFile(new URL(relativePath, import.meta.url), "utf8");

    assert.match(
      markdown,
      /implement the change now|change implemented now|implemented change|linked board approval request.*(?:exact|specific) next action|(?:exact|specific) next action.*linked board approval request/i,
      `${relativePath} must require an implemented change or a linked approval for the next action.`,
    );
    assert.match(
      markdown,
      /paperclip-create-agent|paperclip-create-plugin|para-memory-files|bundled system skills/i,
      `${relativePath} must mention the bundled Paperclip system-skill boundary.`,
    );
  }
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
