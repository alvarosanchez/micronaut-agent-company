---
name: micronaut-github-operations
description: Shared GitHub, GitHub Sync plugin, footer, PR-linking, and review-thread protocol used by Micronaut company agents.
---

# Micronaut GitHub Operations

Use this shared skill for repeated GitHub rules that apply across Micronaut company agents. Role-specific agent files should name only their special cases; this skill is the shared source for the common protocol.

## Role Authority

- Only role-authorized implementation owners and `followThroughOwner` may use GitHub write tools. A listed tool is not permission to use it.
- Security Engineer and Code Reviewer are read-only GitHub gates: they may list and inspect issues, PR state, checks, files, projects, reviewers, and review threads, but must not create or update PRs, comments, assets, links, project associations, or reviewer requests, and must not reply to, resolve, or unresolve review threads.
- When a read-only gate finds a required GitHub mutation, return the exact action to `followThroughOwner`; role-specific restrictions always narrow this shared protocol.

## Access Selection

- Use the GitHub Sync plugin agent tools for covered GitHub API reads. Role-authorized implementation owners and `followThroughOwner` also use them for covered writes, including comments, review-thread follow-through, PR creation/updates, assets, and live organization-project association.
- In Hermes deployments, those tools may be exposed through the Paperclip plugin-tools MCP bridge with sanitized names such as `mcp_paperclip_plugin_tools_paperclip_github_plugin_search_repository_items`; use the actual runtime tool schema name while following the `paperclip-github-plugin:*` contract below.
- Do not use `gh` as a fallback for GitHub API reads/writes, inspect credentials, run `git push`, or search for a GitHub token.
- Role-authorized implementation owners use the local git CLI without GitHub credentials for branch creation, commits, rebases, cherry-picks, and public fetches. Resolve the plain local branch name and exact full branch-tip commit SHA before PR creation.
- A role-authorized implementation owner calls `paperclip-github-plugin:create_pull_request` once with `paperclipIssueId`, `head`, `headCommitSha`, `base`, `title`, and any body/draft metadata. The trusted plugin resolves the issue-scoped workspace and secret, publishes and verifies the exact branch SHA, then creates, links, and attributes the PR.
- If the atomic tool reports a publication failure, preserve the local branch and report the exact plugin error. Do not fall back to `git push`, `gh`, SSH, direct API scripts, or credential searches.

## Footer For Maintainer-Visible GitHub Writes

- When a role-authorized owner has an explicit human/operator exception requiring a non-plugin GitHub write client, separate the footer from the previous sentence with one blank line, then append this exact GitHub-flavored Markdown footer:

```markdown
---
###### ✨ This message was AI-generated using <exact model id>
```

- Do not add that footer manually when you use GitHub Sync plugin tools. Send only the human-facing body and the exact `llmModel`; the plugin appends the footer automatically.

## GitHub Sync Tool Surface

- Use exact runtime tool IDs. Paperclip namespaces plugin tools as `<pluginId>:<toolName>`, and this plugin's manifest id is `paperclip-github-plugin`; Hermes MCP bridge deployments expose the same contracts with sanitized names prefixed by `mcp_paperclip_plugin_tools_`.
- Core tool IDs (availability only; the Role Authority section controls writes): `paperclip-github-plugin:search_repository_items`, `paperclip-github-plugin:get_issue`, `paperclip-github-plugin:list_issue_comments`, `paperclip-github-plugin:update_issue`, `paperclip-github-plugin:add_issue_comment`, `paperclip-github-plugin:create_pull_request`, `paperclip-github-plugin:get_pull_request`, `paperclip-github-plugin:update_pull_request`, `paperclip-github-plugin:list_pull_request_files`, `paperclip-github-plugin:get_pull_request_checks`, `paperclip-github-plugin:list_pull_request_review_threads`, `paperclip-github-plugin:reply_to_review_thread`, `paperclip-github-plugin:resolve_review_thread`, `paperclip-github-plugin:unresolve_review_thread`, `paperclip-github-plugin:request_pull_request_reviewers`, `paperclip-github-plugin:list_organization_projects`, `paperclip-github-plugin:add_pull_request_to_project`, `paperclip-github-plugin:upload_pull_request_asset`, and `paperclip-github-plugin:link_github_item`.
- Prefer `paperclipIssueId` whenever you are acting from a synced Paperclip issue so the plugin can infer the linked GitHub item and repository.
- Provide `repository` only when the plugin cannot infer it; the repository may be omitted when the current Paperclip project maps to exactly one repository.
- Role-authorized owners use `paperclip-github-plugin:update_issue` for labels, assignees, state, body, title, and milestone changes.
- Role-authorized implementation owners and `followThroughOwner` use `paperclip-github-plugin:update_pull_request` for PR title, body, base branch, open/closed state, and draft/ready-for-review state.
- For authorized GitHub comments and review-thread replies, send only the human-facing body and set `llmModel` so the plugin appends the footer automatically.

## Monitoring Boundary

- Do not use Paperclip issue monitors to poll GitHub-synced PR state.
- CI/check status, mergeability, PR file state, review threads, reviewer routing, PR-visible assets, and PR project links must be read through GitHub Sync tools and changed only by a role-authorized owner through those tools.
- Issue monitors remain valid only for non-GitHub waits or external conditions that GitHub Sync does not already own.

## PR-To-Paperclip Links And KPI Attribution

- Normal delivery PRs created from synced GitHub issues already have a Paperclip issue from the sync plugin.
- For out-of-pipeline PRs, including routine PRs, package-evolution PRs, managed repository `AGENTS.md` PRs, upstream dependency PRs, and any other PR outside the normal delivery pipeline, create the required affected-project Paperclip child issue or subtask first.
- The role-authorized implementation owner links an out-of-pipeline PR to that Paperclip child issue or subtask with `paperclip-github-plugin:link_github_item`. Pass `kind: "pull_request"`, `paperclipIssueId`, and either `pullRequestUrl` or `reference`; include `repository` when using a number-only reference outside a mapped project.
- The PR creation metric is not the issue link. Confirm `paperclip-github-plugin:link_github_item` returns `status: "linked"` before reporting the PR as tracked by GitHub Sync.
- In authenticated runs, prefer `paperclip-github-plugin:create_pull_request` for PR creation because the plugin records the PR creation metric automatically. If an explicit human/operator exception uses a non-plugin GitHub client to create a PR in a repository mapped to the current company, create the durable `link_github_item` PR-to-Paperclip link first, then separately record attribution with `POST /api/plugins/paperclip-github-plugin/api/company-metrics/events` using `metric: "pull_request_created"` plus either `pullRequestUrl` or `repository` and `pullRequestNumber`.
- The company metric endpoint is a native plugin JSON route with agent auth, not a plugin-tool call or webhook. Authenticate the native metric route with `Authorization: Bearer ${PAPERCLIP_API_KEY}`; `PAPERCLIP_API_KEY` is the agent credential for authenticated runs.
- The Paperclip host authenticates the bearer token, scopes the request to the calling agent's company, and rejects missing, expired, invalid, non-agent, or cross-company calls before worker dispatch. Include `companyId` only when useful for disambiguation; if present, it must match the calling agent's company.
- Do not post the metric route when `paperclip-github-plugin:create_pull_request` created the PR, because the plugin records `pull_request_created` automatically. Do not send it for PR edits, comments, review replies, or merges.
- GitHub alone cannot attribute non-plugin PR creation to Paperclip work; both the durable link and the metric event are required when the authenticated run creates the PR outside `create_pull_request`.

## Link Immutability

- GitHub Sync issue and pull request links are durable monitoring records for agents.
- Role-authorized implementation owners may create or repair links through `paperclip-github-plugin:link_github_item`, but agents must not unlink, tombstone, delete, or deactivate GitHub Sync issue-link or pull-request-link metadata.
- Intentional unlinking is an operator UI action or an internal GitHub Sync repair path, not an agent workflow action.
- Do not use removed GitHub Sync REST fallback routes for PR linking. If `link_github_item` is unavailable or fails, record the concrete tool blocker in the subtask/routine report instead of presenting the PR as fully tracked.

## Review Threads

- All roles may inspect review threads with `paperclip-github-plugin:list_pull_request_review_threads`.
- Only `followThroughOwner` may reply to, resolve, or unresolve a review thread; Security Engineer and Code Reviewer return required mutations to that owner.
- `followThroughOwner`: do not silently resolve a thread. Reply with the decision—such as committed the requested change, not applicable, or disagreement with the feedback—before resolving it, and resolve only when settled.
- Authorized thread mutations use `paperclip-github-plugin:reply_to_review_thread`, `paperclip-github-plugin:resolve_review_thread`, and `paperclip-github-plugin:unresolve_review_thread`.

## PR-Visible Assets

- Role-authorized implementation owners use `paperclip-github-plugin:upload_pull_request_asset` for PR-visible screenshots, generated PDFs, QA reports, logs, dashboards, rendered HTML evidence, or other review artifacts.
- Pass `paperclipIssueId` when acting from synced work, or `repository` plus `pullRequestNumber` for an explicit PR target, plus `fileName`, either `contentBase64` or `dataUrl`, and optional `label`, `alt`, `caption`, or `mimeType`.
- Embed the returned `asset.markdown` in the PR body with `update_pull_request`.
- Do not paste base64 asset data into comments, rely on ephemeral local paths as the only evidence, or upload secrets, tokens, private data, or unrelated browser chrome.
- If asset upload fails, record the concrete blocker, such as missing token, missing contents write permission, unsupported size, unsafe filename, invalid base64, or host route failure. Do not claim assets are unavailable merely because GitHub's browser-only attachment uploader is unavailable.
