import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readRepoFile(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("README assigns release targeting to QA instead of Architect", async () => {
  const readme = await readRepoFile("README.md");

  assert.match(
    readme,
    /QA Engineer[\s\S]*default-branch and release-fact gathering[\s\S]*SemVer(?:-delta)?(?: targeting|-delta target-branch selection| target-branch selection)[\s\S]*organization-project (?:set )?selection/i,
    "README should say QA intake owns release facts, SemVer target-branch selection, and organization-project selection.",
  );
  assert.doesNotMatch(
    readme,
    /Architect[\s\S]*including the recommended Micronaut organization project when the best-fit release board is clear/i,
    "README should no longer say the Architect originates organization-project selection.",
  );
});

test("repo operations encode current-default-branch SemVer policy", async () => {
  const repoOperations = await readRepoFile("skills/micronaut-repo-operations/references/intake-routing-release.md");

  assert.match(
    repoOperations,
    /Trust the repository's actual current default branch/i,
    "Repo operations should treat the live default branch as the source of truth.",
  );
  assert.match(
    repoOperations,
    /If the current default branch has never been released[\s\S]*type:\s*bug[\s\S]*type:\s*improvement[\s\S]*type:\s*enhancement/i,
    "Repo operations should describe what an unreleased default branch may accept.",
  );
  assert.match(
    repoOperations,
    /If the current default branch has already been released[\s\S]*type:\s*bug[\s\S]*type:\s*improvement[\s\S]*docs,\s*CI,\s*or build-only/i,
    "Repo operations should describe what an already-released default branch may accept.",
  );
  assert.match(
    repoOperations,
    /Do not invent or create another target branch during triage/i,
    "Repo operations should forbid inventing non-default target branches during triage.",
  );
});

test("release targeting is based on next-release SemVer delta, not default branch alone", async () => {
  const readme = await readRepoFile("README.md");
  const company = await readRepoFile("COMPANY.md");
  const qa = await readRepoFile("agents/qa-engineer/AGENTS.md");
  const architect = await readRepoFile("agents/architect/AGENTS.md");
  const codeReviewer = await readRepoFile("agents/code-reviewer/AGENTS.md");
  const micronautEngineer = await readRepoFile("agents/micronaut-engineer/AGENTS.md");
  const repoOperations = await readRepoFile("skills/micronaut-repo-operations/references/intake-routing-release.md");
  const qualityGates = await readRepoFile("skills/micronaut-quality-gates/SKILL.md");

  assert.match(
    repoOperations,
    /SemVer delta[\s\S]*latest stable[\s\S]*next release[\s\S]*target branch/i,
    "Repo operations should frame target-branch selection as a SemVer delta from latest stable to the next release.",
  );
  assert.match(
    repoOperations,
    /latest stable[\s\S]{0,160}1\.2\.3[\s\S]{0,220}next release[\s\S]{0,160}2\.0\.0[\s\S]{0,220}major[\s\S]{0,220}type:\s*bug[\s\S]{0,220}type:\s*improvement[\s\S]{0,220}type:\s*enhancement[\s\S]{0,220}type:\s*breaking/i,
    "Repo operations should include the major-release example and allow every change class, with normal approvals.",
  );
  assert.match(
    repoOperations,
    /latest stable[\s\S]{0,160}1\.2\.3[\s\S]{0,220}next release[\s\S]{0,160}1\.2\.4[\s\S]{0,220}patch[\s\S]{0,220}type:\s*bug[\s\S]{0,220}type:\s*improvement[\s\S]{0,220}docs[\s\S]{0,160}CI[\s\S]{0,160}build[\s\S]{0,220}type:\s*enhancement[\s\S]{0,220}type:\s*breaking[\s\S]{0,220}(?:do not fit|stay off|cannot target)/i,
    "Repo operations should include the patch-release example and exclude enhancements and breaking changes.",
  );
  assert.match(
    repoOperations,
    /latest stable[\s\S]{0,160}1\.2\.3[\s\S]{0,220}next release[\s\S]{0,160}1\.3\.0[\s\S]{0,220}minor[\s\S]{0,220}type:\s*bug[\s\S]{0,220}type:\s*improvement[\s\S]{0,220}type:\s*enhancement[\s\S]{0,220}docs[\s\S]{0,160}CI[\s\S]{0,160}build[\s\S]{0,220}type:\s*breaking[\s\S]{0,220}(?:does not fit|do not fit|stays off|cannot target)/i,
    "Repo operations should include the minor-release example and allow enhancements but exclude breaking changes.",
  );

  for (const [relativePath, markdown] of [
    ["README.md", readme],
    ["COMPANY.md", company],
    ["agents/qa-engineer/AGENTS.md", qa],
    ["agents/architect/AGENTS.md", architect],
    ["skills/micronaut-quality-gates/SKILL.md", qualityGates],
  ]) {
    assert.match(
      markdown,
      /SemVer delta|major\/minor\/patch release target/i,
      `${relativePath} should preserve the major/minor/patch release-target distinction.`,
    );
    assert.match(
      markdown,
      /PR target (?:branch )?is not automatically the default branch|not automatically target the default branch|default branch only when/i,
      `${relativePath} should say PRs do not always target the default branch.`,
    );
  }

  for (const [relativePath, markdown] of [
    ["README.md", readme],
    ["COMPANY.md", company],
    ["agents/qa-engineer/AGENTS.md", qa],
    ["agents/code-reviewer/AGENTS.md", codeReviewer],
    ["agents/micronaut-engineer/AGENTS.md", micronautEngineer],
    ["skills/micronaut-repo-operations/references/intake-routing-release.md", repoOperations],
    ["skills/micronaut-quality-gates/SKILL.md", qualityGates],
  ]) {
    assert.match(
      markdown,
      /Micronaut (?:organization )?projects[\s\S]{0,260}Micronaut Platform[\s\S]{0,260}(?:BOM|bill of materials)[\s\S]{0,260}(?:not|rather than|instead of)[\s\S]{0,260}(?:repository|module|project) version|Micronaut Platform[\s\S]{0,260}(?:BOM|bill of materials)[\s\S]{0,260}(?:not|rather than|instead of)[\s\S]{0,260}(?:repository|module|project) version/i,
      `${relativePath} should explain that organization projects represent Platform BOM versions, not repository module versions.`,
    );
  }

  assert.match(
    qa,
    /record[\s\S]{0,220}SemVer delta[\s\S]{0,220}target branch decision/i,
    "QA should record the SemVer delta and target-branch decision.",
  );
  assert.match(
    architect,
    /alternative target branch[\s\S]{0,220}human-approved|human-approved[\s\S]{0,220}alternative target branch/i,
    "Architect should require approval before replacing the default-branch-derived target.",
  );
  assert.match(
    codeReviewer,
    /approved target branch|QA-selected target branch|upstream-selected target branch/i,
    "Code Reviewer should verify the approved/upstream-selected target branch, not blindly use the default branch.",
  );
  assert.match(
    micronautEngineer,
    /release target changes[\s\S]{0,220}(?:recalculate|re-check|reverify)[\s\S]{0,220}(?:organization-project|project set)|(?:recalculate|re-check|reverify)[\s\S]{0,220}(?:organization-project|project set)[\s\S]{0,220}release target changes/i,
    "Micronaut Engineer should re-check organization projects when release targeting changes during follow-through.",
  );
});

test("release targeting treats milestones and release candidates as prereleases", async () => {
  const readme = await readRepoFile("README.md");
  const company = await readRepoFile("COMPANY.md");
  const qa = await readRepoFile("agents/qa-engineer/AGENTS.md");
  const architect = await readRepoFile("agents/architect/AGENTS.md");
  const repoOperations = await readRepoFile("skills/micronaut-repo-operations/references/intake-routing-release.md");
  const qualityGates = await readRepoFile("skills/micronaut-quality-gates/SKILL.md");

  assert.match(
    readme,
    /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    "README should explain that milestones and release candidates do not count as the default branch having already shipped.",
  );
  assert.match(
    company,
    /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    "COMPANY should explain that milestones and release candidates do not count as the default branch having already shipped.",
  );
  assert.match(
    qa,
    /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    "QA instructions should explain that milestones and release candidates do not count as the default branch having already shipped.",
  );
  assert.match(
    architect,
    /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    "Architect instructions should preserve the prerelease distinction from QA triage.",
  );
  assert.match(
    repoOperations,
    /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    "Repo operations should explain that milestones and release candidates do not count as the default branch having already shipped.",
  );
  assert.match(
    qualityGates,
    /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    "Quality gates should explain that milestones and release candidates do not count as the default branch having already shipped.",
  );
});

test("QA instructions own release facts and initial project choice", async () => {
  const qa = await readRepoFile("agents/qa-engineer/AGENTS.md");

  assert.match(
    qa,
    /identify the repository's actual current default branch[\s\S]*latest stable non-pre-release release[\s\S]*next release implied by that branch/i,
    "QA instructions should require gathering the live default-branch release facts.",
  );
  assert.match(
    qa,
    /choose the recommended Micronaut organization project[\s\S]*best-fit project/i,
    "QA instructions should require choosing the best-fit organization project even when ambiguity remains.",
  );
  assert.match(
    qa,
    /open,\s*public Micronaut organization projects[\s\S]*is:open is:public|is:open is:public[\s\S]*open,\s*public Micronaut organization projects/i,
    "QA instructions should restrict organization-project selection to open, public Micronaut projects.",
  );
});

test("Architect instructions consume QA triage facts instead of recreating them", async () => {
  const architect = await readRepoFile("agents/architect/AGENTS.md");

  assert.match(
    architect,
    /Confirm QA already recorded[\s\S]*recommended Micronaut organization project/i,
    "Architect instructions should start from QA's recorded release and project facts.",
  );
  assert.doesNotMatch(
    architect,
    /Choose the best-fit Micronaut organization project when the eventual release board is clear/i,
    "Architect instructions should no longer originate organization-project selection by default.",
  );
});
