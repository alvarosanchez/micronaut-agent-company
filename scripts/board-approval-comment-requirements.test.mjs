import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const REQUIRED_COMMENT_APPROVAL_PATHS = [
  "COMPANY.md",
  "README.md",
  "agents/ceo/AGENTS.md",
  "agents/qa-engineer/AGENTS.md",
];
const BOARD_APPROVAL_RECOMMENDED_ACTION_PATTERN =
  /\b(?:board approval|linked approval|approval requests?|approval request)\b[\s\S]{0,400}(?:exact (?:maintainer-visible GitHub )?(?:comment body|proposed comment body)[\s\S]{0,200}\brecommendedAction\b|\brecommendedAction\b[\s\S]{0,200}exact (?:maintainer-visible GitHub )?(?:comment body|proposed comment body))/i;
const COMMENT_BODY_RECOMMENDED_ACTION_PATTERN =
  /\bcommentBody\b[\s\S]{0,240}\brecommendedAction\b|\brecommendedAction\b[\s\S]{0,240}\bcommentBody\b/i;

test("board approval guidance requires the exact proposed GitHub comment body in recommendedAction", async () => {
  for (const relativePath of REQUIRED_COMMENT_APPROVAL_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

    assert.match(
      markdown,
      BOARD_APPROVAL_RECOMMENDED_ACTION_PATTERN,
      `${relativePath} must require board approval requests for GitHub comments to put the exact comment body in recommendedAction.`,
    );
    assert.match(
      markdown,
      COMMENT_BODY_RECOMMENDED_ACTION_PATTERN,
      `${relativePath} must require GitHub action commentBody proposals to surface their public text in recommendedAction.`,
    );
  }
});
