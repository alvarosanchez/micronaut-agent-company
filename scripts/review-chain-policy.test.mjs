import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import YAML from "yaml";

// Paperclip (since 2026.626.0, verified at 2026.831.1, server/src/services/issue-execution-policy.ts) never
// selects `executionState.returnAssignee` as a stage participant and fixes the return assignee to the issue
// assignee when the policy starts. A policy created at QA intake whose later stages name QA or the delivery
// owner therefore fails with `422 No eligible review participant is configured for this issue` at the first
// advance into such a stage. The package contract is: pre-delivery steps are `TODO` handoffs, and the delivery
// owner creates a review-only policy (QA, Security when required, Code Reviewer) when it submits the SHA.

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const REVIEW_ROLES = new Set(["qa-engineer", "security-engineer", "code-reviewer"]);
const DELIVERY_OWNERS = new Set(["micronaut-engineer", "technical-writer"]);

function markedYaml(markdown, marker) {
  const markerText = `<!-- ${marker} -->`;
  const markerIndex = markdown.indexOf(markerText);
  assert.notEqual(markerIndex, -1, `missing ${marker} marker`);
  const fence = markdown.slice(markerIndex + markerText.length).trimStart().match(/^```yaml\n([\s\S]*?)\n```/);
  assert.ok(fence, `${marker} must be followed by a YAML fence`);
  return YAML.parse(fence[1]);
}

test("routing reference splits stageSequence into a handoff chain and a delivery-owner-created review chain", async () => {
  const routing = await read("skills/micronaut-repo-operations/references/intake-routing-release.md");
  assert.match(routing, /\*\*handoff chain\*\*[^\n]+non-policy `TODO` assignment/);
  assert.match(routing, /\*\*review chain\*\*[^\n]+delivery owner submits the immutable SHA[^\n]+creates the review-only execution policy/);
  assert.match(routing, /never selects the return assignee as a stage participant/);
  assert.match(routing, /QA does not create the execution policy at intake/);
  assert.match(routing, /422 No eligible review participant is configured for this issue/);
  assert.doesNotMatch(routing, /QA encodes the selected sequence in the issue execution policy/);
});

test("every route keeps only review roles after the delivery owner and never a review-only role before it", async () => {
  const matrix = markedYaml(await read("skills/micronaut-repo-operations/references/intake-routing-release.md"), "workflow-routing-matrix");
  for (const [routeName, sequence] of Object.entries(matrix)) {
    const ownerIndexes = sequence.map((slug, index) => (DELIVERY_OWNERS.has(slug) ? index : -1)).filter((index) => index !== -1);
    assert.equal(ownerIndexes.length, 1, `${routeName} must name exactly one delivery owner`);
    const [ownerIndex] = ownerIndexes;
    const reviewChain = sequence.slice(ownerIndex + 1);
    assert.ok(reviewChain.length >= 2, `${routeName} review chain must at least hold QA verification and Code Reviewer`);
    assert.equal(reviewChain[0], "qa-engineer", `${routeName} review chain must start with QA verification`);
    assert.equal(reviewChain.at(-1), "code-reviewer", `${routeName} review chain must end with Code Reviewer`);
    assert.deepEqual(reviewChain.filter((slug) => !REVIEW_ROLES.has(slug)), [], `${routeName} review chain may only contain review roles`);
    assert.ok(!sequence.slice(0, ownerIndex).includes("code-reviewer"), `${routeName} must not put Code Reviewer before delivery`);
  }
});

test("control-plane reference documents the submission PATCH, the exclusion rule, and the resubmission recipes", async () => {
  const controlPlane = await read("skills/micronaut-repo-operations/references/workflow-control-plane.md");
  const submission = controlPlane.match(/`PATCH \/api\/issues\/\{issueId\}` with `(\{"status":"in_review","executionPolicy":[^`]+\})`/);
  assert.ok(submission, "submission PATCH body must be documented inline");
  const body = JSON.parse(submission[1]);
  assert.equal(body.status, "in_review");
  assert.equal(body.executionPolicy.mode, "normal");
  assert.deepEqual(
    body.executionPolicy.stages.map((stage) => [stage.type, stage.participants.map((participant) => `${participant.type}:${participant.agentId}`)]),
    [
      ["review", ["agent:<qa-engineer>"]],
      ["review", ["agent:<security-engineer>"]],
      ["review", ["agent:<code-reviewer>"]],
    ],
  );
  assert.equal(typeof body.comment, "string");
  assert.match(controlPlane, /omitting the Security stage unless the route requires it/);
  assert.match(controlPlane, /sets `executionState\.returnAssignee` to the assignee at that moment \(the delivery owner\)/);
  assert.match(controlPlane, /never selects the return assignee as a stage participant[^\n]+422 No eligible review participant is configured for this issue/);
  assert.match(controlPlane, /delivery owner is never a participant, no pre-delivery role is a policy stage, and nobody creates the policy at intake/);
  assert.match(controlPlane, /reviewed SHA is unchanged[^\n]+`PATCH \{"status":"in_review","comment":"\.\.\."\}` re-pends the same stage/);
  assert.match(controlPlane, /SHA changed[^\n]+first `PATCH \{"executionPolicy":null\}`[^\n]+then the submission `PATCH`/);
  assert.match(controlPlane, /Never use a policy reset to escape a review-rounds escalation/);
  assert.match(controlPlane, /Use normal `TODO` assignment for every handoff-chain step \(intake-to-pre-triage, pre-triage-to-planning, planning-to-implementation\)/);
});

test("QA hands off after intake and never creates the execution policy", async () => {
  const qa = await read("agents/qa-engineer/AGENTS.md");
  assert.match(qa, /Continue only if the issue is assigned to you in `TODO` for intake, you are the current stage participant for verification/);
  assert.match(qa, /do not create the execution policy at intake: the delivery owner creates the review chain/);
  assert.match(qa, /`approved`: intake is complete and the issue is handed `TODO` to the next `stageSequence` entry/);
  assert.match(qa, /If you approved intake, confirm the issue is `TODO` with the next entry[^\n]+no execution policy exists/);
  assert.doesNotMatch(qa, /use separate sequential review stages for required gates such as Architect/);
  assert.doesNotMatch(qa, /send architectural ambiguity back through the execution policy/);
  const gates = await read("skills/micronaut-quality-gates/SKILL.md");
  assert.match(gates, /Work that passes QA intake is handed `TODO` to the next handoff-chain entry/);
  assert.match(gates, /execution-policy stages exist only in the review chain the delivery owner creates/);
  assert.match(gates, /A rejected pre-triage returns `TODO` to QA naming the gap; a rejected final review returns through the execution policy as `changes_requested`/);
});

test("Architect and Security pre-triage are handoff steps, never execution-policy stages", async () => {
  const [architect, security, securitySkill] = await Promise.all([
    read("agents/architect/AGENTS.md"),
    read("agents/security-engineer/AGENTS.md"),
    read("skills/micronaut-security-review/SKILL.md"),
  ]);
  assert.match(architect, /Planning is a handoff step, never an execution-policy stage/);
  assert.match(architect, /You are never an execution-policy participant: never resolve a stage with `status: done` or `status: in_progress`, and never create or edit `executionPolicy`/);
  assert.match(architect, /Hand the planned issue to the delivery owner with `status: todo`/);
  assert.match(architect, /return the issue `TODO` to QA as `changes_requested` with the exact mismatch/);
  assert.doesNotMatch(architect, /If you are the active execution-stage participant, approve with `status: done`/);
  assert.match(security, /assigned to you in `TODO` for pre-triage, you are the current stage participant for final review/);
  assert.match(security, /Pre-triage is a handoff step: pass the issue `TODO` to the next `stageSequence` entry[^\n]+never create `executionPolicy`\. Final review is an execution-policy stage: approve with `status: done`/);
  assert.match(security, /Pre-triage hands the issue `TODO` only to the next entry in the authoritative ordered `qa-intake\.stageSequence`, never directly to Code Reviewer/);
  assert.match(securitySkill, /pre-triage hands the issue `TODO` exactly to the next entry in the authoritative ordered `qa-intake\.stageSequence`/);
  assert.match(securitySkill, /After pre-triage, confirm the issue is `TODO`, assigned to the next `stageSequence` entry, with no execution policy/);
});

test("delivery owners submit the SHA with the review-only policy and resubmit through the documented recipes", async () => {
  for (const slug of ["micronaut-engineer", "technical-writer"]) {
    const markdown = await read(`agents/${slug}/AGENTS.md`);
    assert.match(markdown, /a reviewer returned `changes_requested` to you as `executionState\.returnAssignee`/, slug);
    assert.match(markdown, /one `PATCH`[^\n]+`status: in_review`[^\n]+review-only execution policy[^\n]+(?:route artifact's `stageSequence` \(`qa-intake`, or `training-route`|`qa-intake\.stageSequence`)[^\n]+making you `executionState\.returnAssignee`/, slug);
    assert.match(markdown, /You are never a review-stage participant, so never resolve a stage with `status: done`/, slug);
    assert.match(markdown, /an unchanged SHA re-pends the same stage, a changed SHA restarts the review chain \(`PATCH \{executionPolicy: null\}`, then the submission `PATCH` again\)/, slug);
    assert.match(markdown, /After submission, confirm the issue is `in_review`, the current stage participant is QA, and `executionState\.returnAssignee` is you/, slug);
    assert.doesNotMatch(markdown, /If you are the active execution-stage participant, approve with `status: done`/, slug);
    assert.doesNotMatch(markdown, /send the work back through the execution policy/, slug);
  }
  const reviewer = await read("agents/code-reviewer/AGENTS.md");
  assert.match(reviewer, /Any changed head SHA must re-enter QA and every Security stage[^\n]+resubmitted by the implementation owner as a fresh review chain/);
});

test("the Training route and the company docs describe the same contract", async () => {
  const [ceo, task, company, readme, verifyTask] = await Promise.all([
    read("agents/ceo/AGENTS.md"),
    read("tasks/training/TASK.md"),
    read("COMPANY.md"),
    read("README.md"),
    read("tasks/verify-imported-company-instance/TASK.md"),
  ]);
  assert.match(ceo, /no execution policy: Engineer creates the QA -> Code Reviewer review chain at submission/);
  assert.match(task, /without an execution policy \(Engineer creates the QA -> Code Reviewer review chain when it submits the SHA\)/);
  assert.match(task, /Publication is outside the review chain/);
  for (const [label, markdown] of [["COMPANY.md", company], ["README.md", readme]]) {
    assert.match(markdown, /delivery owner creates the (?:review-only )?execution policy \(QA verification, Security final review when required, Code Reviewer/, label);
    assert.match(markdown, /never lets the return assignee act as a stage participant/, label);
    assert.match(markdown, /QA does not create the policy at intake/, label);
    assert.doesNotMatch(markdown, /Use normal `TODO` assignment only for non-policy owner changes/, label);
  }
  assert.match(verifyTask, /no delivery issue carries an execution policy that names its `executionState\.returnAssignee`, Architect, or Security pre-triage as a stage participant, or that was created before the delivery owner submitted the SHA[^\n]+QA verification stage is the legitimate first stage of the review chain/);
});

test("direct GitHub closures are parked in_review unassigned and GitHub Sync owns the terminal state", async () => {
  const [qa, readme, gates, controlPlane, repoOps] = await Promise.all([
    read("agents/qa-engineer/AGENTS.md"),
    read("README.md"),
    read("skills/micronaut-quality-gates/SKILL.md"),
    read("skills/micronaut-repo-operations/references/workflow-control-plane.md"),
    read("skills/micronaut-repo-operations/SKILL.md"),
  ]);
  assert.match(qa, /park the Paperclip issue `in_review` and unassigned: GitHub Sync sets the terminal state on its next pass \(`CANCELLED` for not-planned or duplicate closures, `DONE` for completed ones\)/);
  assert.match(qa, /re-woken once by the host and then blocked as stranded/);
  assert.doesNotMatch(qa, /the sync plugin will do that on the next sync/);
  assert.match(readme, /closed as completed \(a merged fix\) becomes `DONE`, while an issue closed as not planned or as a duplicate becomes `CANCELLED`/);
  assert.match(readme, /IN_REVIEW --> CANCELLED: GitHub close sync \(not planned or duplicate\)/);
  assert.doesNotMatch(readme, /already-implemented closure become `DONE`/);
  assert.match(gates, /parked `in_review` unassigned for GitHub Sync to transition/);
  assert.match(controlPlane, /issue\.productive_terminal_continuation_recovery[^\n]+blocks it as stranded/);
  assert.match(repoOps, /GitHub Sync sets `DONE` after a merge and `CANCELLED` after a not-planned or duplicate closure/);
});

test("runs never rely on monitors or background jobs surviving the run boundary", async () => {
  const [controlPlane, hygiene] = await Promise.all([
    read("skills/micronaut-repo-operations/references/workflow-control-plane.md"),
    read("skills/micronaut-repo-operations/references/implementation-hygiene.md"),
  ]);
  assert.match(controlPlane, /A run ends when you stop, and nothing you arm survives it[^\n]+bounded polling[^\n]+Never finish with "I'll continue when it reports"/);
  assert.match(hygiene, /poll the log inside the same run[^\n]+Do not end the run while the job is still running/);
});

test("commits never carry AI co-author or attribution trailers", async () => {
  const hygiene = await read("skills/micronaut-repo-operations/references/implementation-hygiene.md");
  assert.match(hygiene, /Never add AI co-author or attribution trailers such as `Co-Authored-By: Claude \.\.\.`[^\n]+CLA Assistant checks co-authors/);
});
