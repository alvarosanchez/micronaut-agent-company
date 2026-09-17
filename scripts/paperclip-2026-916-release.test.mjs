import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const PAPERCLIP_RELEASE_UNDER_TEST = "2026.916.0";

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

  // No role or skill may still tell an agent to park an issue with nobody on it.
  for (const relativePath of [
    "../README.md",
    "../COMPANY.md",
    "../agents/qa-engineer/AGENTS.md",
    "../agents/micronaut-engineer/AGENTS.md",
    "../agents/technical-writer/AGENTS.md",
    "../agents/code-reviewer/AGENTS.md",
    "../agents/ceo/AGENTS.md",
    "../skills/micronaut-repo-operations/SKILL.md",
    "../skills/micronaut-repo-operations/references/workflow-control-plane.md",
    "../skills/micronaut-repo-operations/references/pr-delivery-evidence.md",
    "../skills/micronaut-quality-gates/SKILL.md",
    "../skills/company-package-evolution/SKILL.md",
    "../skills/ceo-issue-history/references/maintenance-lanes.md",
  ]) {
    assert.doesNotMatch(
      await read(relativePath),
      /unassigned (?:`?in_review`?|maintainer wait)|`?in_review`? (?:and |parked )?unassigned|remain unassigned/i,
      `${relativePath} must not describe maintainer wait as an unassigned issue.`,
    );
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
