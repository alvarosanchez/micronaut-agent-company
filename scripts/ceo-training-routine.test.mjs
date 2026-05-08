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

test("CEO Training discovers technology skills from execution history", async () => {
  const taskMarkdown = await readFile(new URL("../tasks/training/TASK.md", import.meta.url), "utf8");
  const { body } = parseFrontmatter(taskMarkdown);
  const ceoMarkdown = await readFile(new URL("../agents/ceo/AGENTS.md", import.meta.url), "utf8");
  const { body: ceoBody } = parseFrontmatter(ceoMarkdown);
  const architectMarkdown = await readFile(new URL("../agents/architect/AGENTS.md", import.meta.url), "utf8");
  const { frontmatter: architectFrontmatter, body: architectBody } = parseFrontmatter(architectMarkdown);
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const company = await readFile(new URL("../COMPANY.md", import.meta.url), "utf8");

  for (const [label, markdown] of [
    ["Training task", body],
    ["CEO instructions", ceoBody],
  ]) {
    assert.match(
      markdown,
      /(?:technology|domain|stack|tool|library|service)[\s\S]{0,240}(?:Elasticsearch|search engine|database|message broker|cloud service|framework)/i,
      `${label} should focus Training on technology and domain skill gaps from real work.`,
    );
    assert.match(
      markdown,
      /past executions[\s\S]{0,360}(?:technology|domain|stack|tool|library|service)|(?:technology|domain|stack|tool|library|service)[\s\S]{0,360}past executions/i,
      `${label} should derive skill needs from previous executions.`,
    );
    assert.match(
      markdown,
      /(?:board proposal|linked board approval request)[\s\S]{0,360}(?:exact https:\/\/skills\.sh entry|skills\.sh)[\s\S]{0,360}(?:target agent|target agents)/i,
      `${label} should route existing external skill additions through board approval.`,
    );
    assert.match(
      markdown,
      /(?:no suitable|no existing)[\s\S]{0,260}(?:skill|skills\.sh)[\s\S]{0,360}(?:recurring|repeated)[\s\S]{0,360}(?:subtask|child issue)[\s\S]{0,240}Architect[\s\S]{0,360}(?:new company skill|company-owned skill|skill creation)[\s\S]{0,360}(?:PR|pull request)[\s\S]{0,260}company package/i,
      `${label} should route recurring gaps without an existing skill to Architect for a company-package skill PR.`,
    );
    assert.match(
      markdown,
      /(?:subtask|child issue)[\s\S]{0,300}(?:assigned to Architect|Architect)[\s\S]{0,300}(?:status `backlog`|`backlog`|in backlog|status: backlog)|(?:subtask|child issue)[\s\S]{0,300}(?:status `backlog`|`backlog`|in backlog|status: backlog)[\s\S]{0,300}(?:assigned to Architect|Architect)|(?:status `backlog`|`backlog`|in backlog|status: backlog)[\s\S]{0,300}(?:subtask|child issue)[\s\S]{0,300}(?:assigned to Architect|Architect)/i,
      `${label} should put Architect skill-creation issues in backlog.`,
    );
    assert.doesNotMatch(
      markdown,
      /slow GitHub or Paperclip workflows|Paperclip usage performance|Paperclip usage gaps/i,
      `${label} should not frame Training as Paperclip workflow performance tuning.`,
    );
  }

  assert.match(
    readme,
    /Training[\s\S]{0,360}(?:technology|domain|stack|tool)[\s\S]{0,360}(?:skills\.sh|board approval)/i,
    "README should document Training as technology-skill discovery.",
  );
  assert.match(
    company,
    /Training routine[\s\S]{0,420}(?:technology|domain|stack|tool)[\s\S]{0,420}Architect[\s\S]{0,420}(?:PR|pull request)[\s\S]{0,260}company package/i,
    "COMPANY.md should document Architect-owned new-skill creation when no external skill exists.",
  );
  assert.ok(architectFrontmatter.skills.includes("skill-creator"));
  assert.match(
    architectBody,
    /CEO Training[\s\S]{0,360}(?:subtask|child issue)[\s\S]{0,360}(?:status `backlog`|`backlog`|in backlog|status: backlog)[\s\S]{0,360}(?:new company skill|company-owned skill|skill creation)[\s\S]{0,360}(?:PR|pull request)[\s\S]{0,260}company package/i,
    "Architect should accept CEO Training subtasks for new company-skill PRs.",
  );
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
