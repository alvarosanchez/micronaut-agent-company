import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { compareVersions, determineAutoReleasePlan } from "./company-version.mjs";

test("releases the configured nextVersion and advances the next patch target", () => {
  assert.deepEqual(
    determineAutoReleasePlan("1.0.9", "1.1.0", "1.0.9"),
    {
      releaseVersion: "1.1.0",
      nextDevelopmentVersion: "1.1.1",
    },
  );
});

test("defaults to the next patch when nextVersion is absent", () => {
  assert.deepEqual(
    determineAutoReleasePlan("1.0.9", "", "1.0.9"),
    {
      releaseVersion: "1.0.10",
      nextDevelopmentVersion: "1.0.11",
    },
  );
});

test("falls back to the latest released version when the checked-in version is behind", () => {
  assert.deepEqual(
    determineAutoReleasePlan("1.0.8", "", "1.0.9"),
    {
      releaseVersion: "1.0.10",
      nextDevelopmentVersion: "1.0.11",
    },
  );
});

test("rejects a configured nextVersion that does not advance past the latest release", () => {
  assert.throws(
    () => determineAutoReleasePlan("1.0.9", "1.0.9", "1.0.9"),
    /must advance past the current release line/,
  );
});

test("package.json keeps nextVersion ahead of the current released version", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.equal(
    compareVersions(packageJson.nextVersion, packageJson.version) > 0,
    true,
  );
});
