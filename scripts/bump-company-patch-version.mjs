import process from "node:process";

import {
  incrementPatchVersion,
  readPackageVersion,
  updateCompanyVersion,
  writeGithubOutput,
} from "./company-version.mjs";

async function main() {
  const version = incrementPatchVersion(await readPackageVersion());

  await updateCompanyVersion(version);
  await writeGithubOutput("version", version);

  process.stdout.write(`${version}\n`);
}

await main();
