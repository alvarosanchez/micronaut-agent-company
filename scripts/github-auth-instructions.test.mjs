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
const ORGANIZATION_PROJECT_AGENT_PATHS = new Set([
  "agents/code-reviewer/AGENTS.md",
  "agents/micronaut-engineer/AGENTS.md",
]);
const TOKEN_PRESENT_GH_PATTERN =
  /(?:when|if)\s+`?GITHUB_TOKEN`?\s+(?:is present|is available)[\s\S]*(?:prefer|use)[\s\S]*\bgh\b|`?GITHUB_TOKEN`?-backed runs[\s\S]*\bgh\b/i;
const TOKEN_ABSENT_AGENT_TOOLS_PATTERN =
  /(?:when|if)\s+`?GITHUB_TOKEN`?\s+is not available[\s\S]*(?:use the agent tools below|use the GitHub sync plugin tools|use the GitHub sync plugin agent tools|use the agent tools|must use the GitHub agent tools provided by the sync plugin)|(?:use the agent tools below|use the GitHub sync plugin tools|use the GitHub sync plugin agent tools|use the agent tools|must use the GitHub agent tools provided by the sync plugin)[\s\S]*(?:when|if)\s+`?GITHUB_TOKEN`?\s+is not available|otherwise,\s*use the GitHub sync plugin tools/i;
const ENV_VAR_ONLY_PATTERN =
  /GITHUB_TOKEN[\s\S]*(environment variable|env var)|environment variable[\s\S]*GITHUB_TOKEN/i;
const NO_FILESYSTEM_TOKEN_SEARCH_PATTERN =
  /do not search the filesystem, plugin config, or other files for a token|must not search the filesystem, plugin config, or other files for a token/i;
const GFM_FOOTER_PATTERN = /GitHub-flavored Markdown footer|Markdown footer/i;
const HORIZONTAL_RULE_PATTERN = /`---` on its own line|`---` plus|^---$/m;
const BLANK_LINE_PATTERN =
  /one blank line|blank line before the footer|separated from the previous sentence by one blank line|separate the footer from the previous sentence with one blank line/i;
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
    BLANK_LINE_PATTERN,
    `${label} must mention that the footer is separated from the previous sentence by one blank line.`,
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

test("GitHub-capable agents describe GITHUB_TOKEN-based GitHub access behavior", async () => {
  for (const relativePath of GITHUB_AGENT_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const { body } = parseFrontmatter(markdown);

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
      TOKEN_PRESENT_GH_PATTERN,
      `${relativePath} must explain that gh is used only when GITHUB_TOKEN is available.`,
    );
    assert.match(
      body,
      TOKEN_ABSENT_AGENT_TOOLS_PATTERN,
      `${relativePath} must tell agents to use the GitHub sync agent tools when GITHUB_TOKEN is unavailable.`,
    );
    assert.match(
      body,
      ENV_VAR_ONLY_PATTERN,
      `${relativePath} must clarify that GITHUB_TOKEN refers to the environment variable.`,
    );
    assert.match(
      body,
      NO_FILESYSTEM_TOKEN_SEARCH_PATTERN,
      `${relativePath} must forbid searching the filesystem or plugin config for a token.`,
    );
    if (ORGANIZATION_PROJECT_AGENT_PATHS.has(relativePath)) {
      assert.match(
        body,
        /organization-project lookup|live PR association|project link/i,
        `${relativePath} must mention organization-project lookup or linking.`,
      );
      assert.match(
        body,
        /(?:when|if)\s+`?GITHUB_TOKEN`?\s+(?:is present|is available)[\s\S]*gh[\s\S]*(organization-project lookup|live PR association|project link)|`?GITHUB_TOKEN`?-backed runs[\s\S]*gh[\s\S]*(organization-project lookup|live PR association|project link)/i,
        `${relativePath} must keep organization-project actions on gh when GITHUB_TOKEN is available.`,
      );
      assert.match(
        body,
        /(?:when|if)\s+`?GITHUB_TOKEN`?\s+is not available[\s\S]*(list_organization_projects|add_pull_request_to_project|organization project)|(?:list_organization_projects|add_pull_request_to_project)[\s\S]*(?:when|if)\s+`?GITHUB_TOKEN`?\s+is not available/i,
        `${relativePath} must use sync plugin tools for organization-project work when GITHUB_TOKEN is unavailable.`,
      );
    }
    assertDirectGithubFooterPolicy(
      body,
      relativePath,
    );
  }
});

test("Shared Micronaut repo operations explain the GITHUB_TOKEN GitHub access split", async () => {
  const markdown = await readFile(
    new URL("../skills/micronaut-repo-operations/SKILL.md", import.meta.url),
    "utf8",
  );

  assert.match(markdown, /GITHUB_TOKEN/);
  assert.match(markdown, /\bgh\b.*CLI|CLI.*\bgh\b/i);
  assert.match(markdown, TOKEN_PRESENT_GH_PATTERN);
  assert.match(markdown, TOKEN_ABSENT_AGENT_TOOLS_PATTERN);
  assert.match(markdown, ENV_VAR_ONLY_PATTERN);
  assert.match(markdown, NO_FILESYSTEM_TOKEN_SEARCH_PATTERN);
  assert.doesNotMatch(
    markdown,
    /only unauthenticated Paperclip instances can call the sync plugin agent tools directly|On unauthenticated deployments, use the agent tools below/i,
  );
  assert.match(
    markdown,
    /(?:when|if)\s+`?GITHUB_TOKEN`?\s+(?:is present|is available)[\s\S]*gh[\s\S]*(organization-project lookup|live PR association|PR-to-project association)|`?GITHUB_TOKEN`?-backed runs[\s\S]*gh[\s\S]*(organization-project lookup|live PR association|PR-to-project association)/i,
  );
  assert.match(
    markdown,
    /(?:when|if)\s+`?GITHUB_TOKEN`?\s+is not available[\s\S]*(organization-project lookup|PR-to-project association|add_pull_request_to_project|list_organization_projects)/i,
  );
  assertDirectGithubFooterPolicy(
    markdown,
    "skills/micronaut-repo-operations/SKILL.md",
  );
});

test("README documents the direct GitHub footer rule and plugin fallback", async () => {
  const markdown = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );

  assert.match(markdown, /GITHUB_TOKEN/);
  assert.match(markdown, /\bgh\b.*GitHub|GitHub.*\bgh\b/i);
  assert.match(markdown, TOKEN_ABSENT_AGENT_TOOLS_PATTERN);
  assert.match(markdown, ENV_VAR_ONLY_PATTERN);
  assert.match(markdown, NO_FILESYSTEM_TOKEN_SEARCH_PATTERN);
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
  assert.match(
    frontmatter.description,
    /If (?:`?GITHUB_TOKEN`?|that environment variable) is not available, use the GitHub sync plugin agent tools instead/i,
  );
  assert.match(frontmatter.description, ENV_VAR_ONLY_PATTERN);
  assert.match(frontmatter.description, NO_FILESYSTEM_TOKEN_SEARCH_PATTERN);
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
