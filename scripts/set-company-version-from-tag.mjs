import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const SEMVER_TAG_PATTERN =
  /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/;

function deriveVersionFromTag(rawTag) {
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

async function main() {
  const version = deriveVersionFromTag(
    process.argv[2] ?? process.env.GITHUB_REF_NAME,
  );

  await updateJsonFile("package.json", (document) => {
    document.version = version;
  });

  await updateJsonFile("package-lock.json", (document) => {
    document.version = version;
    if (document.packages?.[""]) {
      document.packages[""].version = version;
    }
  });

  await updateCompanyMarkdown(version);

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  }

  process.stdout.write(`${version}\n`);
}

await main();
