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
const GFM_FOOTER_PATTERN = /GitHub-flavored Markdown footer|Markdown footer/i;
const HORIZONTAL_RULE_PATTERN = /`---` on its own line|`---` plus|^---$/m;
const BLANK_LINE_PATTERN =
  /one blank line|blank line before the footer|separated from the previous sentence by one blank line|separate the footer from the previous sentence with one blank line/i;
const AI_FOOTER_PATTERN = /######\s*✨\s*This message was AI-generated using <exact model id>/i;
const PLUGIN_AUTO_FOOTER_PATTERN =
  /do not add that footer manually when you use the GitHub sync plugin tools|plugin appends the same footer automatically|plugin appends the footer automatically|plugin appends it automatically/i;
const KPI_WEBHOOK_ENDPOINT_PATTERN =
  /record-company-metric-event|\/api\/plugins\/paperclip-github-plugin\/webhooks\/record-company-metric-event/i;
const KPI_WEBHOOK_METRIC_PATTERN = /pull_request_created/i;
const KPI_WEBHOOK_AUTH_PATTERN =
  /authenticated (?:run|runs|deployment|deployments)[\s\S]*(?:gh|gh pr create)|(?:gh|gh pr create)[\s\S]*authenticated/i;
const KPI_WEBHOOK_PLUGIN_EXCEPTION_PATTERN =
  /create_pull_request[\s\S]*(?:records?|recording|automatically)|do not (?:send|post|call)[\s\S]*create_pull_request/i;
const KPI_WEBHOOK_SCOPE_PATTERN =
  /do not (?:send|post|call)[\s\S]*(?:PR edits|comments|review replies|merges)|comments, review replies, or merges/i;
const KPI_WEBHOOK_REASON_PATTERN =
  /GitHub alone cannot attribute|cannot attribute those PRs to Paperclip work|cannot attribute that PR to Paperclip work|cannot tell which pull requests came from a Paperclip company/i;
const KPI_WEBHOOK_NO_AUTH_PATTERN =
  /plugin webhook, not a plugin-tool call|do not need to add an agent JWT|do not add an agent JWT|do not need to add an agent JWT or board-session header|do not add an agent JWT or board-session header/i;
const KPI_WEBHOOK_SIGNATURE_HEADER_PATTERN =
  /x-paperclip-github-sync-timestamp|x-paperclip-github-sync-signature/i;
const KPI_WEBHOOK_SIGNATURE_FORMAT_PATTERN =
  /sha256=<hex-hmac>|sha256=<hex hmac>|sha256=\$|sha256=.*hmac|HMAC/i;
const KPI_WEBHOOK_GITHUB_TOKEN_SIGNING_PATTERN =
  /same company `?GITHUB_TOKEN`?|using .*GITHUB_TOKEN|with the same company `?GITHUB_TOKEN`?/i;
const KPI_WEBHOOK_RAW_BODY_PATTERN =
  /exact JSON (?:payload|string|body).*(?:rawBody)|using the exact JSON payload string sent as `rawBody`|exact JSON body you send as `rawBody`/i;
const KPI_WEBHOOK_AGENT_PATHS = [
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

function assertPullRequestMetricWebhookPolicy(markdown, label) {
  assert.match(
    markdown,
    KPI_WEBHOOK_ENDPOINT_PATTERN,
    `${label} must mention the company metric webhook endpoint.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_METRIC_PATTERN,
    `${label} must mention the pull_request_created metric.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_AUTH_PATTERN,
    `${label} must tie the webhook to authenticated gh-based PR creation.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_PLUGIN_EXCEPTION_PATTERN,
    `${label} must explain that create_pull_request already records the metric.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_SCOPE_PATTERN,
    `${label} must limit the webhook to PR creation rather than edits, comments, review replies, or merges.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_REASON_PATTERN,
    `${label} must explain why GitHub-side PR creation needs explicit Paperclip attribution.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_NO_AUTH_PATTERN,
    `${label} must explain that the metric webhook does not need an agent JWT or board-session header.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_SIGNATURE_HEADER_PATTERN,
    `${label} must mention the timestamp and signature headers for the metric webhook.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_SIGNATURE_FORMAT_PATTERN,
    `${label} must explain that the metric webhook uses an HMAC sha256 signature.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_GITHUB_TOKEN_SIGNING_PATTERN,
    `${label} must explain that the metric webhook is signed with the company GITHUB_TOKEN.`,
  );
  assert.match(
    markdown,
    KPI_WEBHOOK_RAW_BODY_PATTERN,
    `${label} must explain that the signature is computed over the exact JSON payload sent as rawBody.`,
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
    if (ORGANIZATION_PROJECT_AGENT_PATHS.has(relativePath)) {
      assert.match(
        body,
        /organization-project lookup|live PR association|project link/i,
        `${relativePath} must mention organization-project lookup or linking.`,
      );
      assert.match(
        body,
        /authenticated deployments[\s\S]*gh[\s\S]*(organization-project lookup|live PR association|project link)/i,
        `${relativePath} must keep organization-project actions on gh for authenticated runs.`,
      );
      assert.match(
        body,
        /only unauthenticated Paperclip instances can call the sync plugin agent tools directly/i,
        `${relativePath} must reserve sync plugin tools for unauthenticated runs.`,
      );
    }
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
  assert.match(
    markdown,
    /authenticated deployments[\s\S]*gh[\s\S]*(organization-project lookup|live PR association|PR-to-project association)/i,
  );
  assert.match(
    markdown,
    /only unauthenticated Paperclip instances can call the sync plugin agent tools directly|On unauthenticated deployments, use the agent tools below/i,
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
  assertPullRequestMetricWebhookPolicy(markdown, "README.md");
});

test("Shared Micronaut repo operations explain PR KPI webhook attribution", async () => {
  const markdown = await readFile(
    new URL("../skills/micronaut-repo-operations/SKILL.md", import.meta.url),
    "utf8",
  );

  assertPullRequestMetricWebhookPolicy(
    markdown,
    "skills/micronaut-repo-operations/SKILL.md",
  );
});

test("PR-creating agents explain the authenticated PR KPI webhook rule", async () => {
  for (const relativePath of KPI_WEBHOOK_AGENT_PATHS) {
    const markdown = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const { body } = parseFrontmatter(markdown);

    assertPullRequestMetricWebhookPolicy(body, relativePath);
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
