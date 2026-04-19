import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const REQUIRED_COMMENT_APPROVAL_PATHS = [
  "COMPANY.md",
  "README.md",
  "agents/ceo/AGENTS.md",
  "agents/qa-engineer/AGENTS.md",
];

test("board approval guidance requires the exact proposed GitHub comment body", async () => {
  for (const relativePath of REQUIRED_COMMENT_APPROVAL_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

    assert.match(
      markdown,
      /exact (?:maintainer-visible GitHub )?(?:comment body|proposed comment body).*board approval|board approval.*exact (?:maintainer-visible GitHub )?(?:comment body|proposed comment body)/i,
      `${relativePath} must require board approval requests for GitHub comments to include the exact comment body that will be posted.`,
    );
  }
});
