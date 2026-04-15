import process from "node:process";

import {
  maybeDeriveVersionFromTag,
  writeGithubOutput,
} from "./company-version.mjs";

async function main() {
  const releaseTag = process.argv[2] ?? process.env.RELEASE_TAG ?? "";
  const tag = releaseTag.trim();

  if (!tag) {
    throw new Error("Expected a release tag.");
  }

  const version = maybeDeriveVersionFromTag(tag);

  await writeGithubOutput("tag", tag);
  await writeGithubOutput("version", version);
  await writeGithubOutput("has_version", version ? "true" : "false");

  process.stdout.write(version ? `${version}\n` : "\n");
}

await main();
