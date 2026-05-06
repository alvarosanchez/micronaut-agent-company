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

test("Product Manager agent is configured for product discovery", async () => {
  const agentMarkdown = await read("../agents/product-manager/AGENTS.md");
  const { frontmatter, body } = parseFrontmatter(agentMarkdown);

  assert.equal(frontmatter.name, "Product Manager");
  assert.equal(frontmatter.role, "pm");
  assert.equal(frontmatter.title, "Product Manager");
  assert.equal(frontmatter.reportsTo, "ceo");
  assert.deepEqual(frontmatter.skills, [
    "micronaut-repo-operations",
    "docs",
    "gh-cli",
  ]);
  assert.equal(frontmatter.metadata?.paperclip?.agentIcon, "radar");
  assertContains(body, /market[\s\S]{0,160}competitor|competitor[\s\S]{0,160}market/i, "Product Manager instructions should mention market and competitor research.");
  assertContains(body, /direct(?:ly)?[\s\S]{0,180}GitHub issue|GitHub issue[\s\S]{0,180}direct(?:ly)?/i, "Product Manager instructions should require direct GitHub issue creation.");
  assertContains(body, /type: enhancement/i, "Product Manager instructions should mention type: enhancement.");
  assertContains(body, /acceptance criteria/i, "Product Manager instructions should include acceptance criteria guidance.");
  assertContains(body, /duplicate|deduplic/i, "Product Manager instructions should require duplicate checks.");
  assertContains(body, /outside the managed Micronaut-related boundary/i, "Product Manager instructions should record out-of-bound project skips.");
});

test("Daily Product Discovery routine is active and owned by Product Manager", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const adapter = extension.agents?.["product-manager"]?.adapter;
  const routine = extension.routines?.["daily-product-discovery"];
  const trigger = routine?.triggers?.[0];

  assert.equal(adapter?.type, "codex_local");
  assert.equal(adapter?.config?.model, "gpt-5.5");
  assert.equal(adapter?.config?.modelReasoningEffort, "high");
  assert.equal(adapter?.config?.search, true);
  assert.equal(adapter?.config?.dangerouslyBypassApprovalsAndSandbox, true);

  assert.equal(routine?.status, "active");
  assert.equal(trigger?.kind, "schedule");
  assert.equal(trigger?.label, "Daily Product Discovery");
  assert.equal(trigger?.cronExpression, "0 11 * * *");
  assert.equal(trigger?.timezone, "Europe/Madrid");

  const taskMarkdown = await read("../tasks/daily-product-discovery/TASK.md");
  const { frontmatter, body } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Daily Product Discovery");
  assert.equal(frontmatter.assignee, "product-manager");
  assert.equal(frontmatter.project, "company-operations");
  assert.equal(frontmatter.recurring, true);
  assertContains(body, /Micronaut-related Paperclip projects/i, "Daily Product Discovery task should mention Micronaut-related projects.");
  assertContains(body, /research[\s\S]{0,160}(?:market|competitor|framework|technolog)/i, "Daily Product Discovery task should require market, competitor, framework, or technology research.");
  assertContains(body, /create(?:s)?[\s\S]{0,180}GitHub issue[\s\S]{0,180}direct/i, "Daily Product Discovery task should require direct GitHub issue creation.");
  assertContains(body, /comprehensive[\s\S]{0,220}feature request|detailed[\s\S]{0,220}feature request/i, "Daily Product Discovery task should require comprehensive or detailed feature requests.");
  assertContains(body, /acceptance criteria/i, "Daily Product Discovery task should include acceptance criteria guidance.");
  assertContains(body, /duplicate|deduplic/i, "Daily Product Discovery task should require duplicate checks.");
});

test("Product Manager role and routine are documented", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const team = await read("../teams/engineering/TEAM.md");

  assertContains(readme, /Product Manager: `high`/, "README should document Product Manager high reasoning effort.");
  assertContains(readme, /\| Product Manager \| `radar` \|/, "README should document the Product Manager radar icon.");
  assertContains(readme, /\| Product Manager \| `pm` \|/, "README should document the Product Manager pm role.");
  assertContains(readme, /\| `Daily Product Discovery` \| Product Manager \| Every day at 11:00 `Europe\/Madrid` \|/, "README should document the Daily Product Discovery schedule.");
  assertContains(readme, /\| Product Manager \| Product Manager \| `ceo` \|/, "README should document Product Manager reporting to the CEO.");
  assertContains(readme, /research(?:es)?[\s\S]{0,160}(?:market|competitor|framework|technolog)[\s\S]{0,220}GitHub feature/i, "README should describe Product Manager research leading to GitHub features.");

  assertContains(company, /Product Manager/i, "COMPANY.md should mention the Product Manager.");
  assertContains(company, /Daily Product Discovery/i, "COMPANY.md should mention Daily Product Discovery.");
  assertContains(company, /direct GitHub feature request|GitHub feature requests directly/i, "COMPANY.md should describe direct GitHub feature requests.");

  assertContains(team, /agents\/product-manager\/AGENTS\.md/, "Engineering team docs should link the Product Manager agent file.");
  assertContains(team, /Product Manager|product discovery/i, "Engineering team docs should mention Product Manager or product discovery.");
});

test("Product Manager is covered by internal company maintenance routines", async () => {
  const trainingMarkdown = await read("../tasks/training/TASK.md");
  const { body: trainingBody } = parseFrontmatter(trainingMarkdown);
  const bootstrapMarkdown = await read("../tasks/verify-imported-company-instance/TASK.md");
  const { body: bootstrapBody } = parseFrontmatter(bootstrapMarkdown);

  assertContains(trainingBody, /Inspect every non-CEO agent:[\s\S]*Product Manager/i, "Training should inspect Product Manager as a non-CEO agent.");
  assertContains(bootstrapBody, /Product Manager[\s\S]{0,220}role `pm`[\s\S]{0,220}icon `radar`/i, "Bootstrap verification should check Product Manager role and icon.");
  assertContains(bootstrapBody, /Daily Product Discovery[\s\S]{0,120}active routine owned by `product-manager`/i, "Bootstrap verification should check the Daily Product Discovery routine.");
});
