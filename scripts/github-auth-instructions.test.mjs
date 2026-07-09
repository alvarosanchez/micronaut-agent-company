import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const GH_CLI_SKILL = "gh-cli";
const SHARED_GITHUB_SKILL = "micronaut-github-operations";
const GITHUB_AGENT_PATHS = [
  "agents/architect/AGENTS.md",
  "agents/code-reviewer/AGENTS.md",
  "agents/micronaut-engineer/AGENTS.md",
  "agents/product-manager/AGENTS.md",
  "agents/qa-engineer/AGENTS.md",
  "agents/security-engineer/AGENTS.md",
  "agents/technical-writer/AGENTS.md",
];
const ORGANIZATION_PROJECT_AGENT_PATHS = new Set([
  "agents/micronaut-engineer/AGENTS.md",
]);
const ORGANIZATION_PROJECT_REVIEWER_PATH = "agents/code-reviewer/AGENTS.md";
const NO_GH_FALLBACK_PATTERN =
  /do not use `?gh`? as (?:an API |a )?fallback|do not use \bgh\b as (?:an API |a )?fallback/i;
const PLUGIN_TOOLS_REQUIRED_PATTERN =
  /use (?:the )?(?:GitHub Sync plugin agent tools|GitHub Sync plugin tools|GitHub agent tools provided by the sync plugin)[\s\S]{0,240}(?:GitHub API|reads and writes|operations)/i;
const MCP_BRIDGED_TOOL_PATTERN =
  /mcp_paperclip_plugin_tools|MCP-bridged runtime names|Paperclip plugin-tools MCP bridge/i;
const NO_PROPAGATED_TOKEN_PATTERN =
  /do not depend on a propagated `?GITHUB_TOKEN`?|never depend on a propagated `?GITHUB_TOKEN`?/i;
const NO_FILESYSTEM_TOKEN_SEARCH_PATTERN =
  /do not search the filesystem, plugin config, or other files for a token|must not search the filesystem, plugin config, or other files for a token/i;
const ATOMIC_CREATE_PULL_REQUEST_PATTERN =
  /create_pull_request[\s\S]{0,900}(?:headCommitSha|exact full (?:branch-tip )?(?:commit )?SHA)[\s\S]{0,900}(?:publishes|publish)[\s\S]{0,400}(?:creates|creating|PR)/i;
const DURABLE_OWNER_ARGUMENT_PATTERN =
  /(?:followThroughAssigneeAgentId[\s\S]{0,180}(?:Paperclip agent UUID|owner's Paperclip agent UUID)|Paperclip agent UUID[\s\S]{0,180}followThroughAssigneeAgentId)/i;
const DURABLE_OWNER_LIFECYCLE_PATTERN =
  /same UUID[\s\S]{0,120}idempotent[\s\S]{0,500}omitting `followThroughAssigneeAgentId`[\s\S]{0,240}preserves[\s\S]{0,240}explicit `null`[\s\S]{0,240}(?:removes|clear)/i;
const DURABLE_OWNER_MAINTAINER_WAIT_PATTERN =
  /do not clear the durable owner[\s\S]{0,260}(?:clean|green)[\s\S]{0,260}maintainer review/i;
const NO_AGENT_GIT_PUSH_PATTERN =
  /do not[\s\S]{0,120}(?:run )?`?git push`?|must not[\s\S]{0,120}(?:run )?`?git push`?/i;
const NO_CREDENTIAL_INSPECTION_PATTERN =
  /do not inspect credentials|(?:or|,)\s*inspect credentials|must not (?:print|inspect|copy|pass) (?:the )?(?:token|credentials?)/i;
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
  /explicit human\/operator exception[\s\S]*(?:non-plugin GitHub client|non-plugin PR creation)|non-plugin GitHub client[\s\S]*explicit human\/operator exception/i;
const KPI_API_ROUTE_PLUGIN_EXCEPTION_PATTERN =
  /create_pull_request[\s\S]*(?:records?|recording|automatically)|do not (?:send|post|call)[\s\S]*create_pull_request/i;
const KPI_API_ROUTE_SCOPE_PATTERN =
  /do not (?:send|post|call)[\s\S]*(?:PR edits|comments|review replies|merges)|comments, review replies, or merges/i;
const KPI_API_ROUTE_REASON_PATTERN =
  /GitHub alone cannot attribute|cannot attribute those PRs to Paperclip work|cannot attribute that PR to Paperclip work|cannot tell which pull requests came from a Paperclip company/i;
const KPI_API_ROUTE_KIND_PATTERN =
  /native plugin JSON route[\s\S]*agent auth[\s\S]*not a plugin-tool call or webhook|not a plugin-tool call or webhook[\s\S]*native plugin JSON route[\s\S]*agent auth/i;
const KPI_API_ROUTE_BEARER_AUTH_PATTERN = /Authorization/i;
const KPI_API_ROUTE_AGENT_TOKEN_PATTERN = /PAPERCLIP_API_KEY/i;
const KPI_API_ROUTE_HOST_SCOPE_PATTERN =
  /Paperclip host[\s\S]*authenticates[\s\S]*bearer token[\s\S]*scopes[\s\S]*calling agent's company[\s\S]*rejects[\s\S]*(?:non-agent|cross-company)|host[\s\S]*rejects[\s\S]*(?:non-agent|cross-company)[\s\S]*before (?:the )?(?:plugin )?worker/i;
const KPI_API_ROUTE_COMPANY_ID_PATTERN =
  /companyId[\s\S]*(?:must match|matches) the calling agent's company/i;
const KPI_API_ROUTE_LEGACY_WEBHOOK_PATH_PATTERN =
  /\/api\/plugins\/paperclip-github-plugin\/webhooks\/record-company-metric-event|\/webhooks\/record-company-metric-event/i;
const PR_ISSUE_LINK_TOOL_PATTERN =
  /paperclip-github-plugin:link_github_item[\s\S]{0,500}kind[\s\S]{0,120}pull_request[\s\S]{0,500}paperclipIssueId[\s\S]{0,500}(?:pullRequestUrl|reference)/i;
const PR_ISSUE_LINK_BEFORE_METRIC_PATTERN =
  /(?:link_github_item|durable PR-to-Paperclip link)[\s\S]{0,700}(?:company-metrics\/events|pull_request_created)/i;
const PR_ISSUE_LINK_VERIFICATION_PATTERN =
  /(?:PR creation metric is not the issue link|metric is not the issue link)[\s\S]{0,260}(?:link_github_item|tool)[\s\S]{0,220}(?:status:\s*"linked"|`status: "linked"`)|(?:status:\s*"linked"|`status: "linked"`)[\s\S]{0,260}(?:tracked by GitHub Sync|GitHub Sync can track)/i;
const GITHUB_SYNC_AGENT_UNLINK_FORBIDDEN_PATTERN =
  /GitHub Sync[\s\S]{0,240}(?:links|issue-link|pull-request-link)[\s\S]{0,240}durable[\s\S]{0,400}Agents[\s\S]{0,240}must not[\s\S]{0,240}(?:unlink|tombstone|delete|deactivate)/i;
const GITHUB_SYNC_OPERATOR_UNLINK_PATTERN =
  /intentional unlinking[\s\S]{0,160}operator UI action|operator UI action[\s\S]{0,160}intentional unlinking/i;
const PR_CREATOR_AGENT_PATHS = [
  "agents/micronaut-engineer/AGENTS.md",
  "agents/technical-writer/AGENTS.md",
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
    PR_ISSUE_LINK_TOOL_PATTERN,
    `${label} must create the durable PR-to-Paperclip issue link through the GitHub Sync agent tool for non-plugin PR creation exceptions.`,
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
    `${label} must tie the API route to explicit non-plugin PR creation exceptions.`,
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

test("GitHub-capable agents include the exception-only gh CLI reference and atomic GitHub operations skill", async () => {
  const sharedSkillMarkdown = await readFile(
    new URL("../skills/micronaut-github-operations/SKILL.md", import.meta.url),
    "utf8",
  );
  const { frontmatter: sharedSkillFrontmatter, body: sharedSkillBody } = parseFrontmatter(sharedSkillMarkdown);
  assert.equal(sharedSkillFrontmatter.name, SHARED_GITHUB_SKILL);
  assert.match(sharedSkillBody, /paperclip-github-plugin:/);
  assert.match(sharedSkillBody, /headCommitSha/);
  assert.doesNotMatch(sharedSkillBody, /GITHUB_TOKEN/);

  for (const relativePath of GITHUB_AGENT_PATHS.filter((path) =>
    !path.includes("code-reviewer") && !path.includes("security-engineer")
  )) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const { frontmatter, body } = parseFrontmatter(markdown);

    assert.ok(
      Array.isArray(frontmatter.skills) && frontmatter.skills.includes(GH_CLI_SKILL),
      `${relativePath} must include the ${GH_CLI_SKILL} skill.`,
    );
    assert.ok(
      Array.isArray(frontmatter.skills) && frontmatter.skills.includes(SHARED_GITHUB_SKILL),
      `${relativePath} must include the ${SHARED_GITHUB_SKILL} skill.`,
    );
    assert.match(
      body,
      /Apply the shared `micronaut-github-operations` skill/,
      `${relativePath} must point agents at the shared GitHub operations skill.`,
    );
  }
});

test("GitHub-capable agents delegate common transport policy to the shared skill", async () => {
  const sharedMarkdown = await readFile(
    new URL("../skills/micronaut-github-operations/SKILL.md", import.meta.url),
    "utf8",
  );

  assert.match(sharedMarkdown, NO_GH_FALLBACK_PATTERN);
  assert.match(sharedMarkdown, PLUGIN_TOOLS_REQUIRED_PATTERN);
  assert.match(sharedMarkdown, MCP_BRIDGED_TOOL_PATTERN);
  assert.match(sharedMarkdown, ATOMIC_CREATE_PULL_REQUEST_PATTERN);
  assert.match(sharedMarkdown, NO_AGENT_GIT_PUSH_PATTERN);
  assert.match(sharedMarkdown, NO_CREDENTIAL_INSPECTION_PATTERN);
  assertDirectGithubFooterPolicy(sharedMarkdown, "skills/micronaut-github-operations/SKILL.md");

  for (const relativePath of GITHUB_AGENT_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const { body } = parseFrontmatter(markdown);
    assert.match(body, /Apply the shared `micronaut-github-operations` skill/);
    if (ORGANIZATION_PROJECT_AGENT_PATHS.has(relativePath)) {
      assert.match(body, /organization-project lookup|live PR association|project link/i);
      assert.match(
        body,
        /list_organization_projects[\s\S]{0,520}add_pull_request_to_project|add_pull_request_to_project[\s\S]{0,520}list_organization_projects/i,
      );
    }
    if (relativePath === ORGANIZATION_PROJECT_REVIEWER_PATH) {
      assert.match(body, /list_organization_projects[\s\S]{0,260}verify the selected project set/i);
      assert.doesNotMatch(body, /paperclip-github-plugin:add_pull_request_to_project/i);
    }
  }
});

test("Shared Micronaut repo operations use atomic branch publication and PR creation", async () => {
  const markdown = await readFile(
    new URL("../skills/micronaut-github-operations/SKILL.md", import.meta.url),
    "utf8",
  );

  assert.match(markdown, NO_GH_FALLBACK_PATTERN);
  assert.match(markdown, PLUGIN_TOOLS_REQUIRED_PATTERN);
  assert.match(markdown, MCP_BRIDGED_TOOL_PATTERN);
  assert.match(markdown, ATOMIC_CREATE_PULL_REQUEST_PATTERN);
  assert.match(markdown, NO_AGENT_GIT_PUSH_PATTERN);
  assert.match(markdown, NO_CREDENTIAL_INSPECTION_PATTERN);
  assert.doesNotMatch(
    markdown,
    /only unauthenticated Paperclip instances can call the sync plugin agent tools directly|On unauthenticated deployments, use the agent tools below/i,
  );
  assert.match(
    markdown,
    /list_organization_projects[\s\S]{0,260}add_pull_request_to_project|add_pull_request_to_project[\s\S]{0,260}list_organization_projects/i,
  );
  assertDirectGithubFooterPolicy(
    markdown,
    "skills/micronaut-repo-operations/SKILL.md",
  );
});

test("README documents the direct GitHub footer rule and GitHub Sync tool requirement", async () => {
  const markdown = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );

  assert.match(markdown, NO_GH_FALLBACK_PATTERN);
  assert.match(markdown, PLUGIN_TOOLS_REQUIRED_PATTERN);
  assert.match(markdown, MCP_BRIDGED_TOOL_PATTERN);
  assert.match(markdown, ATOMIC_CREATE_PULL_REQUEST_PATTERN);
  assert.match(markdown, NO_AGENT_GIT_PUSH_PATTERN);
  assert.match(markdown, NO_CREDENTIAL_INSPECTION_PATTERN);
  assertDirectGithubFooterPolicy(markdown, "README.md");
  assertPullRequestMetricApiRoutePolicy(markdown, "README.md");
});

test("Shared Micronaut repo operations explain PR KPI API route attribution", async () => {
  const markdown = await readFile(
    new URL("../skills/micronaut-github-operations/SKILL.md", import.meta.url),
    "utf8",
  );

  assertPullRequestMetricApiRoutePolicy(
    markdown,
    "skills/micronaut-repo-operations/SKILL.md",
  );
});

test("GitHub Sync link policy forbids agent unlinking while preserving operator unlinking", async () => {
  const sharedOperations = await readFile(
    new URL("../skills/micronaut-github-operations/SKILL.md", import.meta.url),
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

test("PR-creating agents use atomic plugin publication and delegate exception attribution", async () => {
  for (const relativePath of PR_CREATOR_AGENT_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const { body } = parseFrontmatter(markdown);
    assert.match(body, /paperclip-github-plugin:create_pull_request/);
    assert.match(body, DURABLE_OWNER_ARGUMENT_PATTERN);
    assert.match(body, /Apply the shared `micronaut-github-operations` skill/);
  }
  const shared = await readFile(new URL("../skills/micronaut-github-operations/SKILL.md", import.meta.url), "utf8");
  assert.match(shared, DURABLE_OWNER_ARGUMENT_PATTERN);
  assert.match(shared, DURABLE_OWNER_LIFECYCLE_PATTERN);
  assert.match(shared, DURABLE_OWNER_MAINTAINER_WAIT_PATTERN);
  assert.match(
    shared,
    /link_github_item[\s\S]{0,500}followThroughAssigneeAgentId/,
    "Out-of-pipeline PR links must persist the implementation owner.",
  );
  assertPullRequestMetricApiRoutePolicy(shared, "skills/micronaut-github-operations/SKILL.md");
});

test("Local gh-cli skill preserves its import identity and pins immutable upstream provenance", async () => {
  const markdown = await readFile(
    new URL("../skills/gh-cli/SKILL.md", import.meta.url),
    "utf8",
  );
  const { frontmatter } = parseFrontmatter(markdown);

  assert.match(frontmatter.description, /GITHUB_TOKEN/);
  assert.match(frontmatter.description, /\bgh\b/i);
  assert.match(frontmatter.description, /explicit human\/operator exceptions/i);
  assert.match(frontmatter.description, /Normal GitHub API operations must use the GitHub Sync plugin tools/i);
  assert.match(frontmatter.description, /MCP-bridged runtime names/i);
  assert.match(frontmatter.description, NO_PROPAGATED_TOKEN_PATTERN);
  assert.match(frontmatter.description, NO_FILESYSTEM_TOKEN_SEARCH_PATTERN);
  assert.match(frontmatter.description, GFM_FOOTER_PATTERN);
  assert.match(frontmatter.description, HORIZONTAL_RULE_PATTERN);
  assert.match(frontmatter.description, AI_FOOTER_PATTERN);
  assert.doesNotMatch(frontmatter.description, /paperclipIssueId/i);
  assert.equal(frontmatter.metadata?.skillKey, "url/skills-sh/98fe50cd5a/gh-cli");
  assert.deepEqual(frontmatter.metadata?.sources, [
    {
      kind: "url",
      url: "https://skills.sh/github/awesome-copilot/gh-cli",
      attribution: "awesome-copilot",
      usage: "identity",
    },
    {
      kind: "github-file",
      repo: "github/awesome-copilot",
      path: "skills/gh-cli/SKILL.md",
      commit: "e9a7805e2b1dbda5ad4d0cc9be1fc3ef6273e115",
      sha256: "18e53a9f4c154406a072ed4cfbc524d40f9a4734ef25102086c1ef5e24113a76",
      attribution: "awesome-copilot",
      usage: "referenced",
    },
  ]);
});
