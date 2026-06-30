import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const QA_TRIAGE_SELF_ASSIGNMENT_PATTERN =
  /(?:triage|intake)[\s\S]{0,500}(?:imported|synced)[\s\S]{0,300}GitHub issue[\s\S]{0,700}(?:assign|claim)[\s\S]{0,300}(?:current user|@me)|(?:assign|claim)[\s\S]{0,300}(?:current user|@me)[\s\S]{0,700}(?:triage|intake)[\s\S]{0,500}(?:imported|synced)[\s\S]{0,300}GitHub issue/i;
const QA_ASSIGNMENT_TOOL_PATTERN =
  /paperclip-github-plugin:assign_to_current_user[\s\S]{0,700}(?:tool-surface blocker|instead of falling back to `?gh`?|not (?:the )?browser)|(?:tool-surface blocker|instead of falling back to `?gh`?|not (?:the )?browser)[\s\S]{0,700}paperclip-github-plugin:assign_to_current_user/i;
const ISSUE_CREATOR_REVIEWER_PATTERN =
  /(?:PR|pull request)[\s\S]{0,500}(?:fixes|closes|resolves|linked)[\s\S]{0,300}GitHub issue[\s\S]{0,700}(?:issue creator|issue author|issue reporter)[\s\S]{0,500}(?:reviewer|reviewers|request_pull_request_reviewers|--add-reviewer)|(?:issue creator|issue author|issue reporter)[\s\S]{0,500}(?:reviewer|reviewers|request_pull_request_reviewers|--add-reviewer)[\s\S]{0,700}(?:PR|pull request)[\s\S]{0,500}(?:fixes|closes|resolves|linked)[\s\S]{0,300}GitHub issue/i;
const REVIEWER_TOOLING_PATTERN =
  /request_pull_request_reviewers[\s\S]{0,700}(?:tool blocker|instead of falling back to `?gh`?|GitHub Sync)|(?:tool blocker|instead of falling back to `?gh`?|GitHub Sync)[\s\S]{0,700}request_pull_request_reviewers/i;

test("QA triage assigns imported GitHub issues to the current GitHub user", async () => {
  const markdown = await readFile(
    new URL("../agents/qa-engineer/AGENTS.md", import.meta.url),
    "utf8",
  );

  assert.match(
    markdown,
    QA_TRIAGE_SELF_ASSIGNMENT_PATTERN,
    "QA instructions must require assigning or claiming an imported/synced GitHub issue to the current user during triage.",
  );
  assert.match(
    markdown,
    QA_ASSIGNMENT_TOOL_PATTERN,
    "QA instructions must use paperclip-github-plugin:assign_to_current_user and record a GitHub Sync blocker instead of falling back to gh.",
  );
});

test("Code Reviewer requests the linked GitHub issue creator as reviewer on created PRs", async () => {
  const markdown = await readFile(
    new URL("../agents/code-reviewer/AGENTS.md", import.meta.url),
    "utf8",
  );

  assert.match(
    markdown,
    ISSUE_CREATOR_REVIEWER_PATTERN,
    "Code Reviewer instructions must require adding the linked GitHub issue creator as a reviewer when creating a PR that fixes that issue.",
  );
  assert.match(
    markdown,
    REVIEWER_TOOLING_PATTERN,
    "Code Reviewer instructions must describe reviewer-request tooling with the plugin tool and no gh fallback.",
  );
});
