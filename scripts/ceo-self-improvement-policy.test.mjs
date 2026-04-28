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

test("managed Micronaut repo AGENTS.md updates require a PR path", async () => {
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
      /managed Micronaut repositor(?:y|ies)[\s\S]*AGENTS\.md[\s\S]*(?:PR|pull request)|(?:PR|pull request)[\s\S]*managed Micronaut repositor(?:y|ies)[\s\S]*AGENTS\.md/i,
      `${relativePath} must require managed Micronaut repo AGENTS.md updates to use a PR path.`,
    );
    assert.match(
      markdown,
      /Managed Repository AGENTS\.md Audit/i,
      `${relativePath} must require the daily CEO report to include an explicit managed repository AGENTS.md audit section.`,
    );
    assert.match(
      markdown,
      /root `?AGENTS\.md`? exists[\s\S]{0,260}(?:durable\/current|stale\/generated|missing)|(?:durable\/current|stale\/generated|missing)[\s\S]{0,260}root `?AGENTS\.md`? exists/i,
      `${relativePath} must require the audit to classify root AGENTS.md as current, stale/generated, or missing.`,
    );
    assert.match(
      markdown,
      /no action needed[\s\S]{0,260}(?:repo-local PR|linked follow-up issue|linked approval|blocker named)|(?:repo-local PR|linked follow-up issue|linked approval|blocker named)[\s\S]{0,260}no action needed/i,
      `${relativePath} must require a concrete action or no-action outcome for each managed repository.`,
    );
  }
});

test("CEO-opened PRs require CI and review-thread follow-up from the daily routine", async () => {
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
      /CEO-opened PRs?|PRs? opened by (?:the )?CEO/i,
      `${relativePath} must name CEO-opened PRs explicitly.`,
    );
    assert.match(
      markdown,
      /CI[\s\S]{0,220}(?:green|passing)|(?:green|passing)[\s\S]{0,220}(?:CI|checks?)/i,
      `${relativePath} must require CEO-opened PRs to keep CI/checks green.`,
    );
    assert.match(
      markdown,
      /unresolved review threads?|review threads?[\s\S]{0,220}(?:unresolved|resolved)/i,
      `${relativePath} must require review-thread follow-up for CEO-opened PRs.`,
    );
    assert.match(
      markdown,
      /daily (?:CEO )?self-improvement routine[\s\S]{0,360}(?:follow up|rediscover|recheck|inspect)|(?:follow up|rediscover|recheck|inspect)[\s\S]{0,360}daily (?:CEO )?self-improvement routine/i,
      `${relativePath} must make the daily CEO self-improvement routine the follow-up mechanism.`,
    );
  }
});
