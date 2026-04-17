import process from "node:process";
import {
  deriveVersionFromTag,
  updateCompanyReleaseState,
  writeGithubOutput,
} from "./company-version.mjs";

async function main() {
  const version = deriveVersionFromTag(
    process.argv[2] ?? process.env.GITHUB_REF_NAME,
  );

  await updateCompanyReleaseState(version);
  await writeGithubOutput("version", version);

  process.stdout.write(`${version}\n`);
}

await main();
