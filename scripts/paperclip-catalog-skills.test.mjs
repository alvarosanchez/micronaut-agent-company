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

function assertIncludesAll(actual, expected, label) {
  for (const item of expected) {
    assert.ok(actual.includes(item), `${label} should include ${item}.`);
  }
}

const CATALOG_SKILLS = [
  {
    slug: "issue-triage",
    catalogId: "paperclipai:bundled:paperclip-operations:issue-triage",
    key: "paperclipai/bundled/paperclip-operations/issue-triage",
    kind: "bundled",
    category: "paperclip-operations",
    originHash: "sha256:88dc13560371fb364963782cb4f6eeb4090fcde92ee3774479428ed6b90e11c1",
    phrase: /# Issue Triage/i,
    override: /Do \*\*not\*\* close a synced GitHub issue with a one-line reason|evidence-rich GitHub closure path/i,
  },
  {
    slug: "task-planning",
    catalogId: "paperclipai:bundled:paperclip-operations:task-planning",
    key: "paperclipai/bundled/paperclip-operations/task-planning",
    kind: "bundled",
    category: "paperclip-operations",
    originHash: "sha256:4fb46a4bcefad4fd46fae48c433ee497112509a8e19fb8a7745ead44d219b498",
    phrase: /# Task Planning/i,
    override: /not the same as Paperclip `workMode: planning`|standard work mode/i,
  },
  {
    slug: "qa-acceptance",
    catalogId: "paperclipai:bundled:quality:qa-acceptance",
    key: "paperclipai/bundled/quality/qa-acceptance",
    kind: "bundled",
    category: "quality",
    originHash: "sha256:32372dacaf62e93454b9855968c4eec96456ba78b509f450b3dfaa48e31ef356",
    phrase: /# QA Acceptance/i,
    override: /QA Engineer owns the acceptance decision|durable and reviewer-visible/i,
  },
  {
    slug: "github-pr-workflow",
    catalogId: "paperclipai:bundled:software-development:github-pr-workflow",
    key: "paperclipai/bundled/software-development/github-pr-workflow",
    kind: "bundled",
    category: "software-development",
    originHash: "sha256:90f278c89aa0711be150c1cd2456ca25620d02f36995b113ca9837d756a37f6c",
    phrase: /# GitHub Pull Request Workflow/i,
    override: /Code Reviewer creates the PR only after QA and Security Engineer approval|Out-of-pipeline PRs/i,
  },
  {
    slug: "doc-maintenance",
    catalogId: "paperclipai:bundled:docs:doc-maintenance",
    key: "paperclipai/bundled/docs/doc-maintenance",
    kind: "bundled",
    category: "docs",
    originHash: "sha256:2e02299210fd17c1fe1867b4ee8c144a11b6fe1fe481f83b8268cfbaaf10f9aa",
    phrase: /# Doc Maintenance/i,
    override: /Micronaut `docs` and `guides` skills|minimum-churn documentation updates/i,
  },
];

const AGENT_ASSIGNMENTS = {
  ceo: ["issue-triage", "task-planning", "github-pr-workflow"],
  architect: ["task-planning", "qa-acceptance"],
  "product-manager": ["qa-acceptance", "task-planning"],
  "qa-engineer": ["qa-acceptance"],
  "micronaut-engineer": ["github-pr-workflow", "doc-maintenance"],
  "code-reviewer": ["github-pr-workflow", "doc-maintenance"],
  "technical-writer": ["doc-maintenance", "github-pr-workflow"],
};

test("selected Paperclip catalog skills ship with catalog provenance and usable bodies", async () => {
  for (const expected of CATALOG_SKILLS) {
    const markdown = await read(`../skills/${expected.slug}/SKILL.md`);
    const { frontmatter, body } = parseFrontmatter(markdown);
    const catalog = frontmatter.metadata?.paperclip?.catalog;

    assert.equal(frontmatter.name, expected.slug);
    assert.equal(frontmatter.key, expected.key);
    assert.equal(catalog?.skillKey, expected.key);
    assert.equal(catalog?.catalogId, expected.catalogId);
    assert.equal(catalog?.catalogKey, expected.key);
    assert.equal(catalog?.catalogKind, expected.kind);
    assert.equal(catalog?.catalogCategory, expected.category);
    assert.equal(catalog?.catalogPath.endsWith(`/${expected.slug}`), true);
    assert.equal(catalog?.packageName, "@paperclipai/skills-catalog");
    assert.equal(String(catalog?.packageVersion), "0.3.1");
    assert.equal(catalog?.originHash, expected.originHash);
    assert.equal(catalog?.sourceRef, expected.originHash);

    assert.match(body, /## Micronaut Agent Company usage notes/);
    assert.match(body, expected.phrase);
    assert.match(body, expected.override);
    assert.ok(body.length > 1500, `${expected.slug} should preserve substantial catalog body content.`);
  }
});

test("package agents reference the adopted Paperclip catalog skills", async () => {
  for (const [agentSlug, expectedSkills] of Object.entries(AGENT_ASSIGNMENTS)) {
    const markdown = await read(`../agents/${agentSlug}/AGENTS.md`);
    const { frontmatter } = parseFrontmatter(markdown);
    assert.ok(Array.isArray(frontmatter.skills), `${agentSlug} should declare skills.`);
    assertIncludesAll(frontmatter.skills, expectedSkills, agentSlug);
  }
});

test("documentation and bootstrap verification describe catalog-skill adoption", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const bootstrap = await read("../tasks/verify-imported-company-instance/TASK.md");

  assert.match(readme, /## Paperclip Catalog Skills/);
  assert.match(readme, /metadata\.paperclip\.catalog/);
  assert.match(readme, /Skills Store/i);
  assert.match(company, /selected Paperclip 2026\.618 Skills Store catalog skills with provenance/i);
  assert.match(company, /must not weaken QA's GitHub-backed closure evidence/i);
  assert.match(bootstrap, /`issue-triage`, `task-planning`, `qa-acceptance`, `github-pr-workflow`, and `doc-maintenance`/);

  for (const { slug } of CATALOG_SKILLS) {
    assert.match(readme, new RegExp(`\\${slug}\\`.replace(/\u007f/g, "`")));
  }
});
