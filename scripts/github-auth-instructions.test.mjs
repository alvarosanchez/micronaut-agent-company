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
  /(?:when|if)\s+`?GITHUB_TOKEN`?\s+is not available[\s\S]*(?:use the agent tools below|use the GitHub sync plugin tools|use the GitHub sync plugin agent tools|use the agent tools|must use the GitHub agent tools provided by the sync plugin)|(?:use the agent tools below|use the GitHub sync plugin tools|use the GitHub sync plugin agent tools|use the agent tools|must use the GitHub agent tools provided by the sync plugin)[\s\S]*(?:when|if)\s+`?GITHUB_TOKEN`?\s+is not available/i;
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
const KPI_API_ROUTE_ENDPOINT_PATTERN =
  /\/api\/plugins\/paperclip-github-plugin\/api\/company-metrics\/events/i;
const KPI_API_ROUTE_METRIC_PATTERN = /pull_request_created/i;
const KPI_API_ROUTE_AUTH_PATTERN =
  /authenticated (?:run|runs|deployment|deployments)[\s\S]*(?:gh|gh pr create)|(?:gh|gh pr create)[\s\S]*authenticated/i;
const KPI_API_ROUTE_PLUGIN_EXCEPTION_PATTERN =
  /create_pull_request[\s\S]*(?:records?|recording|automatically)|do not (?:send|post|call)[\s\S]*create_pull_request/i;
const KPI_API_ROUTE_SCOPE_PATTERN =
  /do not (?:send|post|call)[\s\S]*(?:PR edits|comments|review replies|merges)|comments, review replies, or merges/i;
const KPI_API_ROUTE_REASON_PATTERN =
  /GitHub alone cannot attribute|cannot attribute those PRs to Paperclip work|cannot attribute that PR to Paperclip work|cannot tell which pull requests came from a Paperclip company/i;
const KPI_API_ROUTE_KIND_PATTERN =
  /native plugin JSON route[\s\S]*agent auth[\s\S]*not a plugin-tool call or webhook|not a plugin-tool call or webhook[\s\S]*native plugin JSON route[\s\S]*agent auth/i;
const KPI_API_ROUTE_BEARER_AUTH_PATTERN =
  /Authorization:\s*Bearer\s*\$\{PAPERCLIP_API_KEY\}|authorization:\s*Bearer\s*\$\{PAPERCLIP_API_KEY\}|Bearer\s+\$\{PAPERCLIP_API_KEY\}/i;
const KPI_API_ROUTE_AGENT_TOKEN_PATTERN = /PAPERCLIP_API_KEY/i;
const KPI_API_ROUTE_HOST_SCOPE_PATTERN =
  /Paperclip host[\s\S]*authenticates[\s\S]*bearer token[\s\S]*scopes[\s\S]*calling agent's company[\s\S]*rejects[\s\S]*(?:non-agent|cross-company)|host[\s\S]*rejects[\s\S]*(?:non-agent|cross-company)[\s\S]*before (?:the )?(?:plugin )?worker/i;
const KPI_API_ROUTE_COMPANY_ID_PATTERN =
  /companyId[\s\S]*(?:must match|matches) the calling agent's company/i;
const KPI_API_ROUTE_LEGACY_WEBHOOK_PATH_PATTERN =
  /\/api\/plugins\/paperclip-github-plugin\/webhooks\/record-company-metric-event|\/webhooks\/record-company-metric-event/i;
const PR_ISSUE_LINK_ROUTE_PATTERN =
  /\/api\/plugins\/paperclip-github-plugin\/api\/issue-link[\s\S]{0,500}paperclipIssueId[\s\S]{0,500}(?:pullRequestUrl|reference)/i;
const PR_ISSUE_LINK_BEFORE_METRIC_PATTERN =
  /issue-link[\s\S]{0,700}(?:company-metrics\/events|pull_request_created)/i;
const PR_ISSUE_LINK_VERIFICATION_PATTERN =
  /(?:PR creation metric is not the issue link|metric is not the issue link)[\s\S]{0,220}(?:status:\s*"linked"|`status: "linked"`)|(?:status:\s*"linked"|`status: "linked"`)[\s\S]{0,220}(?:tracked by GitHub Sync|GitHub Sync can track)/i;
const GITHUB_SYNC_AGENT_UNLINK_FORBIDDEN_PATTERN =
  /GitHub Sync[\s\S]{0,240}(?:links|issue-link|pull-request-link)[\s\S]{0,240}durable[\s\S]{0,400}Agents[\s\S]{0,240}must not[\s\S]{0,240}(?:unlink|tombstone|delete|deactivate)/i;
const GITHUB_SYNC_OPERATOR_UNLINK_PATTERN =
  /intentional unlinking[\s\S]{0,160}operator UI action|operator UI action[\s\S]{0,160}intentional unlinking/i;
const KPI_API_ROUTE_AGENT_PATHS = [
  "agents/ceo/AGENTS.md",
  "agents/code-reviewer/AGENTS.md",
];

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

function assertPullRequestMetricApiRoutePolicy(markdown, label) {
  assert.match(
    markdown,
    PR_ISSUE_LINK_ROUTE_PATTERN,
    `${label} must create the durable PR-to-Paperclip issue link for gh-created PRs.`,
  );
  assert.match(
    markdown,
    PR_ISSUE_LINK_BEFORE_METRIC_PATTERN,
    `${label} must create the issue link before recording the pull_request_created metric.`,
  );
  assert.match(
    markdown,
    PR_ISSUE_LINK_VERIFICATION_PATTERN,
    `${label} must verify the issue-link response before reporting the PR as tracked.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_ENDPOINT_PATTERN,
    `${label} must mention the company metric plugin API route endpoint.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_METRIC_PATTERN,
    `${label} must mention the pull_request_created metric.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_AUTH_PATTERN,
    `${label} must tie the API route to authenticated gh-based PR creation.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_PLUGIN_EXCEPTION_PATTERN,
    `${label} must explain that create_pull_request already records the metric.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_SCOPE_PATTERN,
    `${label} must limit the API route to PR creation rather than edits, comments, review replies, or merges.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_REASON_PATTERN,
    `${label} must explain why GitHub-side PR creation needs explicit Paperclip attribution.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_KIND_PATTERN,
    `${label} must explain that the metric endpoint is a native plugin JSON route with agent auth.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_BEARER_AUTH_PATTERN,
    `${label} must explain that the metric API route authenticates with Authorization: Bearer \${PAPERCLIP_API_KEY}.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_AGENT_TOKEN_PATTERN,
    `${label} must mention PAPERCLIP_API_KEY for the metric API route.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_HOST_SCOPE_PATTERN,
    `${label} must explain that the Paperclip host authenticates and company-scopes the agent request before worker dispatch.`,
  );
  assert.match(
    markdown,
    KPI_API_ROUTE_COMPANY_ID_PATTERN,
    `${label} must explain that companyId, when present, must match the calling agent's company.`,
  );
  assert.doesNotMatch(
    markdown,
    KPI_API_ROUTE_LEGACY_WEBHOOK_PATH_PATTERN,
    `${label} must not mention the old company metric webhook path.`,
  );
}

function assertGitHubSyncAgentUnlinkPolicy(markdown, label) {
  assert.match(
    markdown,
    GITHUB_SYNC_AGENT_UNLINK_FORBIDDEN_PATTERN,
    `${label} must forbid agents from unlinking or tombstoning GitHub Sync issue/PR links.`,
  );
  assert.match(
    markdown,
    GITHUB_SYNC_OPERATOR_UNLINK_PATTERN,
    `${label} must preserve intentional operator UI unlinking as distinct from agent behavior.`,
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
  assertPullRequestMetricApiRoutePolicy(markdown, "README.md");
});

test("Shared Micronaut repo operations explain PR KPI API route attribution", async () => {
  const markdown = await readFile(
    new URL("../skills/micronaut-repo-operations/SKILL.md", import.meta.url),
    "utf8",
  );

  assertPullRequestMetricApiRoutePolicy(
    markdown,
    "skills/micronaut-repo-operations/SKILL.md",
  );
});

test("GitHub Sync link policy forbids agent unlinking while preserving operator unlinking", async () => {
  const sharedOperations = await readFile(
    new URL("../skills/micronaut-repo-operations/SKILL.md", import.meta.url),
    "utf8",
  );
  assertGitHubSyncAgentUnlinkPolicy(
    sharedOperations,
    "skills/micronaut-repo-operations/SKILL.md",
  );

  const ceoInstructions = await readFile(
    new URL("../agents/ceo/AGENTS.md", import.meta.url),
    "utf8",
  );
  const { body } = parseFrontmatter(ceoInstructions);
  assertGitHubSyncAgentUnlinkPolicy(body, "agents/ceo/AGENTS.md");
});

test("PR-creating agents explain the authenticated PR KPI API route rule", async () => {
  for (const relativePath of KPI_API_ROUTE_AGENT_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const { body } = parseFrontmatter(markdown);

    assertPullRequestMetricApiRoutePolicy(body, relativePath);
  }
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
