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
