import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const OUT_OF_PIPELINE_SCOPE_PATTERN =
  /(?:outside|out-of-pipeline|outside the normal)[\s\S]{0,240}(?:normal )?(?:delivery pipeline|synced GitHub issue pipeline)|(?:normal )?(?:delivery pipeline|synced GitHub issue pipeline)[\s\S]{0,240}(?:outside|out-of-pipeline)/i;
const SUBTASK_BEFORE_PR_PATTERN =
  /(?:Paperclip )?(?:child issue|subtask)[\s\S]{0,260}(?:before|first)[\s\S]{0,220}(?:PR|pull request)|(?:before|first)[\s\S]{0,220}(?:PR|pull request)[\s\S]{0,260}(?:Paperclip )?(?:child issue|subtask)/i;
const LINK_PR_TO_ISSUE_PATTERN =
  /(?:link|linked|linking)[\s\S]{0,180}(?:PR|pull request)[\s\S]{0,220}(?:Paperclip )?(?:issue|subtask|child issue)|(?:Paperclip )?(?:issue|subtask|child issue)[\s\S]{0,220}(?:link|linked|linking)[\s\S]{0,180}(?:PR|pull request)/i;
const SYNC_PLUGIN_EXCEPTION_PATTERN =
  /(?:synced|imported)[\s\S]{0,180}(?:GitHub )?issues?[\s\S]{0,220}(?:already|not need|do not need)[\s\S]{0,220}linked|(?:already|not need|do not need)[\s\S]{0,220}linked[\s\S]{0,220}(?:synced|imported)[\s\S]{0,180}(?:GitHub )?issues?/i;
const AFFECTED_PROJECT_SUBTASK_PATTERN =
  /(?:one|1)[\s\S]{0,80}(?:Paperclip )?(?:child issue|subtask)[\s\S]{0,180}(?:per|for each)[\s\S]{0,120}affected project|affected project[\s\S]{0,180}(?:per|for each)[\s\S]{0,120}(?:Paperclip )?(?:child issue|subtask)/i;
const ACTUAL_PROJECT_SUBTASK_PATTERN =
  /(?:Paperclip )?(?:sub-issue|child issue|subtask)[\s\S]{0,220}(?:actual|corresponding)[\s\S]{0,120}(?:Paperclip )?project|(?:actual|corresponding)[\s\S]{0,120}(?:Paperclip )?project[\s\S]{0,220}(?:Paperclip )?(?:sub-issue|child issue|subtask)/i;
const ROUTINE_OWNER_SUBTASK_ASSIGNEE_PATTERN =
  /(?:Paperclip )?(?:sub-issue|child issue|subtask)[\s\S]{0,220}(?:assigned|assignee)[\s\S]{0,160}(?:routine owner|current routine owner|self|yourself|CEO|ceo|Technical Writer|technical-writer|Product Manager|product-manager)|(?:assigned|assignee)[\s\S]{0,160}(?:routine owner|current routine owner|self|yourself|CEO|ceo|Technical Writer|technical-writer|Product Manager|product-manager)[\s\S]{0,220}(?:Paperclip )?(?:sub-issue|child issue|subtask)/i;
const EXISTING_PROJECT_PATTERN =
  /project exists in Paperclip|Paperclip project exists|existing Paperclip project/i;
const LINK_TOOL_PATTERN =
  /paperclip-github-plugin:link_github_item[\s\S]{0,500}(?:kind[\s\S]{0,80}pull_request|pull_request[\s\S]{0,80}kind)[\s\S]{0,500}paperclipIssueId[\s\S]{0,500}(?:pullRequestUrl|reference)/i;
const ISSUE_LINK_API_PATTERN =
  /\/api\/plugins\/paperclip-github-plugin\/api\/issue-link[\s\S]{0,500}PAPERCLIP_API_KEY[\s\S]{0,500}paperclipIssueId[\s\S]{0,500}(?:pullRequestUrl|reference)/i;

function assertOutOfPipelinePrPolicy(markdown, label) {
  assert.match(
    markdown,
    OUT_OF_PIPELINE_SCOPE_PATTERN,
    `${label} must scope the policy to PRs created outside the normal delivery pipeline.`,
  );
  assert.match(
    markdown,
    SUBTASK_BEFORE_PR_PATTERN,
    `${label} must require creating a Paperclip child issue or subtask before opening the PR.`,
  );
  assert.match(
    markdown,
    LINK_PR_TO_ISSUE_PATTERN,
    `${label} must require linking the PR to that Paperclip issue or subtask.`,
  );
}

test("shared guidance scopes out-of-pipeline PRs into linked Paperclip subtasks", async () => {
  const requiredPaths = [
    "../README.md",
    "../COMPANY.md",
    "../skills/micronaut-repo-operations/SKILL.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await read(relativePath);

    assertOutOfPipelinePrPolicy(markdown, relativePath);
    assert.match(
      markdown,
      AFFECTED_PROJECT_SUBTASK_PATTERN,
      `${relativePath} must require one Paperclip child issue or subtask per affected project.`,
    );
    assert.match(
      markdown,
      ACTUAL_PROJECT_SUBTASK_PATTERN,
      `${relativePath} must require project-specific subtasks to belong to the actual project.`,
    );
    assert.match(
      markdown,
      EXISTING_PROJECT_PATTERN,
      `${relativePath} must scope per-project subtasks to projects that exist in Paperclip.`,
    );
    assert.match(
      markdown,
      LINK_TOOL_PATTERN,
      `${relativePath} must document the paperclip-github-plugin:link_github_item tool for PR links.`,
    );
    assert.match(
      markdown,
      ISSUE_LINK_API_PATTERN,
      `${relativePath} must document the plugin-scoped /issue-link API route fallback.`,
    );
    assert.match(
      markdown,
      SYNC_PLUGIN_EXCEPTION_PATTERN,
      `${relativePath} must explain that synced GitHub issues are already linked by the sync plugin.`,
    );
  }
});

test("routine PR surfaces require a Paperclip subtask and PR link", async () => {
  const requiredPaths = [
    "../tasks/weekly-user-guide-review/TASK.md",
    "../tasks/weekly-guide-topic-discovery/TASK.md",
    "../tasks/daily-ceo-self-improvement/TASK.md",
    "../agents/technical-writer/AGENTS.md",
    "../agents/ceo/AGENTS.md",
    "../skills/company-package-evolution/SKILL.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await read(relativePath);

    assertOutOfPipelinePrPolicy(markdown, relativePath);
    assert.match(
      markdown,
      AFFECTED_PROJECT_SUBTASK_PATTERN,
      `${relativePath} must require one Paperclip child issue or subtask per affected project.`,
    );
    assert.match(
      markdown,
      ACTUAL_PROJECT_SUBTASK_PATTERN,
      `${relativePath} must require project-specific subtasks to belong to the actual project.`,
    );
    assert.match(
      markdown,
      ROUTINE_OWNER_SUBTASK_ASSIGNEE_PATTERN,
      `${relativePath} must assign project-specific subtasks to the routine owner.`,
    );
    assert.match(
      markdown,
      LINK_TOOL_PATTERN,
      `${relativePath} must document the paperclip-github-plugin:link_github_item tool for PR links.`,
    );
    assert.match(
      markdown,
      ISSUE_LINK_API_PATTERN,
      `${relativePath} must document the plugin-scoped /issue-link API route fallback.`,
    );
  }
});

test("package, managed repository, and upstream PR paths all mention subtask linkage", async () => {
  const markdown = await read("../skills/company-package-evolution/SKILL.md");

  for (const surface of [
    /package-core|package core|package PR/i,
    /managed Micronaut repositor(?:y|ies)[\s\S]{0,160}AGENTS\.md/i,
    /upstream dependency/i,
  ]) {
    assert.match(markdown, surface, "Expected company-package-evolution to keep the PR path surface.");
  }

  assert.match(
    markdown,
    /package[\s\S]{0,260}(?:Paperclip )?(?:child issue|subtask)[\s\S]{0,260}(?:link|linked|linking)[\s\S]{0,180}(?:PR|pull request)|(?:Paperclip )?(?:child issue|subtask)[\s\S]{0,260}package[\s\S]{0,260}(?:link|linked|linking)[\s\S]{0,180}(?:PR|pull request)/i,
    "Package PR path must mention child issue or subtask linkage.",
  );
  assert.match(
    markdown,
    /managed Micronaut repositor(?:y|ies)[\s\S]{0,360}(?:Paperclip )?(?:child issue|subtask)[\s\S]{0,260}(?:link|linked|linking)[\s\S]{0,180}(?:PR|pull request)|(?:Paperclip )?(?:child issue|subtask)[\s\S]{0,260}managed Micronaut repositor(?:y|ies)[\s\S]{0,360}(?:link|linked|linking)[\s\S]{0,180}(?:PR|pull request)/i,
    "Managed repository PR path must mention child issue or subtask linkage.",
  );
  assert.match(
    markdown,
    /upstream dependency[\s\S]{0,360}(?:Paperclip )?(?:child issue|subtask)[\s\S]{0,260}(?:link|linked|linking)[\s\S]{0,180}(?:PR|pull request)|(?:Paperclip )?(?:child issue|subtask)[\s\S]{0,260}upstream dependency[\s\S]{0,360}(?:link|linked|linking)[\s\S]{0,180}(?:PR|pull request)/i,
    "Upstream dependency PR path must mention child issue or subtask linkage.",
  );
});
