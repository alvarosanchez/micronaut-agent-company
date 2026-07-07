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
  assert.match(
    source,
    /README\.md must explain Paperclip issue-thread interactions for suggested tasks, structured questions, and request-confirmation cards\./,
  );
  assert.match(
    source,
    /README\.md must explain structured `resume: true` when restarting follow-up on completed assigned issues\./,
  );
  assert.match(
    source,
    /README\.md must explain Paperclip environments as live runtime configuration and mention sandbox provider installation when needed\./,
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
    /Micronaut Engineer instructions must explain that failing PR CI or unresolved review feedback is actionable PR follow-through even when the failure also reproduces on the target branch\./,
  );
  assert.match(
    source,
    /Code Reviewer instructions must keep healthy PR maintainer-wait issues in `in_review` with no internal assignee instead of routing another follow-through checkpoint\./,
  );
  assert.match(
    source,
    /Code Reviewer instructions must make final PR approval's intermediate `done` state an immediate, no-wake transition to unassigned `in_review` without restarting completed review stages\./,
  );
  assert.match(
    source,
    /Micronaut Engineer instructions must correct healthy PR maintainer-wait reopen noise back to `in_review` with no internal assignee instead of adding another follow-through checkpoint\./,
  );
  assert.match(
    source,
    /Technical Writer instructions must explain that docs review threads get a decision-explaining reply before they are resolved\./,
  );
  assert.match(
    source,
    /Security Engineer instructions must inspect PR review threads and return required replies and resolution mutations to followThroughOwner\./,
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
