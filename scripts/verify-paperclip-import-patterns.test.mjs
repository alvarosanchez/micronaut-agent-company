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

test("verification rules require decision-explaining replies on review threads", async () => {
  const source = await readFile(
    new URL("./verify-paperclip-import.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /README\.md must explain that review threads get a decision-explaining reply before they are resolved\./,
  );
  assert.match(
    source,
    /COMPANY\.md must explain that review threads get decision-explaining replies before they are resolved\./,
  );
  assert.match(
    source,
    /Repo operations must explain that review threads get decision-explaining replies before they are resolved\./,
  );
  assert.match(
    source,
    /Quality gates must explain that review threads get decision-explaining replies before they are resolved\./,
  );
  assert.match(
    source,
    /Micronaut Engineer instructions must require a decision-explaining reply before resolving review threads\./,
  );
  assert.match(
    source,
    /Micronaut Engineer instructions must explain that `reply_to_review_thread` is used before `resolve_review_thread` and silent resolves are not allowed\./,
  );
  assert.match(
    source,
    /Micronaut Engineer instructions must explain that GitHub Sync reopen noise does not override a policy-blocked issue and should be corrected back to `blocked` with a routing-correction comment\./,
  );
  assert.match(
    source,
    /Technical Writer instructions must explain that docs review threads get a decision-explaining reply before they are resolved\./,
  );
  assert.match(
    source,
    /Security Engineer instructions must explain that PR review threads get a decision-explaining reply before they are resolved\./,
  );
});

test("verification rules enforce import portability wording", async () => {
  const source = await readFile(
    new URL("./verify-paperclip-import.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /README\.md must explain that operator-selected live company names, descriptions, and issue prefixes are valid import choices\./,
  );
  assert.match(
    source,
    /README\.md must explain that `?\.paperclip\.yaml`? references describe source-package defaults rather than required live-instance files\./,
  );
  assert.match(
    source,
    /COMPANY\.md must explain that operator-selected live company names, descriptions, and issue prefixes are valid import choices\./,
  );
  assert.match(
    source,
    /COMPANY\.md must explain that `?\.paperclip\.yaml`? references describe source-package defaults rather than required live-instance files\./,
  );
  assert.match(
    source,
    /Bootstrap verification must explain that operator-selected live company names, descriptions, and issue prefixes are valid import choices\./,
  );
  assert.match(
    source,
    /Bootstrap verification must explain that `?\.paperclip\.yaml`? references describe source-package defaults rather than required live-instance files\./,
  );
  assert.match(
    source,
    /Architect instructions must explain that `?\.paperclip\.yaml`? references describe source-package defaults rather than required live-instance files\./,
  );
});
