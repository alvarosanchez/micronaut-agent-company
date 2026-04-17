import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";

import {
  determineAutoReleasePlan,
  maybeDeriveVersionFromTag,
  readPackageReleaseState,
  updateCompanyReleaseState,
  writeGithubOutput,
} from "./company-version.mjs";

const execFileAsync = promisify(execFile);

async function readLatestSemverTagVersion() {
  const { stdout } = await execFileAsync("git", ["tag", "--sort=-v:refname"]);

  for (const line of stdout.split(/\r?\n/)) {
    const version = maybeDeriveVersionFromTag(line);
    if (version) {
      return version;
    }
  }

  return "";
}

async function main() {
  const { version: currentVersion, nextVersion: configuredNextVersion } =
    await readPackageReleaseState();
  const { releaseVersion, nextDevelopmentVersion } = determineAutoReleasePlan(
    currentVersion,
    configuredNextVersion,
    await readLatestSemverTagVersion(),
  );

  await updateCompanyReleaseState(releaseVersion, nextDevelopmentVersion);
  await writeGithubOutput("version", releaseVersion);

  process.stdout.write(`${releaseVersion}\n`);
}

await main();
