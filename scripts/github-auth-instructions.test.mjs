import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const GH_CLI_SKILL = "gh-cli";
const GITHUB_AGENT_PATHS = [
  "agents/architect/AGENTS.md",
  "agents/ceo/AGENTS.md",
  "agents/code-reviewer/AGENTS.md",
  "agents/micronaut-engineer/AGENTS.md",
  "agents/qa-engineer/AGENTS.md",
  "agents/security-engineer/AGENTS.md",
  "agents/technical-writer/AGENTS.md",
];
const GFM_FOOTER_PATTERN = /GitHub-flavored Markdown footer|Markdown footer/i;
const HORIZONTAL_RULE_PATTERN = /`---` on its own line|`---` plus|^---$/m;
const AI_FOOTER_PATTERN = /######\s*✨\s*This message was AI-generated using <exact model id>/i;
const PLUGIN_AUTO_FOOTER_PATTERN =
  /do not add that footer manually when you use the GitHub sync plugin tools|plugin appends the same footer automatically|plugin appends the footer automatically|plugin appends it automatically/i;

function assertDirectGithubFooterPolicy(markdown, label) {
  assert.match(
    markdown,
    GFM_FOOTER_PATTERN,
    `${label} must mention that direct GitHub writes use a GitHub-flavored Markdown footer.`,
  );
  assert.match(
    markdown,
    HORIZONTAL_RULE_PATTERN,
    `${label} must mention the horizontal rule in the footer template.`,
  );
  assert.match(
    markdown,
    AI_FOOTER_PATTERN,
    `${label} must mention the exact AI-generated footer text.`,
  );
  assert.match(
    markdown,
    PLUGIN_AUTO_FOOTER_PATTERN,
    `${label} must explain that GitHub sync plugin tools append the footer automatically.`,
  );
}

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(match, "Expected Markdown file to include frontmatter.");
  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

test("GitHub-capable agents include the gh CLI skill", async () => {
  for (const relativePath of GITHUB_AGENT_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const { frontmatter } = parseFrontmatter(markdown);

    assert.ok(
      Array.isArray(frontmatter.skills) && frontmatter.skills.includes(GH_CLI_SKILL),
      `${relativePath} must include the ${GH_CLI_SKILL} skill.`,
    );
  }
});

test("GitHub-capable agents describe authenticated gh CLI fallback behavior", async () => {
  for (const relativePath of GITHUB_AGENT_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const { body } = parseFrontmatter(markdown);

    assert.match(
      body,
      /authenticated deployments/i,
      `${relativePath} must mention authenticated deployments.`,
    );
    assert.match(
      body,
      /GITHUB_TOKEN/,
      `${relativePath} must mention GITHUB_TOKEN.`,
    );
    assert.match(
      body,
      /\bgh\b.*CLI|CLI.*\bgh\b/i,
      `${relativePath} must mention the gh CLI.`,
    );
    assert.match(
      body,
      /on unauthenticated deployments,? use the agent tools|without GITHUB_TOKEN,? use the agent tools|if GITHUB_TOKEN is not available,? use the agent tools|otherwise,? use the agent tools/i,
      `${relativePath} must tell agents to fall back to the GitHub sync agent tools when GITHUB_TOKEN is unavailable.`,
    );
    assert.doesNotMatch(
      body,
      /even when `GITHUB_TOKEN` is available|even when GITHUB_TOKEN is available/i,
      `${relativePath} must not claim the sync plugin tools are available during authenticated gh-based runs.`,
    );
    assertDirectGithubFooterPolicy(
      body,
      relativePath,
    );
  }
});

test("Shared Micronaut repo operations explain the authenticated GitHub access split", async () => {
  const markdown = await readFile(
    new URL("../skills/micronaut-repo-operations/SKILL.md", import.meta.url),
    "utf8",
  );

  assert.match(markdown, /authenticated deployments/i);
  assert.match(markdown, /GITHUB_TOKEN/);
  assert.match(markdown, /\bgh\b.*CLI|CLI.*\bgh\b/i);
  assert.match(
    markdown,
    /on unauthenticated deployments,? use the agent tools|without GITHUB_TOKEN,? use the agent tools|if GITHUB_TOKEN is not available,? use the agent tools|otherwise,? use the agent tools/i,
  );
  assert.doesNotMatch(
    markdown,
    /even when `GITHUB_TOKEN` is available|even when GITHUB_TOKEN is available/i,
  );
  assertDirectGithubFooterPolicy(
    markdown,
    "skills/micronaut-repo-operations/SKILL.md",
  );
});

test("README documents the direct GitHub footer rule and plugin exception", async () => {
  const markdown = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );

  assert.match(markdown, /GITHUB_TOKEN/);
  assert.match(markdown, /\bgh\b.*GitHub|GitHub.*\bgh\b/i);
  assertDirectGithubFooterPolicy(markdown, "README.md");
});

test("Local gh-cli skill points to the requested upstream skill", async () => {
  const markdown = await readFile(
    new URL("../skills/gh-cli/SKILL.md", import.meta.url),
    "utf8",
  );
  const { frontmatter } = parseFrontmatter(markdown);

  assert.match(frontmatter.description, /GITHUB_TOKEN/);
  assert.match(frontmatter.description, /\bgh\b/i);
  assert.match(frontmatter.description, GFM_FOOTER_PATTERN);
  assert.match(frontmatter.description, HORIZONTAL_RULE_PATTERN);
  assert.match(frontmatter.description, AI_FOOTER_PATTERN);
  assert.doesNotMatch(frontmatter.description, /paperclipIssueId/i);
  assert.deepEqual(frontmatter.metadata?.sources, [
    {
      kind: "url",
      url: "https://skills.sh/github/awesome-copilot/gh-cli",
      attribution: "awesome-copilot",
      usage: "referenced",
    },
  ]);
});
