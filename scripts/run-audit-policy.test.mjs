import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("control-plane skill documents the docs command, the run environment, and the write recipe", async () => {
  const skill = await read("../skills/paperclip-control-plane/SKILL.md");
  assert.match(skill, /paperclip-workflow\.mjs docs --issue "\$PAPERCLIP_TASK_ID" --dir/);
  assert.match(skill, /addressed by `key`[\s\S]{0,120}never by document id/);
  assert.match(skill, /never paste the key into a command/);
  assert.match(skill, /PUT \/api\/issues\/\{id\}\/documents\/\{key\}[\s\S]{0,400}baseRevisionId/);
  assert.match(skill, /PATCH \/api\/issues\/\{id\}[\s\S]{0,80}"status": "done", "comment"/);
  assert.match(skill, /POST \/api\/issues\/\{id\}\/comments/);
  assert.match(skill, /draft artifacts here, never inside the repository worktree/i);
});

test("implementation hygiene reference covers branch sync, build flags, commit hygiene and security mapping", async () => {
  const hygiene = await read("../skills/micronaut-repo-operations/references/implementation-hygiene.md");
  const router = await read("../skills/micronaut-repo-operations/SKILL.md");
  assert.match(router, /references\/implementation-hygiene\.md/);
  assert.match(hygiene, /git log origin\/<target>\.\.HEAD[\s\S]{0,120}git reset --hard origin\/<target>/);
  assert.match(hygiene, /never `-o`/);
  assert.match(hygiene, /-Dsurefire\.failIfNoSpecifiedTests=false/);
  assert.match(hygiene, /never `git add -A` or `git add \.`/);
  assert.match(hygiene, /no `\.claude\/`/);
  assert.match(hygiene, /Never call `api\.github\.com`/);
  assert.match(hygiene, /cites a successful tool result/);
  assert.match(hygiene, /publication-manifest` restates each one with the file and line/);
  assert.match(hygiene, /in the background[\s\S]{0,120}poll the log/);
});

test("engineer and delivery guidance prefer reset over rebase when the worktree has no own commits", async () => {
  const engineer = await read("../agents/micronaut-engineer/AGENTS.md");
  const delivery = await read("../skills/micronaut-repo-operations/references/pr-delivery-evidence.md");
  assert.match(engineer, /with no own commits `git reset --hard origin\/<target>`, otherwise rebase/);
  assert.match(delivery, /with no own commits `git reset --hard origin\/<target>`[\s\S]{0,200}otherwise rebase/);
});

test("shared GitHub skill forbids direct api.github.com calls and names the default-branch recipe", async () => {
  const github = await read("../skills/micronaut-github-operations/SKILL.md");
  assert.match(github, /direct `api\.github\.com` calls \(curl, scripts\)/);
  assert.match(github, /git symbolic-ref refs\/remotes\/origin\/HEAD/);
});

test("plan documents carry a size budget and an Engineer TL;DR", async () => {
  const controlPlane = await read("../skills/micronaut-repo-operations/references/workflow-control-plane.md");
  assert.match(controlPlane, /`plan` document at or under 12 KB[\s\S]{0,200}Engineer TL;DR of at most 15 lines/);
});
