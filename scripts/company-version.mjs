import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..");

const SEMVER_VERSION_SOURCE =
  "\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?";
const SEMVER_COMPONENT_PATTERN =
  /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-(?<prerelease>[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+(?<build>[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const PATCHABLE_VERSION_PATTERN =
  /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const SEMVER_TAG_PATTERN = new RegExp(`^v?(${SEMVER_VERSION_SOURCE})$`);

async function updateJsonFile(relativePath, mutate) {
  const absolutePath = path.join(repoRoot, relativePath);
  const document = JSON.parse(await readFile(absolutePath, "utf8"));
  mutate(document);
  await writeFile(absolutePath, `${JSON.stringify(document, null, 2)}\n`);
}

async function updateCompanyMarkdown(version) {
  const absolutePath = path.join(repoRoot, "COMPANY.md");
  const markdown = (await readFile(absolutePath, "utf8")).replace(/\r\n/g, "\n");
  const frontmatterMatch = markdown.match(/^(---\n)([\s\S]*?\n)(---\n?[\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error("COMPANY.md is missing YAML frontmatter.");
  }

  const [, openingFence, frontmatter, remainder] = frontmatterMatch;
  if (!/^version:\s*.+$/m.test(frontmatter)) {
    throw new Error("COMPANY.md frontmatter is missing a version field.");
  }

  const nextFrontmatter = frontmatter.replace(
    /^version:\s*.+$/m,
    `version: ${version}`,
  );

  await writeFile(
    absolutePath,
    `${openingFence}${nextFrontmatter}${remainder}`,
  );
}

export function deriveVersionFromTag(rawTag) {
  const tag = rawTag?.trim();
  if (!tag) {
    throw new Error(
      "Expected a Git tag as the first argument or via GITHUB_REF_NAME.",
    );
  }

  const match = tag.match(SEMVER_TAG_PATTERN);
  if (!match) {
    throw new Error(
      `Unsupported release tag "${tag}". Use SemVer tags like 1.2.3 or v1.2.3.`,
    );
  }

  return match[1];
}

export function maybeDeriveVersionFromTag(rawTag) {
  try {
    return deriveVersionFromTag(rawTag);
  } catch {
    return "";
  }
}

export function normalizeVersion(rawVersion) {
  const version = rawVersion?.trim();
  if (!version) {
    throw new Error("Expected a SemVer version.");
  }

  return deriveVersionFromTag(version);
}

export function incrementPatchVersion(rawVersion) {
  const version = normalizeVersion(rawVersion);
  const match = version.match(PATCHABLE_VERSION_PATTERN);

  if (!match) {
    throw new Error(
      `Unsupported package version "${version}". Expected a SemVer value.`,
    );
  }

  const [, major, minor, patch] = match;

  return `${major}.${minor}.${Number(patch) + 1}`;
}

export function determineNextVersion(rawVersion) {
  return incrementPatchVersion(rawVersion);
}

function parseVersion(rawVersion) {
  const version = normalizeVersion(rawVersion);
  const match = version.match(SEMVER_COMPONENT_PATTERN);

  if (!match?.groups) {
    throw new Error(`Unsupported SemVer value "${version}".`);
  }

  return {
    major: Number(match.groups.major),
    minor: Number(match.groups.minor),
    patch: Number(match.groups.patch),
    prerelease: match.groups.prerelease?.split(".") ?? [],
  };
}

function comparePrereleaseIdentifiers(left, right) {
  const leftIsNumeric = /^\d+$/.test(left);
  const rightIsNumeric = /^\d+$/.test(right);

  if (leftIsNumeric && rightIsNumeric) {
    return Math.sign(Number(left) - Number(right));
  }

  if (leftIsNumeric) {
    return -1;
  }

  if (rightIsNumeric) {
    return 1;
  }

  return Math.sign(left.localeCompare(right));
}

export function compareVersions(leftVersion, rightVersion) {
  const left = parseVersion(leftVersion);
  const right = parseVersion(rightVersion);

  for (const field of ["major", "minor", "patch"]) {
    const comparison = Math.sign(left[field] - right[field]);
    if (comparison !== 0) {
      return comparison;
    }
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0) {
    return 0;
  }

  if (left.prerelease.length === 0) {
    return 1;
  }

  if (right.prerelease.length === 0) {
    return -1;
  }

  const identifierCount = Math.max(
    left.prerelease.length,
    right.prerelease.length,
  );

  for (let index = 0; index < identifierCount; index += 1) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];

    if (leftIdentifier === undefined) {
      return -1;
    }

    if (rightIdentifier === undefined) {
      return 1;
    }

    const comparison = comparePrereleaseIdentifiers(
      leftIdentifier,
      rightIdentifier,
    );

    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

export function determineAutoReleasePlan(
  rawCurrentVersion,
  rawConfiguredNextVersion,
  rawLatestReleaseVersion,
) {
  const currentVersion = normalizeVersion(rawCurrentVersion);
  const latestReleaseVersion = rawLatestReleaseVersion
    ? normalizeVersion(rawLatestReleaseVersion)
    : "";
  const releaseBaseline =
    latestReleaseVersion &&
    compareVersions(latestReleaseVersion, currentVersion) > 0
      ? latestReleaseVersion
      : currentVersion;
  const releaseVersion = rawConfiguredNextVersion
    ? normalizeVersion(rawConfiguredNextVersion)
    : determineNextVersion(releaseBaseline);

  if (compareVersions(releaseVersion, releaseBaseline) <= 0) {
    throw new Error(
      `Configured nextVersion "${releaseVersion}" must advance past the current release line "${releaseBaseline}".`,
    );
  }

  return {
    releaseVersion,
    nextDevelopmentVersion: determineNextVersion(releaseVersion),
  };
}

export async function readPackageReleaseState() {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  if (typeof packageJson.version !== "string") {
    throw new Error("package.json is missing a string version field.");
  }

  const version = normalizeVersion(packageJson.version);
  const nextVersion =
    typeof packageJson.nextVersion === "string"
      ? normalizeVersion(packageJson.nextVersion)
      : determineNextVersion(version);

  return { version, nextVersion };
}

export async function readPackageVersion() {
  const { version } = await readPackageReleaseState();
  return version;
}

export async function updateCompanyReleaseState(rawVersion, rawNextVersion) {
  const version = normalizeVersion(rawVersion);
  const nextVersion = rawNextVersion
    ? normalizeVersion(rawNextVersion)
    : determineNextVersion(version);

  if (compareVersions(nextVersion, version) <= 0) {
    throw new Error(
      `Configured nextVersion "${nextVersion}" must advance past version "${version}".`,
    );
  }

  await updateJsonFile("package.json", (document) => {
    document.version = version;
    document.nextVersion = nextVersion;
  });

  await updateJsonFile("package-lock.json", (document) => {
    document.version = version;
    if (document.packages?.[""]) {
      document.packages[""].version = version;
    }
  });

  await updateCompanyMarkdown(version);

  return { version, nextVersion };
}

export async function updateCompanyVersion(rawVersion) {
  const { version } = await updateCompanyReleaseState(rawVersion);
  return version;
}

export async function writeGithubOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}
