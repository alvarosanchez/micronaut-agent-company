import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

import YAML from "yaml";

const ROOT = new URL("../", import.meta.url);
const AGENTS = [
  "ceo",
  "product-manager",
  "architect",
  "qa-engineer",
  "security-engineer",
  "micronaut-engineer",
  "code-reviewer",
  "technical-writer",
];

async function read(relativePath) {
  return readFile(new URL(relativePath, ROOT), "utf8");
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test("agent instructions delegate shared GitHub policy instead of repeating it", async () => {
  const forbiddenSharedCopies = [
    "Compact reminder: use GitHub Sync plugin agent tools",
    "Explicit non-plugin maintainer-visible GitHub writes need the shared GitHub-flavored Markdown footer",
    "Do not use Paperclip issue monitors for GitHub-synced PR state",
  ];

  let totalBytes = 0;
  for (const slug of AGENTS) {
    const markdown = await read(`agents/${slug}/AGENTS.md`);
    totalBytes += Buffer.byteLength(markdown);
    assert.match(markdown, /Apply the shared `micronaut-github-operations` skill/);
    for (const duplicate of forbiddenSharedCopies) {
      assert.doesNotMatch(markdown, new RegExp(duplicate, "i"), `${slug} must not copy shared GitHub policy inline.`);
    }
  }

  assert.ok(totalBytes <= 125_000, `Agent instruction budget exceeded: ${totalBytes} bytes.`);
});

test("agent instructions include concise model-specific operating guidance", async () => {
  const expected = {
    ceo: /GPT-5\.6 Terra operating profile[\s\S]{0,500}batch|batch[\s\S]{0,500}GPT-5\.6 Terra operating profile/i,
    "product-manager": /GPT-5\.6 Terra operating profile[\s\S]{0,500}(compare|evidence)/i,
    architect: /GPT-5\.6 Sol operating profile[\s\S]{0,500}(hypoth|CodeGraph|call path)/i,
    "qa-engineer": /GPT-5\.6 Terra operating profile[\s\S]{0,500}(batch|decision table|matrix)/i,
    "security-engineer": /GPT-5\.6 Sol operating profile[\s\S]{0,500}(exploit|hypoth|call path)/i,
    "micronaut-engineer": /GPT-5\.6 Sol operating profile[\s\S]{0,500}(CodeGraph|call path|hypoth)/i,
    "code-reviewer": /GPT-5\.6 Sol operating profile[\s\S]{0,500}(complete review|call path|hypoth)/i,
    "technical-writer": /GPT-5\.6 Luna operating profile[\s\S]{0,500}(verified|concise|bounded)/i,
  };

  for (const [slug, pattern] of Object.entries(expected)) {
    assert.match(await read(`agents/${slug}/AGENTS.md`), pattern, `${slug} needs model-specific operating guidance.`);
  }
});

test("shared repo operations stays compact and protects the cheap profile boundary", async () => {
  const skill = await read("skills/micronaut-repo-operations/SKILL.md");
  assert.ok(Buffer.byteLength(skill) <= 9_000, `Always-loaded repo operations skill is too large: ${Buffer.byteLength(skill)} bytes.`);
  assert.match(skill, /The `cheap` profile[\s\S]{0,500}must not approve or reject a stage/i);
  assert.match(skill, /load the matching reference/i);
});

test("routine instructions use canonical monthly routine keys", async () => {
  const paths = [
    "agents/product-manager/AGENTS.md",
    "agents/security-engineer/AGENTS.md",
    "agents/technical-writer/AGENTS.md",
    "skills/product-discovery/SKILL.md",
    "skills/micronaut-security-review/SKILL.md",
    "tasks/verify-imported-company-instance/TASK.md",
    "tasks/monthly-product-discovery/TASK.md",
    "tasks/monthly-user-guide-review/TASK.md",
    "tasks/monthly-guide-topic-discovery/TASK.md",
  ];
  const staleCadence = /Weekly (?:Product Discovery|Security Deep Scan|User Guide Review|Guide Topic Discovery)|Daily CEO Self-Improvement|weekly deep-scan/i;
  for (const relativePath of paths) {
    assert.doesNotMatch(await read(relativePath), staleCadence, `${relativePath} contains stale cadence terminology.`);
  }
});

test("GitHub attribution literals match each agent's configured primary model", async () => {
  const extension = YAML.parse(await read(".paperclip.yaml"));
  for (const slug of AGENTS) {
    const markdown = await read(`agents/${slug}/AGENTS.md`);
    const literals = [...markdown.matchAll(/llmModel:\s*(gpt-[\w.-]+)/g)].map((match) => match[1]);
    for (const literal of literals) {
      assert.equal(literal, extension.agents[slug].adapter.config.model, `${slug} attribution model drifted.`);
    }
  }
});

test("repo operations ships a deterministic JSON evidence collector", async () => {
  const skill = await read("skills/micronaut-repo-operations/SKILL.md");
  assert.match(skill, /scripts\/repo-evidence\.mjs/);
  assert.match(skill, /machine-readable JSON/i);

  const fixture = await mkdtemp(path.join(tmpdir(), "repo-evidence-"));
  try {
    run("git", ["init", "-q"], fixture);
    run("git", ["config", "user.name", "Test User"], fixture);
    run("git", ["config", "user.email", "test@example.invalid"], fixture);
    await writeFile(path.join(fixture, "README.md"), "initial\n");
    await mkdir(path.join(fixture, "src"));
    await writeFile(path.join(fixture, "src", "App.java"), "class App {}\n");
    run("git", ["add", "."], fixture);
    run("git", ["commit", "-qm", "initial"], fixture);
    const baseCommit = run("git", ["rev-parse", "HEAD"], fixture).trim();
    await writeFile(path.join(fixture, "src", "App.java"), "class App { int value; }\n");
    run("git", ["add", "src/App.java"], fixture);
    run("git", ["commit", "-qm", "change app"], fixture);
    await writeFile(path.join(fixture, "src", "App.java"), "class App { int value; int other; }\n");
    await writeFile(path.join(fixture, "build.gradle"), "plugins { id 'java' }\n");

    const scriptPath = new URL("skills/micronaut-repo-operations/scripts/repo-evidence.mjs", ROOT);
    const output = run(process.execPath, [scriptPath.pathname, "--base", baseCommit], fixture);
    const report = JSON.parse(output);

    assert.equal(report.schemaVersion, 1);
    assert.equal(report.repository.root, fixture);
    assert.equal(report.git.head, run("git", ["rev-parse", "HEAD"], fixture).trim());
    assert.equal(report.base.ref, baseCommit);
    assert.equal(report.base.ahead, 1);
    assert.ok(report.base.committedChanges.some((entry) => entry.path === "src/App.java" && entry.status === "M"));
    assert.ok(report.changes.some((entry) => entry.path === "src/App.java" && entry.worktree !== " "));
    assert.ok(report.changes.some((entry) => entry.path === "build.gradle" && entry.untracked));
    assert.ok(report.projectMarkers.includes("build.gradle"));
    assert.deepEqual(report.errors, []);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
