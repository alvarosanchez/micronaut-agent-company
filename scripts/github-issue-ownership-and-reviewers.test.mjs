import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const qa = await readFile(new URL("../agents/qa-engineer/AGENTS.md", import.meta.url), "utf8");
const reviewer = await readFile(new URL("../agents/code-reviewer/AGENTS.md", import.meta.url), "utf8");

test("QA changes public GitHub ownership only when repository policy explicitly requires it", () => {
  assert.match(qa, /explicit repository policy[^.]{0,240}(?:requires|calls for) GitHub assignment/i);
  assert.match(qa, /eligible[^.]{0,160}non-bot/i);
  assert.match(qa, /already assigned[^.]{0,160}(?:no-op|do not write|leave)/i);
  assert.doesNotMatch(qa, /before you make the triage decision[^.]{0,240}assign the GitHub issue to the current user/i);
});

test("Code Reviewer requests only eligible, useful GitHub reviewers", () => {
  assert.match(reviewer, /eligible[^.]{0,200}non-bot[^.]{0,200}not the PR author/i);
  assert.match(reviewer, /already requested[^.]{0,160}(?:no-op|do not request|skip)/i);
  assert.match(reviewer, /paperclip-github-plugin:request_pull_request_reviewers/i);
  assert.match(reviewer, /ineligible[^.]{0,160}verified no-op/i);
  assert.match(reviewer, /Finish Verification[\s\S]*useful eligible reviewer requests[\s\S]*verified no-op/i);
  assert.doesNotMatch(reviewer, /requested reviewers including the linked GitHub issue creator/i);
});

test("final review cannot silently change an approved revision", () => {
  assert.match(reviewer, /If final review changes the head SHA[^.]{0,240}QA and Security/i);
  assert.match(reviewer, /metadata-only[^.]{0,200}(?:does not|must not)[^.]{0,120}(?:rebase|change the head SHA)/i);
});
