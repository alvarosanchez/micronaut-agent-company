import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import YAML from "yaml";

import { buildWindow } from "../skills/ceo-issue-history/scripts/issue-history-evidence.mjs";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("the abandoned frequent containment routine is not shipped", async () => {
  const extension = YAML.parse(await read(".paperclip.yaml"));

  assert.equal(extension.routines?.["frequent-ceo-incident-containment"], undefined);
  assert.equal(Object.keys(extension.routines ?? {}).length, 6);
  await assert.rejects(
    access(new URL("tasks/frequent-ceo-incident-containment/TASK.md", root)),
    { code: "ENOENT" },
  );
});

test("monthly CEO evidence no longer exposes containment mode or action manifests", async () => {
  assert.throws(
    () => buildWindow("2026-07-01T00:00:00.000Z", "containment"),
    /mode must be full/i,
  );

  const collector = await read("skills/ceo-issue-history/scripts/issue-history-evidence.mjs");
  assert.doesNotMatch(collector, /actionManifest|CONTAINMENT_WINDOW|mode === ["']containment|full\|containment/);

  for (const relativePath of [
    "README.md",
    "COMPANY.md",
    "agents/ceo/AGENTS.md",
    "tasks/monthly-ceo-self-improvement/TASK.md",
    "skills/ceo-issue-history/SKILL.md",
    "skills/micronaut-repo-operations/references/internal-routines-overlays.md",
  ]) {
    const source = await read(relativePath);
    assert.doesNotMatch(source, /frequent CEO incident containment|frequent-ceo-incident-containment|containment-only|twelve containment runs|\[asOf-6h,asOf\)/i, relativePath);
  }
});
