import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const execFileAsync = promisify(execFile);
const ROOT = fileURLToPath(new URL("../", import.meta.url));

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

async function pathExists(relativePath) {
  try {
    await access(new URL(relativePath, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

async function markdownFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, root);
    if (entry.isDirectory()) files.push(...await markdownFiles(url));
    else if (entry.name.endsWith(".md")) files.push(url);
  }
  return files;
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

function documentedAssignments(readme, skill) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const row = readme.match(new RegExp("^\\| `" + escaped + "` \\| ([^|]+) \\|", "m"));
  assert.ok(row, `README must document assignments for ${skill}`);
  return row[1].split(",").map((name) => name.trim()).sort();
}

function documentedSkills(readme) {
  const inventory = readme.match(/## Paperclip Catalog Skills\n([\s\S]*?)\n## First Run/);
  assert.ok(inventory, "README must contain the complete skill assignment inventory");
  return [...inventory[1].matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
}

function assertAssignmentParity(readme, frontmatterByAgent) {
  for (const skill of documentedSkills(readme)) {
    const expected = Object.entries(AGENT_DISPLAY_NAMES)
      .filter(([agentSlug]) => frontmatterByAgent.get(agentSlug).includes(skill))
      .map(([, displayName]) => displayName)
      .sort();
    assert.deepEqual(documentedAssignments(readme, skill), expected, `${skill} README assignments must match frontmatter`);
  }
}

const CATALOG_SKILLS = [
  {
    slug: "issue-triage",
    key: "paperclipai/bundled/paperclip-operations/issue-triage",
  },
  {
    slug: "task-planning",
    key: "paperclipai/bundled/paperclip-operations/task-planning",
  },
  {
    slug: "qa-acceptance",
    key: "paperclipai/bundled/quality/qa-acceptance",
  },
  {
    slug: "github-pr-workflow",
    key: "paperclipai/bundled/software-development/github-pr-workflow",
  },
  {
    slug: "doc-maintenance",
    key: "paperclipai/bundled/docs/doc-maintenance",
  },
  {
    slug: "agent-browser",
    key: "paperclipai/optional/browser/agent-browser",
  },
];

const keyBySlug = new Map(CATALOG_SKILLS.map((skill) => [skill.slug, skill.key]));

const AGENT_ASSIGNMENTS = {
  ceo: [
    "paperclipai/bundled/paperclip-operations/issue-triage",
    "paperclipai/bundled/paperclip-operations/task-planning",
  ],
  architect: [
    "paperclipai/bundled/paperclip-operations/task-planning",
    "paperclipai/bundled/quality/qa-acceptance",
  ],
  "product-manager": [
    "paperclipai/bundled/quality/qa-acceptance",
    "paperclipai/bundled/paperclip-operations/task-planning",
    "paperclipai/optional/browser/agent-browser",
  ],
  "qa-engineer": [
    "paperclipai/bundled/quality/qa-acceptance",
    "paperclipai/bundled/paperclip-operations/issue-triage",
    "paperclipai/optional/browser/agent-browser",
  ],
  "micronaut-engineer": [
    "paperclipai/bundled/software-development/github-pr-workflow",
    "paperclipai/bundled/docs/doc-maintenance",
    "paperclipai/optional/browser/agent-browser",
  ],
  "code-reviewer": ["paperclipai/optional/browser/agent-browser"],
  "technical-writer": [
    "paperclipai/bundled/docs/doc-maintenance",
    "paperclipai/bundled/software-development/github-pr-workflow",
    "paperclipai/optional/browser/agent-browser",
  ],
};

const AGENT_DISPLAY_NAMES = {
  ceo: "CEO",
  architect: "Architect",
  "product-manager": "Product Manager",
  "qa-engineer": "QA Engineer",
  "security-engineer": "Security Engineer",
  "code-reviewer": "Code Reviewer",
  "micronaut-engineer": "Micronaut Engineer",
  "technical-writer": "Technical Writer",
};

test("Paperclip catalog skills are granted by key without vendoring catalog bodies", async () => {
  for (const { slug } of CATALOG_SKILLS) {
    assert.equal(
      await pathExists(`../skills/${slug}/SKILL.md`),
      false,
      `${slug} should be installed from the Paperclip Skills Store, not duplicated in this package.`,
    );
  }
});

test("package agents reference the adopted Paperclip catalog skill keys", async () => {
  for (const [agentSlug, expectedSkills] of Object.entries(AGENT_ASSIGNMENTS)) {
    const markdown = await read(`../agents/${agentSlug}/AGENTS.md`);
    const { frontmatter, body } = parseFrontmatter(markdown);
    assert.ok(Array.isArray(frontmatter.skills), `${agentSlug} should declare skills.`);
    assertIncludesAll(frontmatter.skills, expectedSkills, agentSlug);
    assert.deepEqual(
      frontmatter.skills.filter((skill) => skill.startsWith("paperclipai/")).sort(),
      [...expectedSkills].sort(),
      `${agentSlug} must use exactly the reviewed catalog grant set.`,
    );
    for (const { slug } of CATALOG_SKILLS) {
      assert.ok(!frontmatter.skills.includes(slug), `${agentSlug} should use the full catalog key for ${slug}, not the local slug.`);
    }
    if (expectedSkills.length > 0) {
      assert.match(body, /## Catalog Skill Guardrails/, `${agentSlug} should keep Micronaut-specific catalog-skill corrections in agent instructions.`);
    }
  }
});

test("all imported roles resolve the shared control-plane script from the skill inventory", async () => {
  for (const agentSlug of Object.keys(AGENT_DISPLAY_NAMES)) {
    const markdown = await read(`../agents/${agentSlug}/AGENTS.md`);
    const { frontmatter, body } = parseFrontmatter(markdown);
    assert.ok(frontmatter.skills.includes("paperclip-control-plane"), `${agentSlug} must import the narrow control-plane skill`);
    assert.match(body, /<paperclip-control-plane-skill-directory>\/scripts\/paperclip-workflow\.mjs/);
    assert.doesNotMatch(body, /node skills\/paperclip-control-plane\/scripts\/paperclip-workflow\.mjs/);
  }
});

test("CEO collector callers resolve the imported skill directory", async () => {
  for (const relativePath of ["../skills/ceo-issue-history/SKILL.md", "../tasks/monthly-ceo-self-improvement/TASK.md"]) {
    const markdown = await read(relativePath);
    assert.match(markdown, /<ceo-issue-history-skill-directory>\/scripts\/issue-history-evidence\.mjs/);
    assert.doesNotMatch(markdown, /node skills\/ceo-issue-history\/scripts\/issue-history-evidence\.mjs/);
  }
});

test("automation audit covers the derived Markdown corpus and exact CLI surface", async () => {
  const agentFiles = await markdownFiles(new URL("../agents/", import.meta.url));
  const skillFiles = await markdownFiles(new URL("../skills/", import.meta.url));
  const audit = await read("../skills/paperclip-control-plane/references/instruction-automation-audit.md");
  const script = await read("../skills/paperclip-control-plane/scripts/paperclip-workflow.mjs");

  assert.equal(agentFiles.filter((file) => file.pathname.endsWith("/AGENTS.md")).length, 8);
  assert.equal(skillFiles.length, 25);
  assert.match(audit, /all 8 `agents\/\*\/AGENTS\.md` files and all 25 package-owned Markdown files under `skills\/`[\s\S]{0,120}33 instruction\/skill Markdown files total/i);
  for (const command of ["snapshot", "verify", "approval-link"]) {
    assert.match(audit, new RegExp("\\| `" + command + "` \\|"));
    assert.match(script, new RegExp(`args\\.command === "${command}"`));
  }
  assert.doesNotMatch(audit, /\| `transition` \|/);
  assert.doesNotMatch(audit, /\| `put-document` \|/);
  assert.doesNotMatch(script, /args\.command === "transition"/);
  assert.doesNotMatch(script, /args\.command === "put-document"/);
});

test("all tracked normative Markdown uses the shared deterministic control-plane boundary", async () => {
  const { stdout } = await execFileAsync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" });
  const forbidden = /GET \/api\/approvals\/\{approvalId\}\/issues|GET \/api\/issues\/\{issueId\}\/documents|PUT \/api\/issues\/\{issueId\}\/documents|\bput-document\b|guarded stage transitions?|stage REST operations/i;
  const violations = [];
  for (const relativePath of stdout.trim().split("\n").filter(Boolean)) {
    const markdown = await readFile(path.join(ROOT, relativePath), "utf8");
    if (forbidden.test(markdown)) violations.push(relativePath);
  }
  assert.deepEqual(violations, []);
});

test("README skill assignment tables match exact package agent frontmatter", async () => {
  const readme = await read("../README.md");
  const frontmatterByAgent = new Map();
  for (const agentSlug of Object.keys(AGENT_DISPLAY_NAMES)) {
    const { frontmatter } = parseFrontmatter(await read(`../agents/${agentSlug}/AGENTS.md`));
    frontmatterByAgent.set(agentSlug, frontmatter.skills ?? []);
  }

  assertAssignmentParity(readme, frontmatterByAgent);
  const staleFixture = readme.replace(
    "| `coding` | Architect, Code Reviewer, Micronaut Engineer, Security Engineer |",
    "| `coding` | Architect, CEO, Code Reviewer, Micronaut Engineer, Security Engineer |",
  );
  assert.notEqual(staleFixture, readme, "negative assignment fixture must modify a documented row");
  assert.throws(() => assertAssignmentParity(staleFixture, frontmatterByAgent), /coding README assignments must match frontmatter/);
});

test("agent instructions carry Micronaut-specific catalog-skill guardrails", async () => {
  const qa = await read("../agents/qa-engineer/AGENTS.md");
  assert.match(qa, /issue-triage[\s\S]*detailed evidence-rich closure comments/i);
  assert.match(qa, /agent-browser[\s\S]*bounded browser-backed verification/i);

  const architect = await read("../agents/architect/AGENTS.md");
  assert.match(architect, /task-planning[\s\S]*standard work mode/i);
  assert.match(architect, /qa-acceptance[\s\S]*QA Engineer can verify independently/i);

  const codeReviewer = await read("../agents/code-reviewer/AGENTS.md");
  const { frontmatter: codeReviewerFrontmatter } = parseFrontmatter(codeReviewer);
  assert.ok(!codeReviewerFrontmatter.skills.includes("paperclipai/bundled/software-development/github-pr-workflow"));
  assert.ok(!codeReviewerFrontmatter.skills.includes("paperclipai/bundled/docs/doc-maintenance"));
  assert.doesNotMatch(codeReviewer, /Use `github-pr-workflow`/i);
  assert.doesNotMatch(codeReviewer, /Use `doc-maintenance`/i);

  const productManager = await read("../agents/product-manager/AGENTS.md");
  assert.match(productManager, /agent-browser[\s\S]*not use it for unattended scraping/i);
});

test("documentation and bootstrap verification describe non-vendored catalog-skill grants", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const bootstrap = await read("../tasks/verify-imported-company-instance/TASK.md");

  assert.match(readme, /## Paperclip Catalog Skills/);
  assert.match(readme, /not vendored source-package skills/i);
  assert.match(readme, /install the catalog skills from the Skills Store/i);
  assert.match(readme, /preserves the desired grants but reports those runtime skills as missing/i);
  assert.match(company, /catalog skill grants/i);
  assert.match(company, /without vendoring their bodies/i);
  assert.match(company, /Micronaut-specific workflow overrides in the agent instructions/i);
  assert.match(bootstrap, /grants the expected agents the Paperclip catalog skill keys/i);
  assert.match(bootstrap, /move from missing to configured without vendoring catalog skill bodies/i);

  for (const { slug, key } of CATALOG_SKILLS) {
    assert.match(readme, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.ok(keyBySlug.get(slug), `missing test fixture for ${slug}`);
  }
});
