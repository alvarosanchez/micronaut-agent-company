import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readRepoFile(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

async function readOrganizationProjectPolicy() {
  return (await Promise.all([
    readRepoFile("skills/micronaut-repo-operations/references/intake-routing-release.md"),
    readRepoFile("skills/micronaut-repo-operations/references/pr-delivery-evidence.md"),
    readRepoFile("skills/micronaut-github-operations/SKILL.md"),
  ])).join("\n");
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
    /should be linked to (?:all selected Micronaut organization projects chosen during QA intake|(?:the )?Micronaut organization project chosen during QA intake|best-fit Micronaut Platform release)/i,
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
  const micronautEngineer = await readRepoFile("agents/micronaut-engineer/AGENTS.md");
  const qualityGates = await readRepoFile("skills/micronaut-quality-gates/SKILL.md");
  const repoOperations = await readOrganizationProjectPolicy();

  assert.doesNotMatch(
    codeReviewer,
    /do not resolve as `approved` unless[\s\S]*correct issue linkage, closing keyword, `type:` label, and organization project/i,
    "Code Reviewer guidance should not block `approved` on organization-project linkage alone.",
  );
  assert.match(
    codeReviewer,
    /(?:organization project(?: set)? should be linked|all selected organization projects should be linked|selected organization-project set should be linked)[\s\S]*(?:when (?:the )?chosen project|when those projects exist|apply (?:all selected projects|the best-fit project) chosen upstream)/i,
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
  assert.match(
    codeReviewer,
    /add_pull_request_to_project[\s\S]*(?:after PR creation|existing surviving PR|keeping an existing surviving PR|live PR-to-project association)|(?:live PR-to-project association)[\s\S]*add_pull_request_to_project/i,
    "Code Reviewer guidance should require using GitHub Sync tooling for newly created and already-existing surviving PRs.",
  );
  assert.match(
    codeReviewer,
    /instead of only naming (?:it|them) in prose|not a substitute for applying (?:the live PR project link|every selected live PR project link)/i,
    "Code Reviewer guidance should say prose-only organization-project notes are insufficient when the live link can be applied.",
  );

  assert.match(
    micronautEngineer,
    /add_pull_request_to_project/i,
    "Micronaut Engineer guidance should include GitHub Sync tooling for PR follow-through repairs.",
  );
  assert.match(
    micronautEngineer,
    /missing the chosen organization project|wrong one after retargeting|repair the live link|instead of only noting the mismatch in comments/i,
    "Micronaut Engineer guidance should repair missing or wrong PR project links instead of only commenting on them.",
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
  assert.match(
    qualityGates,
    /live organization-project association|prose alone is not a substitute|naming the board in prose is not a substitute/i,
    "Quality gates should distinguish a live PR project association from prose-only notes.",
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
  assert.match(
    repoOperations,
    /list_organization_projects[\s\S]*(?:organization-project lookup|PR-to-project association|add_pull_request_to_project)|add_pull_request_to_project[\s\S]*(?:organization-project lookup|PR-to-project association|list_organization_projects)/i,
    "Repo operations should keep organization-project lookup and linking on GitHub Sync tools.",
  );
  assert.match(
    repoOperations,
    /not a substitute for the live PR association|instead of only naming the target board in prose/i,
    "Repo operations should say prose-only organization-project notes are not enough when the link can be applied.",
  );
  assert.match(
    repoOperations,
    /Do not use `?gh`? as (?:an API |a )?fallback|do not[\s\S]{0,120}`?git push`?/i,
    "Repo operations should keep GitHub API work and branch publication on plugin tools.",
  );
});

test("organization-project selection can require GA plus prerelease boards", async () => {
  const requiredFiles = [
    "README.md",
    "COMPANY.md",
    "agents/qa-engineer/AGENTS.md",
    "agents/code-reviewer/AGENTS.md",
    "agents/micronaut-engineer/AGENTS.md",
    "skills/micronaut-repo-operations/references/pr-delivery-evidence.md",
    "skills/micronaut-quality-gates/SKILL.md",
  ];

  for (const relativePath of requiredFiles) {
    const markdown = await readRepoFile(relativePath);

    assert.match(
      markdown,
      /(?:GA|general availability|Release)[\s\S]{0,260}(?:milestone|release candidate|RC)[\s\S]{0,260}(?:both|all matching|multiple|set of)|(?:milestone|release candidate|RC)[\s\S]{0,260}(?:GA|general availability|Release)[\s\S]{0,260}(?:both|all matching|multiple|set of)/i,
      `${relativePath} must explain that GA release targets can require linking both GA and prerelease organization projects.`,
    );
    assert.match(
      markdown,
      /5\.0\.0-M3[\s\S]{0,220}5\.0\.0 Release|5\.0\.0 Release[\s\S]{0,220}5\.0\.0-M3/i,
      `${relativePath} must include the Micronaut 5.0.0-M3 plus 5.0.0 Release example.`,
    );
  }
});

test("PRs must receive all selected organization-project links when tooling can apply them", async () => {
  const requiredFiles = [
    "README.md",
    "agents/code-reviewer/AGENTS.md",
    "agents/micronaut-engineer/AGENTS.md",
    "skills/micronaut-repo-operations/references/pr-delivery-evidence.md",
    "skills/micronaut-quality-gates/SKILL.md",
  ];

  for (const relativePath of requiredFiles) {
    const markdown = await readRepoFile(relativePath);

    assert.match(
      markdown,
      /all selected (?:Micronaut )?organization projects|every selected (?:Micronaut )?organization project|selected organization-project set/i,
      `${relativePath} must require applying every selected organization-project link.`,
    );
    assert.match(
      markdown,
      /(?:not|not merely|not only)[\s\S]{0,160}(?:comment|prose|summary|PR description)[\s\S]{0,260}(?:live PR|live association|actual(?:ly)? link|add_pull_request_to_project|gh)|(?:live PR|live association|actual(?:ly)? link|add_pull_request_to_project|gh)[\s\S]{0,260}(?:not|not merely|not only)[\s\S]{0,160}(?:comment|prose|summary|PR description)|(?:comment|prose|summary|PR description)[\s\S]{0,160}not a substitute[\s\S]{0,260}(?:live PR|live association|actual(?:ly)? link|add_pull_request_to_project|gh)/i,
      `${relativePath} must state that comments or prose are not enough when live project links can be applied.`,
    );
  }
});

test("maintainer project retargeting is authoritative after PR creation", async () => {
  const requiredFiles = [
    "README.md",
    "COMPANY.md",
    "agents/code-reviewer/AGENTS.md",
    "agents/micronaut-engineer/AGENTS.md",
    "skills/micronaut-repo-operations/references/pr-delivery-evidence.md",
    "skills/micronaut-quality-gates/SKILL.md",
  ];

  for (const relativePath of requiredFiles) {
    const markdown = await readRepoFile(relativePath);

    assert.match(
      markdown,
      /maintainer[\s\S]{0,320}(?:changes?|changed|retargets?|retargeted|reschedules?|rescheduled)[\s\S]{0,320}(?:organization )?project[\s\S]{0,320}(?:authoritative|wins|preserve|do not restore|must remain)|(?:organization )?project[\s\S]{0,320}(?:changes?|changed|retargets?|retargeted|reschedules?|rescheduled)[\s\S]{0,320}maintainer[\s\S]{0,320}(?:authoritative|wins|preserve|do not restore|must remain)/i,
      `${relativePath} must treat maintainer project retargeting as authoritative.`,
    );
    assert.match(
      markdown,
      /(?:do not|must not|never)[\s\S]{0,260}(?:restore|reapply|re-add|reset)[\s\S]{0,260}(?:QA-selected|original|earlier|initial)[\s\S]{0,260}(?:organization )?project|(?:QA-selected|original|earlier|initial)[\s\S]{0,260}(?:organization )?project[\s\S]{0,260}(?:do not|must not|never)[\s\S]{0,260}(?:restore|reapply|re-add|reset)/i,
      `${relativePath} must forbid restoring original QA-selected project links over a maintainer change.`,
    );
  }
});
