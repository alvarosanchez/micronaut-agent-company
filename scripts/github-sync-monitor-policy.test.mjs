import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const MONITOR_BOUNDARY_PATTERN =
  /(?:do not|must not|never)[\s\S]{0,160}(?:Paperclip )?issue monitors?[\s\S]{0,260}(?:GitHub[- ]synced PR state|PR CI|CI\/check status|review threads?|mergeability)|(?:Paperclip )?issue monitors?[\s\S]{0,180}(?:only|remain)[\s\S]{0,180}(?:non-GitHub|external conditions)/i;
const GITHUB_SYNC_PR_STATE_PATTERN =
  /(?:CI\/check status|mergeability|PR file state|review threads?)[\s\S]{0,260}(?:GitHub Sync|GitHub sync|paperclip-github-plugin|`gh`|\bgh\b)/i;

const AGENT_PATHS = [
  "../agents/architect/AGENTS.md",
  "../agents/ceo/AGENTS.md",
  "../agents/code-reviewer/AGENTS.md",
  "../agents/micronaut-engineer/AGENTS.md",
  "../agents/product-manager/AGENTS.md",
  "../agents/qa-engineer/AGENTS.md",
  "../agents/security-engineer/AGENTS.md",
  "../agents/technical-writer/AGENTS.md",
];

test("GitHub-synced PR monitor policy is centralized and delegated by every agent", async () => {
  const authoritativePaths = [
    "../README.md",
    "../COMPANY.md",
    "../skills/micronaut-github-operations/SKILL.md",
  ];

  for (const relativePath of authoritativePaths) {
    const markdown = await read(relativePath);
    assert.match(markdown, MONITOR_BOUNDARY_PATTERN, `${relativePath} must define the monitor boundary.`);
    assert.match(markdown, GITHUB_SYNC_PR_STATE_PATTERN, `${relativePath} must route PR state through GitHub Sync.`);
  }

  for (const relativePath of AGENT_PATHS) {
    assert.match(
      await read(relativePath),
      /Apply the shared `micronaut-github-operations` skill as the authoritative[\s\S]{0,220}monitoring/i,
      `${relativePath} must delegate the monitor boundary to the shared skill.`,
    );
  }
});
