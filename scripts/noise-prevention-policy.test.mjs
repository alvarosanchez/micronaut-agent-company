import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repoOps = await readFile(new URL("../skills/micronaut-repo-operations/SKILL.md", import.meta.url), "utf8");
const prEvidence = await readFile(new URL("../skills/micronaut-repo-operations/references/pr-delivery-evidence.md", import.meta.url), "utf8");
const workflow = await readFile(new URL("../skills/micronaut-repo-operations/references/workflow-control-plane.md", import.meta.url), "utf8");
const guideReview = await readFile(new URL("../tasks/monthly-user-guide-review/TASK.md", import.meta.url), "utf8");
const guideDiscovery = await readFile(new URL("../tasks/monthly-guide-topic-discovery/TASK.md", import.meta.url), "utf8");
const training = await readFile(new URL("../tasks/training/TASK.md", import.meta.url), "utf8");

test("unchanged evidence never produces comments, routing writes, or wakeups", () => {
  assert.match(repoOps, /no new decision-relevant evidence/i);
  assert.match(repoOps, /do not post.*no[- ]change comment/i);
  assert.match(repoOps, /do not mutate status, assignment, execution state, or wake another agent/i);
});

test("maintainer waits are event-driven rather than agent-polled", () => {
  assert.match(prEvidence, /do not post periodic maintainer-wait comments/i);
  assert.match(prEvidence, /new head SHA|check outcome|review feedback|maintainer request|merge or closure/i);
  assert.match(prEvidence, /do not wake an agent/i);
});

test("pending human interactions suppress unrelated follow-up", () => {
  assert.match(workflow, /pending issue interaction/i);
  assert.match(workflow, /do not post reminder or verification comments/i);
  assert.match(workflow, /continuation policy/i);
});

test("explicit wakes are deduplicated against queued and running work", () => {
  assert.match(workflow, /before (?:explicitly )?invoking[^.]{0,180}(?:queued|running)/i);
  assert.match(workflow, /matching wake[^.]{0,180}(?:do not invoke|no-op|skip)/i);
});

test("monthly guide coordinators reuse project children on retry", () => {
  for (const task of [guideReview, guideDiscovery]) {
    assert.match(task, /stable[^.]{0,180}idempotency key/i);
    assert.match(task, /routine run[^.]{0,120}project[^.]{0,120}mode/i);
    assert.match(task, /reuse[^.]{0,180}(?:existing|orphan)/i);
  }
});

test("routine prose uses the configured monthly cadence", () => {
  assert.doesNotMatch(training, /daily CEO self-improvement|Weekly User Guide Review|Weekly Guide Topic Discovery/);
  assert.match(training, /monthly CEO self-improvement/i);
  assert.match(training, /Monthly User Guide Review/);
  assert.match(training, /Monthly Guide Topic Discovery/);
});
