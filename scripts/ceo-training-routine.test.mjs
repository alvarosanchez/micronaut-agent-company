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

test("CEO Training routine runs every other day", async () => {
  const source = await readFile(new URL("../.paperclip.yaml", import.meta.url), "utf8");
  const config = YAML.parse(source);
  const trigger = config.routines?.training?.triggers?.[0];

  assert.ok(trigger, "Expected training routine trigger.");
  assert.equal(config.routines.training.status, "active");
  assert.equal(trigger.label, "Training");
  assert.equal(trigger.cronExpression, "0 2 */2 * *");
  assert.equal(trigger.timezone, "Europe/Madrid");

  const taskMarkdown = await readFile(new URL("../tasks/training/TASK.md", import.meta.url), "utf8");
  const { frontmatter, body } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Training");
  assert.equal(frontmatter.assignee, "ceo");
  assert.equal(frontmatter.project, "company-operations");
  assert.equal(frontmatter.recurring, true);
  assert.match(body, /other agents[\s\S]{0,120}past executions/i);
  assert.match(body, /since the last (?:Training )?pass/i);
  assert.match(body, /skills\.sh/i);
  assert.match(body, /linked board approval request/i);
  assert.match(body, /approved[\s\S]{0,200}company skill/i);
  assert.match(body, /link(?:ed)? it to the agent|agent[\s\S]{0,120}skill assignment/i);
});

test("CEO has the referenced skills.sh find-skills capability", async () => {
  const ceoMarkdown = await readFile(new URL("../agents/ceo/AGENTS.md", import.meta.url), "utf8");
  const { frontmatter: ceoFrontmatter, body: ceoBody } = parseFrontmatter(ceoMarkdown);

  assert.ok(ceoFrontmatter.skills.includes("find-skills"));
  assert.match(ceoBody, /Training routine/i);

  const skillMarkdown = await readFile(new URL("../skills/find-skills/SKILL.md", import.meta.url), "utf8");
  const { frontmatter } = parseFrontmatter(skillMarkdown);
  const source = frontmatter.metadata?.sources?.[0];

  assert.equal(frontmatter.name, "find-skills");
  assert.match(frontmatter.description, /referenced marketplace skill/i);
  assert.equal(source?.kind, "url");
  assert.equal(source?.url, "https://skills.sh/vercel-labs/skills/find-skills");
  assert.equal(source?.usage, "referenced");
});
