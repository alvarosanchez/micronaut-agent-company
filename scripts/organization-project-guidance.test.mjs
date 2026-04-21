import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readRepoFile(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("README keeps organization-project linkage advisory instead of blocking", async () => {
  const readme = await readRepoFile("README.md");

  assert.doesNotMatch(
    readme,
    /must not resolve PR-based delivery work as `approved` unless[\s\S]*correct issue linkage, closing keyword, `type:` label, and organization project/i,
    "README should not make the organization project a prerequisite for the `approved` outcome.",
  );
  assert.doesNotMatch(
    readme,
    /must be linked to exactly one Micronaut organization project/i,
    "README should not require every PR to carry an organization project link.",
  );
  assert.match(
    readme,
    /should be linked to (?:the )?Micronaut organization project chosen during QA intake|best-fit Micronaut Platform release/i,
    "README should describe organization-project linkage as a recommendation tied to QA's chosen best-fit release board.",
  );
  assert.match(
    readme,
    /does not by itself block (?:PR creation|an? `approved` outcome)|continue instead of escalating solely for that reason/i,
    "README should say that missing organization-project linkage alone is not a blocking condition.",
  );
  assert.match(
    readme,
    /keep the chosen project and record the ambiguity|record the ambiguity in the stage artifact or PR summary/i,
    "README should require ambiguous project choices to keep the best-fit selection and document the ambiguity.",
  );
});

test("runtime instructions keep organization-project linkage best effort", async () => {
  const codeReviewer = await readRepoFile("agents/code-reviewer/AGENTS.md");
  const qualityGates = await readRepoFile("skills/micronaut-quality-gates/SKILL.md");
  const repoOperations = await readRepoFile("skills/micronaut-repo-operations/SKILL.md");

  assert.doesNotMatch(
    codeReviewer,
    /do not resolve as `approved` unless[\s\S]*correct issue linkage, closing keyword, `type:` label, and organization project/i,
    "Code Reviewer guidance should not block `approved` on organization-project linkage alone.",
  );
  assert.match(
    codeReviewer,
    /organization project should be linked[\s\S]*when the chosen project exists|apply the best-fit project chosen upstream/i,
    "Code Reviewer guidance should still recommend linking the organization project chosen upstream when possible.",
  );
  assert.match(
    codeReviewer,
    /record the gap and continue|continue with the PR and record/i,
    "Code Reviewer guidance should say missing organization-project linkage alone does not justify board approval.",
  );
  assert.match(
    codeReviewer,
    /keep the ambiguity note in the PR summary|make sure the PR description records it/i,
    "Code Reviewer guidance should preserve ambiguity notes instead of dropping the chosen project.",
  );

  assert.doesNotMatch(
    qualityGates,
    /if any of these are missing, planning does not resolve as `approved`\.[\s\S]*organization project/i,
    "Quality gates should not fail planning solely because the organization project is missing.",
  );
  assert.match(
    qualityGates,
    /QA-selected Micronaut organization project|organization-project selection from QA intake/i,
    "Quality gates should describe the organization project as QA-selected upstream metadata.",
  );
  assert.match(
    qualityGates,
    /missing organization-project linkage alone does not block code review approval|does not by itself block a healthy PR/i,
    "Quality gates should state that organization-project linkage is not a blocking gate by itself.",
  );

  assert.doesNotMatch(
    repoOperations,
    /escalate instead of creating an unlinked PR|stop and escalate instead of guessing/i,
    "Repo operations should not require escalation solely because an organization project link is missing or ambiguous.",
  );
  assert.match(
    repoOperations,
    /QA should choose the best-fit Micronaut organization project during intake|chosen during QA intake/i,
    "Repo operations should make QA own organization-project selection.",
  );
  assert.match(
    repoOperations,
    /record the ambiguity|record that gap and continue|missing linkage due to no matching project or tooling gaps/i,
    "Repo operations should require documentation of project ambiguity or linkage gaps instead of blocking on them.",
  );
});
