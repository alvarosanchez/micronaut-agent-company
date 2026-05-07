import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(match, "Expected Markdown file to include frontmatter.");
  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

function assertContains(value, pattern, message) {
  assert.ok(pattern.test(value), message);
}

test("Technical Writer owns weekly guide review and topic discovery routines", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const guideReview = extension.routines?.["weekly-user-guide-review"];
  const guideTopic = extension.routines?.["weekly-guide-topic-discovery"];

  assert.equal(extension.routines?.["weekly-security-deep-scan"]?.triggers?.[0]?.cronExpression, "0 1 * * 2");
  assert.equal(extension.routines?.["daily-ceo-self-improvement"]?.triggers?.[0]?.cronExpression, "0 3 * * *");
  assert.equal(extension.routines?.training?.triggers?.[0]?.cronExpression, "0 2 */2 * *");

  assert.equal(guideReview?.status, "active");
  assert.equal(guideReview?.triggers?.[0]?.label, "Weekly User Guide Review");
  assert.equal(guideReview?.triggers?.[0]?.cronExpression, "0 1 * * 3");
  assert.equal(guideReview?.triggers?.[0]?.timezone, "Europe/Madrid");

  assert.equal(guideTopic?.status, "active");
  assert.equal(guideTopic?.triggers?.[0]?.label, "Weekly Guide Topic Discovery");
  assert.equal(guideTopic?.triggers?.[0]?.cronExpression, "0 1 * * 4");
  assert.equal(guideTopic?.triggers?.[0]?.timezone, "Europe/Madrid");
});

test("Weekly User Guide Review task requires fact-checked guide validation", async () => {
  const taskMarkdown = await read("../tasks/weekly-user-guide-review/TASK.md");
  const { frontmatter, body } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Weekly User Guide Review");
  assert.equal(frontmatter.assignee, "technical-writer");
  assert.equal(frontmatter.project, "company-operations");
  assert.equal(frontmatter.recurring, true);
  assertContains(body, /Micronaut-related Paperclip projects/i, "User guide review should iterate Micronaut-related projects.");
  assertContains(body, /\.\/gradlew publishGuide/i, "User guide review should assemble the guide with publishGuide.");
  assertContains(body, /throwaway (?:applications|apps|projects)/i, "User guide review should fact-check with throwaway apps or projects.");
  assertContains(body, /fact-check[\s\S]{0,160}proposed/i, "User guide review should fact-check proposed changes.");
  assertContains(body, /first run[\s\S]{0,220}full guide review|full guide review[\s\S]{0,220}first run/i, "User guide review should do a full first pass.");
  assertContains(body, /prior routine report[\s\S]{0,260}(?:delta|diff|recent commits)|(?:delta|diff|recent commits)[\s\S]{0,260}prior routine report/i, "User guide review should use prior reports and deltas after the first run.");
  assertContains(body, /PR/i, "User guide review should open or update PRs.");
});

test("Weekly Guide Topic Discovery task uses the Micronaut Guides skill", async () => {
  const taskMarkdown = await read("../tasks/weekly-guide-topic-discovery/TASK.md");
  const { frontmatter, body } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Weekly Guide Topic Discovery");
  assert.equal(frontmatter.assignee, "technical-writer");
  assert.equal(frontmatter.project, "company-operations");
  assert.equal(frontmatter.recurring, true);
  assertContains(body, /Micronaut-related Paperclip projects/i, "Guide topic discovery should iterate Micronaut-related projects.");
  assertContains(body, /`?guides`? skill/i, "Guide topic discovery should use the guides skill.");
  assertContains(body, /missing guide topics?/i, "Guide topic discovery should identify missing guide topics.");
  assertContains(body, /deduplic/i, "Guide topic discovery should deduplicate guide topics.");
  assertContains(body, /micronaut-guides/i, "Guide topic discovery should target micronaut-guides for standalone guides.");
  assertContains(body, /existing[\s\S]{0,180}(?:PR|pull request)[\s\S]{0,220}micronaut-guides|micronaut-guides[\s\S]{0,220}existing[\s\S]{0,180}(?:PR|pull request)/i, "Guide topic discovery should check existing micronaut-guides PRs.");
  assertContains(body, /assigned issue[\s\S]{0,220}(?:work in progress|avoid|do not create)|(?:work in progress|avoid|do not create)[\s\S]{0,220}assigned issue/i, "Guide topic discovery should treat assigned guide issues as work in progress.");
  assertContains(body, /PR/i, "Guide topic discovery should open or update PRs.");
});

test("Technical Writer has guide-routine and CI-skip guidance", async () => {
  const writerMarkdown = await read("../agents/technical-writer/AGENTS.md");
  const { frontmatter, body } = parseFrontmatter(writerMarkdown);

  assert.ok(frontmatter.skills.includes("guides"));
  assertContains(body, /Weekly User Guide Review/i, "Technical Writer should know the user guide review mode.");
  assertContains(body, /Weekly Guide Topic Discovery/i, "Technical Writer should know the guide topic discovery mode.");
  assertContains(body, /\.\/gradlew publishGuide/i, "Technical Writer should mention publishGuide.");
  assertContains(body, /throwaway (?:applications|apps|projects)/i, "Technical Writer should mention throwaway app fact-checking.");
  assertContains(body, /fact-check[\s\S]{0,160}proposed/i, "Technical Writer should fact-check proposed changes.");
  assertContains(body, /assigned issue[\s\S]{0,260}(?:work in progress|avoid|do not create)|(?:work in progress|avoid|do not create)[\s\S]{0,260}assigned issue/i, "Technical Writer should avoid duplicate guide work when assigned guide issues exist.");
  assertContains(body, /delta/i, "Technical Writer should mention delta review after the first run.");
  assertContains(body, /skip ci|\[skip ci\]/i, "Technical Writer should mention CI-skip guidance.");

  const skillMarkdown = await read("../skills/guides/SKILL.md");
  const { frontmatter: skillFrontmatter } = parseFrontmatter(skillMarkdown);
  const source = skillFrontmatter.metadata?.sources?.[0];

  assert.equal(skillFrontmatter.name, "guides");
  assert.equal(source?.repo, "micronaut-projects/micronaut-project-template");
  assert.equal(source?.path, ".agents/skills/guides/SKILL.md");
  assert.equal(source?.usage, "referenced");
});

test("docs-only CI skip guidance is documented in shared package surfaces", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const repoOperations = await read("../skills/micronaut-repo-operations/SKILL.md");

  for (const [label, markdown] of [
    ["README", readme],
    ["COMPANY", company],
    ["repo operations", repoOperations],
  ]) {
    assertContains(markdown, /skip ci|\[skip ci\]/i, `${label} should mention CI-skip keywords.`);
    assertContains(markdown, /documentation[\s\S]{0,220}(?:not exercised by the build|build does not exercise)|(?:not exercised by the build|build does not exercise)[\s\S]{0,220}documentation/i, `${label} should scope CI-skip guidance to docs not exercised by the build.`);
    assertContains(markdown, /(?:publishGuide|generated guides|executable examples|build-validated snippets)/i, `${label} should preserve validation for build-exercised docs.`);
  }
});
