import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));

async function trackedMarkdown() {
  const result = spawnSync("git", ["ls-files", "*.md"], { cwd: REPO_ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split("\n").filter(Boolean);
}

const PAPERCLIP_RELEASE_UNDER_TEST = "2026.916.1";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("package pins the 2026.916.0 runtime and states the ACP permission mode", async () => {
  const packageJson = JSON.parse(await read("../package.json"));
  const extension = YAML.parse(await read("../.paperclip.yaml"));

  assert.equal(packageJson.devDependencies.paperclipai, PAPERCLIP_RELEASE_UNDER_TEST);

  for (const [slug, agent] of Object.entries(extension.agents ?? {})) {
    if (agent?.adapter?.type !== "claude_local") continue;
    assert.equal(
      agent.adapter.config.permissionMode,
      "approve-all",
      `${slug} must state permissionMode explicitly: 2026.916.0 claude_local is ACP-only and ignores dangerouslySkipPermissions.`,
    );
  }
});

test("docs record that engine: auto no longer falls back to the Claude CLI lane", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");

  assert.match(readme, /2026\.916\.0[\s\S]{0,200}removed that fallback/i);
  assert.match(company, /`engine: auto`[\s\S]{0,160}no CLI fallback/i);
  assert.doesNotMatch(readme, /otherwise the CLI lane/i);
  assert.doesNotMatch(company, /ACP preferred, CLI fallback/i);
});

test("parking an issue in in_review always names a human review path", async () => {
  const controlPlane = await read("../skills/micronaut-repo-operations/references/workflow-control-plane.md");

  assert.match(
    controlPlane,
    /invalid_issue_disposition[\s\S]{0,200}review_path/,
    "the control plane must name the host error an agent gets when it parks in_review with no review path.",
  );
  assert.match(
    controlPlane,
    /assigneeAgentId: null[\s\S]{0,160}assigneeUserId[\s\S]{0,120}responsibleUserId/,
    "the control plane must define parking as no agent assignee plus the issue's responsible user.",
  );
  assert.match(
    controlPlane,
    /without a `comment`/,
    "parking must be a silent PATCH so it does not wake anyone.",
  );

  // No role, task, or skill may still tell an agent to park an issue with nobody on it.
  // The check is deliberately blunt: any sentence that puts "maintainer wait" and
  // "unassigned" near each other contradicts the parking contract, whatever its phrasing.
  // `todo` legitimately may be unassigned, so only maintainer-wait prose is in scope.
  const parkingSurfaces = (await trackedMarkdown()).filter(
    (path) => !path.startsWith("docs/superpowers/"),
  );
  for (const relativePath of parkingSurfaces) {
    const markdown = await read(`../${relativePath}`);
    for (const line of markdown.split("\n")) {
      // "`todo` may be assigned or unassigned" is still true and may share a line with
      // `in_review`, so only flag "unassigned" tied to maintainer wait or to parking.
      const contradictions = [
        /maintainer wait[^.!?]{0,200}unassigned|unassigned[^.!?]{0,200}maintainer wait/i,
        /`?in_review`?[^.!?]{0,40}unassigned|unassigned[^.!?]{0,40}`?in_review`?/i,
        /`?IN_REVIEW`?[^.!?]{0,40}unassigned|unassigned[^.!?]{0,40}`?IN_REVIEW`?/,
        /park(?:s|ed|ing)?[^.!?]{0,60}unassigned/i,
      ];
      for (const contradiction of contradictions) {
        assert.doesNotMatch(
          line,
          contradiction,
          `${relativePath} must not describe maintainer wait as an unassigned issue: ${line.slice(0, 200)}`,
        );
      }
    }
  }
});

test("conversation mode is documented and scoped to conversation issues only", async () => {
  const company = await read("../COMPANY.md");

  assert.match(company, /## Conversation Mode \(Agent Chat\)/);
  assert.match(company, /enableAgentChat/);
  assert.match(company, /applies \*\*only\*\* to a run on a conversation issue/i);
  assert.match(company, /do not change the conversation issue's status/i);
  assert.match(company, /Never create subtasks under the conversation/i);
  assert.match(company, /create_task[\s\S]{0,120}initialPlan/);
  assert.match(company, /request_human_input[\s\S]{0,120}interactionKind: "confirmation"/);
});
