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
    /QA Engineer[\s\S]*default-branch and release-fact gathering[\s\S]*SemVer targeting[\s\S]*organization-project selection/i,
    "README should say QA intake owns release facts, SemVer targeting, and organization-project selection.",
  );
  assert.doesNotMatch(
    readme,
    /Architect[\s\S]*including the recommended Micronaut organization project when the best-fit release board is clear/i,
    "README should no longer say the Architect originates organization-project selection.",
  );
});

test("repo operations encode current-default-branch SemVer policy", async () => {
  const repoOperations = await readRepoFile("skills/micronaut-repo-operations/SKILL.md");

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

test("release targeting treats milestones and release candidates as prereleases", async () => {
  const readme = await readRepoFile("README.md");
  const company = await readRepoFile("COMPANY.md");
  const qa = await readRepoFile("agents/qa-engineer/AGENTS.md");
  const architect = await readRepoFile("agents/architect/AGENTS.md");
  const repoOperations = await readRepoFile("skills/micronaut-repo-operations/SKILL.md");
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
