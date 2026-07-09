import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ROUTINE_VERIFIED_NO_OP_PATTERN } from "./routine-no-op-patterns.mjs";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const ROUTINE_MANAGED_REPO_QA_INTAKE_PATTERN =
  /routine[\s\S]{0,520}(?:implementation-ready|source work|managed-repository)[\s\S]{0,520}(?:managed-repository|source work|delivery issue)[\s\S]{0,520}(?:(?:QA intake|assignee QA|qa-engineer)[\s\S]{0,520}(?:workMode:\s*standard|standard work mode)|(?:workMode:\s*standard|standard work mode)[\s\S]{0,520}(?:QA intake|assignee QA|qa-engineer))/i;
const ROUTINE_NO_DIRECT_ENGINEER_PATTERN =
  /routine[\s\S]{0,420}(?:must not|do not|instead of)[\s\S]{0,260}(?:directly )?(?:assign|assigned)[\s\S]{0,220}(?:Micronaut Engineer|Technical Writer|implementation owner)|(?:Micronaut Engineer|Technical Writer|implementation owner)[\s\S]{0,260}(?:must not|do not|instead of)[\s\S]{0,260}(?:directly )?(?:assign|assigned)/i;
const ROUTINE_NORMAL_DELIVERY_PATH_PATTERN =
  /QA[\s\S]{0,180}(?:planning when needed|planning)[\s\S]{0,180}implementation[\s\S]{0,180}QA verification[\s\S]{0,180}security[\s\S]{0,180}code-review|normal delivery path[\s\S]{0,360}(?:QA verification|security review|code review|PR creation)|(?:QA-selected route|QA classification)[\s\S]{0,520}(?:routine bugs|compatible dependency)[\s\S]{0,260}(?:skip|without) Architect[\s\S]{0,520}(?:architectural|migration)[\s\S]{0,220}Architect[\s\S]{0,520}Security/i;
const ROUTINE_PR_OR_NO_PR_DECISION_PATTERN =
  /(?:not complete|complete)[\s\S]{0,420}(?:linked PR|PR exists|pull request)[\s\S]{0,420}(?:no-diff|no-PR|blocker)|(?:linked PR|PR exists|pull request)[\s\S]{0,420}(?:no-diff|no-PR|blocker)[\s\S]{0,420}(?:not complete|complete)/i;

test("routine-created managed repository work enters QA and PR routing", async () => {
  const requiredPaths = [
    "../README.md",
    "../COMPANY.md",
    "../skills/micronaut-repo-operations/references/internal-routines-overlays.md",
  ];

  for (const relativePath of requiredPaths) {
    const markdown = await read(relativePath);

    assert.match(
      markdown,
      ROUTINE_MANAGED_REPO_QA_INTAKE_PATTERN,
      `${relativePath} must require routine-created managed-repository source work to enter QA intake with standard work mode.`,
    );
    assert.match(
      markdown,
      ROUTINE_NO_DIRECT_ENGINEER_PATTERN,
      `${relativePath} must prevent routines from assigning implementation-ready source work directly to an implementation owner.`,
    );
    assert.match(
      markdown,
      ROUTINE_NORMAL_DELIVERY_PATH_PATTERN,
      `${relativePath} must route routine-created source work through the normal delivery gates.`,
    );
    assert.match(
      markdown,
      ROUTINE_PR_OR_NO_PR_DECISION_PATTERN,
      `${relativePath} must require a linked PR, no-diff/no-PR decision, or blocker before routine-created source work is complete.`,
    );
    assert.match(
      markdown,
      ROUTINE_VERIFIED_NO_OP_PATTERN,
      `${relativePath} must allow verified routine no-diff/no-PR work to close without board approval instead of flowing through empty QA/Security/Review gates.`,
    );
  }

  assert.match(
    await read("../agents/micronaut-engineer/AGENTS.md"),
    ROUTINE_VERIFIED_NO_OP_PATTERN,
    "Micronaut Engineer instructions must close verified routine no-diff/no-PR work without board approval instead of flowing through empty QA/Security/Review gates.",
  );
});
