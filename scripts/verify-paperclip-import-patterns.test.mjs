import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("README verification rules require separate normal-path and keep-open checks", async () => {
  const source = await readFile(
    new URL("./verify-paperclip-import.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /README\.md must explain how imported issues with linked contributor PRs continue through the normal gates\./,
  );
  assert.match(
    source,
    /README\.md must explain that inadequate imported issue PRs stay open while agents create a separate replacement PR\./,
  );
  assert.doesNotMatch(
    source,
    /README\.md must explain how imported issues with linked contributor PRs either continue through the normal gates or get closed with board approval\./,
  );
  assert.doesNotMatch(
    source,
    /README\.md must explain that inadequate imported issue PRs require board approval before they are closed\./,
  );
});

test("verification rules enforce the execution-semantics guidance we rely on", async () => {
  const source = await readFile(
    new URL("./verify-paperclip-import.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /README\.md must explain that Paperclip issues stay single-assignee and linked approvals are not a second assignee\./,
  );
  assert.match(
    source,
    /README\.md must explain checkout-backed agent `in_progress` work and the stranded-work recovery path\./,
  );
  assert.match(
    source,
    /README\.md must explain that `parentId` is structural and `blockedByIssueIds` carries dependency semantics\./,
  );
  assert.match(
    source,
    /Shared repo operations guidance must explain checkout-backed agent `in_progress` work and stranded-work recovery\./,
  );
});
