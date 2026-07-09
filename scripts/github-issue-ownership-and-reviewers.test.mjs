import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const qa = await readFile(new URL("../agents/qa-engineer/AGENTS.md", import.meta.url), "utf8");
const reviewer = await readFile(new URL("../agents/code-reviewer/AGENTS.md", import.meta.url), "utf8");
const engineer = await readFile(new URL("../agents/micronaut-engineer/AGENTS.md", import.meta.url), "utf8");
const writer = await readFile(new URL("../agents/technical-writer/AGENTS.md", import.meta.url), "utf8");

test("QA changes public GitHub ownership only when repository policy explicitly requires it", () => {
  assert.match(qa, /explicit repository policy[^.]{0,240}(?:requires|calls for) GitHub assignment/i);
  assert.match(qa, /eligible[^.]{0,160}non-bot/i);
  assert.match(qa, /already assigned[^.]{0,160}(?:no-op|do not write|leave)/i);
  assert.doesNotMatch(qa, /before you make the triage decision[^.]{0,240}assign the GitHub issue to the current user/i);
});

test("implementation owners request eligible reviewers and Code Reviewer only verifies", () => {
  for (const owner of [engineer, writer]) {
    assert.match(owner, /eligible[^.]{0,200}non-bot[^.]{0,200}not the PR author/i);
    assert.match(owner, /already-requested reporters as verified no-ops/i);
    assert.match(owner, /paperclip-github-plugin:request_pull_request_reviewers/i);
  }
  assert.doesNotMatch(reviewer, /paperclip-github-plugin:request_pull_request_reviewers/i);
  assert.match(reviewer, /Finish Verification[\s\S]*useful eligible reviewer requests[\s\S]*verified no-op/i);
});

test("final review cannot silently change an approved revision", () => {
  assert.match(reviewer, /Any changed head SHA[^.]{0,240}re-enter QA[^.]{0,240}Security/i);
  assert.match(reviewer, /Do not rebase, merge, edit, create, update, or publish during final review/i);
});
