import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("verification rules require direct QA GitHub issue answer and closure guidance", async () => {
  const source = await readFile(
    new URL("./verify-paperclip-import.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /QA instructions must explain that confident questions can be answered directly on GitHub with `type: question` and `closed: question` before QA closes the issue\./,
  );
  assert.match(
    source,
    /QA instructions must explain that clarification requests use `status: awaiting feedback` and may close after 30 days with `closed: question`\./,
  );
  assert.match(
    source,
    /README\.md must explain that unreproducible issues can be closed by QA with `closed: cannot reproduce`\./,
  );
  assert.match(
    source,
    /README\.md must explain that duplicate issues can be closed by QA with `closed: duplicate` and a duplicate link\./,
  );
  assert.match(
    source,
    /README\.md must explain that GitHub issue closure syncs back to close the Paperclip item, so QA does not close the Paperclip issue directly\./,
  );
});
