# Github Sync Tools

Detailed reference extracted from `micronaut-repo-operations` so the primary skill can stay a compact router. These rules remain runtime guidance when this reference is loaded for the matching work mode.

## GitHub Sync Plugin Agent Tools

These are provided by `alvarosanchez/paperclip-github-plugin` via the plugin capability `agent.tools.register`. Use the exact runtime tool IDs below. Paperclip namespaces plugin tools as `<pluginId>:<toolName>`, and this plugin's manifest id is `paperclip-github-plugin`.

GitHub API access rule:

- Use the agent tools below for GitHub API operations they cover, including organization-project lookup and PR-to-project association. In Hermes deployments, those tools may appear with MCP-bridged runtime names prefixed with `mcp_paperclip_plugin_tools_`; use the exact runtime schema name while following the same contract.
- Do not use `gh` as a fallback for GitHub API reads/writes, inspect credentials, run `git push`, or search for a GitHub token.
- `create_pull_request` publishes the local branch and creates the PR atomically from the agent's perspective. Pass `paperclipIssueId`, the plain local `head` branch, its exact full `headCommitSha`, `base`, `title`, and any body/draft metadata in one call. The trusted plugin verifies the local and remote SHA before opening and linking the PR.
- Prefer `paperclip-github-plugin:create_pull_request` for PR creation so GitHub Sync can link and attribute the PR automatically. If an explicit human/operator exception creates a PR with a non-plugin GitHub client in a repository mapped to the current company, immediately create the durable PR-to-Paperclip link by calling `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`, then separately `POST /api/plugins/paperclip-github-plugin/api/company-metrics/events` with `metric: "pull_request_created"` plus either `pullRequestUrl` or `repository` and `pullRequestNumber`. Include `companyId` only when useful for disambiguation; if present, it must match the calling agent's company.
- The PR creation metric is not the issue link. Confirm the `link_github_item` tool returns `status: "linked"` before reporting the PR as tracked by GitHub Sync.
- Authenticate the native metric JSON route with `Authorization: Bearer ${PAPERCLIP_API_KEY}`. The Paperclip host authenticates the bearer token, scopes the request to the calling agent's company, and rejects missing, expired, invalid, non-agent, or cross-company calls before the plugin worker handles it.
- This metric endpoint is a native plugin JSON route with agent auth, not a plugin-tool call or webhook.
- Do not send that route call when `paperclip-github-plugin:create_pull_request` created the PR; the plugin records `pull_request_created` automatically. Do not send it for PR edits, comments, review replies, or merges.
- This route remains for explicit non-plugin PR creation exceptions, because GitHub alone cannot attribute those PRs to Paperclip work.
- `PAPERCLIP_API_KEY` is already present in authenticated agent runs and is the credential for this route.
- When an explicit human/operator exception publishes maintainer-visible GitHub body text through a non-plugin write path, separate the footer from the previous sentence with one blank line, then append this exact GitHub-flavored Markdown footer: `---` on its own line, then `###### ✨ This message was AI-generated using <exact model id>` on the next line.
- Do not add that footer manually when you use the GitHub sync plugin tools; they append the same footer automatically.
- Treat the plugin tool list below as the required surface for normal GitHub API work. Non-plugin GitHub clients are explicit human/operator exceptions only.

Example authenticated KPI attribution call:

```bash
payload='{"metric":"pull_request_created","repository":"owner/repo","pullRequestNumber":123}'

Call `paperclip-github-plugin:link_github_item` first with `{ "kind": "pull_request", "paperclipIssueId": "<paperclipIssueId>", "pullRequestUrl": "https://github.com/owner/repo/pull/123" }`, then record attribution:

curl -fsS -X POST "${PAPERCLIP_API_URL%/}/api/plugins/paperclip-github-plugin/api/company-metrics/events" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${PAPERCLIP_API_KEY}" \
  -d "${payload}"
```

- `paperclip-github-plugin:search_repository_items`: repository-scoped open and closed GitHub issue and PR search for deduplication, backlog scans, and prior-art lookup; closed issue results must be judged by why they were closed, including closure disposition, duplicate links, closure comments, and already-implemented evidence
- `paperclip-github-plugin:get_issue`, `paperclip-github-plugin:list_issue_comments`, `paperclip-github-plugin:update_issue`, `paperclip-github-plugin:add_issue_comment`: GitHub issue reads, metadata updates, and maintainer-facing issue comments
- `paperclip-github-plugin:create_pull_request`, `paperclip-github-plugin:get_pull_request`, `paperclip-github-plugin:update_pull_request`: PR creation and PR metadata/state management
- `paperclip-github-plugin:list_pull_request_files`, `paperclip-github-plugin:get_pull_request_checks`: changed-file inspection and CI/check status
- `paperclip-github-plugin:list_pull_request_review_threads`, `paperclip-github-plugin:reply_to_review_thread`, `paperclip-github-plugin:resolve_review_thread`, `paperclip-github-plugin:unresolve_review_thread`: review-thread inspection and response
- `paperclip-github-plugin:request_pull_request_reviewers`: request user or team reviewers on a GitHub PR
- `paperclip-github-plugin:list_organization_projects`: list visible open, public GitHub organization Projects (`is:open is:public`) so the agent can choose the right Micronaut release board or board set
- `paperclip-github-plugin:add_pull_request_to_project`: associate a GitHub pull request with each selected organization Project

Use these plugin-tool conventions exactly:

- prefer `paperclipIssueId` whenever the work starts from a synced Paperclip issue so the plugin can infer the linked GitHub issue or PR and repository
- provide `repository` only when the plugin cannot infer it from the mapped Paperclip project
- for GitHub comments and review-thread replies, send only the human-facing body and always include `llmModel` so the plugin can append the same Markdown footer automatically
- use `paperclip-github-plugin:search_repository_items` for open and closed GitHub issue deduplication and prior-art search; do not replace it with generic Paperclip issue listing, and do not ignore closed issues without reviewing why they were closed

## GitHub Sync Agent Tools

The sync plugin currently exposes this GitHub tool surface for agents, using these exact runtime IDs:

- `paperclip-github-plugin:search_repository_items`
- `paperclip-github-plugin:get_issue`
- `paperclip-github-plugin:list_issue_comments`
- `paperclip-github-plugin:update_issue`
- `paperclip-github-plugin:add_issue_comment`
- `paperclip-github-plugin:create_pull_request`
- `paperclip-github-plugin:get_pull_request`
- `paperclip-github-plugin:update_pull_request`
- `paperclip-github-plugin:list_pull_request_files`
- `paperclip-github-plugin:get_pull_request_checks`
- `paperclip-github-plugin:list_pull_request_review_threads`
- `paperclip-github-plugin:reply_to_review_thread`
- `paperclip-github-plugin:resolve_review_thread`
- `paperclip-github-plugin:unresolve_review_thread`
- `paperclip-github-plugin:request_pull_request_reviewers`
- `paperclip-github-plugin:list_organization_projects`
- `paperclip-github-plugin:add_pull_request_to_project`
- `paperclip-github-plugin:upload_pull_request_asset`
- `paperclip-github-plugin:link_github_item`

Do not use Paperclip issue monitors to poll GitHub-synced PR state. CI/check status, mergeability, PR file state, review threads, reviewer routing, and PR project links must be read or changed through GitHub Sync tools. Issue monitors remain valid only for non-GitHub waits or external conditions that GitHub Sync does not already own.

Use them by workflow stage:

- intake and queue work: `paperclip-github-plugin:search_repository_items`, `paperclip-github-plugin:get_issue`, `paperclip-github-plugin:list_issue_comments`, `paperclip-github-plugin:update_issue`
- planning and review context: `paperclip-github-plugin:get_pull_request`, `paperclip-github-plugin:list_pull_request_files`, `paperclip-github-plugin:get_pull_request_checks`, `paperclip-github-plugin:list_pull_request_review_threads`, `paperclip-github-plugin:list_organization_projects`
- PR creation, assets, and routing: `paperclip-github-plugin:create_pull_request`, `paperclip-github-plugin:update_pull_request`, `paperclip-github-plugin:upload_pull_request_asset`, `paperclip-github-plugin:request_pull_request_reviewers`, `paperclip-github-plugin:add_pull_request_to_project`
- review-thread handling: `paperclip-github-plugin:reply_to_review_thread`, `paperclip-github-plugin:resolve_review_thread`, `paperclip-github-plugin:unresolve_review_thread`
- reviewer wakeups: the documented `POST /api/agents/{agentId}/heartbeat/invoke` endpoint or the equivalent runtime wake endpoint exposed by the installed build when the live stage or assignment has already advanced correctly

Important usage rules:

- Prefer `paperclipIssueId` whenever you are acting from a synced Paperclip issue so the plugin can infer the linked GitHub item and repository.
- Provide `repository` only when the plugin cannot infer it; the repository may be omitted when the current Paperclip project has exactly one mapped repository.
- Use `paperclip-github-plugin:update_issue` for labels, assignees, state, body, title, and milestone changes.
- Use `paperclip-github-plugin:update_pull_request` for PR title, body, base branch, open or close state, and draft vs ready-for-review changes.
- Use `paperclip-github-plugin:list_organization_projects` during QA intake, or later verification when the upstream facts changed, to identify the best-fit Micronaut organization project set for the eventual PR from the open, public Micronaut organization projects (`is:open is:public`).
- Use `paperclip-github-plugin:add_pull_request_to_project` after PR creation, when adopting an already-open surviving PR, or after agent retargeting when the chosen release board changed, so the live PR is linked to every selected organization project chosen during QA intake or any explicitly revised upstream decision. Do not use this repair path to undo a maintainer project change.
- Naming the chosen organization project set in a Paperclip artifact, GitHub comment, or PR description is not a substitute for the live PR associations when GitHub Sync tooling can apply them.
- If an explicit human/operator exception used a non-plugin GitHub client to create the PR in a repository mapped to the current company, call `paperclip-github-plugin:link_github_item` immediately after creation so GitHub Sync can track the PR, then call the metric API route using the bearer-token pattern above so the KPI dashboard can attribute that `pull_request_created` event to Paperclip work.
- For `paperclip-github-plugin:add_issue_comment` and `paperclip-github-plugin:reply_to_review_thread`, send only the human-facing body and set `llmModel` to your exact runtime model id from `.paperclip.yaml`. The plugin appends the same Markdown footer automatically.
- Use `paperclip-github-plugin:link_github_item` after creating or discovering an out-of-pipeline PR that should drive a Paperclip issue. Pass `kind: "pull_request"`, `paperclipIssueId`, and either `pullRequestUrl` or `reference`; include `repository` when you use a number-only reference and the Paperclip issue project is not mapped to that repository.
- Do not use removed GitHub Sync REST fallback routes for PR linking. If `paperclip-github-plugin:link_github_item` is unavailable or fails, record the concrete tool blocker in the subtask and routine report instead of presenting the PR as fully tracked.
- GitHub Sync issue and pull request links are durable monitoring records for agents. Agents may create or repair links through `paperclip-github-plugin:link_github_item`, but must not unlink, tombstone, delete, or deactivate GitHub Sync issue-link or pull-request-link metadata; intentional unlinking is an operator UI action or an internal GitHub Sync repair path.
- Do not silently resolve review threads. Reply first with the decision, such as committed the requested change, not applicable, or disagreement with the feedback, and resolve the thread only after that reply when the thread is settled.
- PRs from recurring routines remain with their durable implementation owner until CI is green and actionable review feedback is resolved; healthy maintainer wait is unassigned. CEO does not own or rediscover those PRs.
- For QA deduplication and closure-path checks, search the GitHub issue corpus for the synced repository with `paperclip-github-plugin:search_repository_items`. Do not treat generic Paperclip issue search as the deduplication source of truth.

## Tool Boundaries

- Use the local git CLI for all git operations: branch creation, commits, rebases, cherry-picks, and pushes.
- Use the sync plugin agent tools for GitHub operations they cover: deduplication search, issue reads and updates, GitHub comments, PR creation and updates, changed-file inspection, CI inspection, review-thread work, reviewer requests, organization-project lookup, and PR-to-project association.
- Do not use `gh`, direct GitHub browser edits, or ad hoc scripts as a fallback when the sync plugin tools cover the operation.
- Use the company metric API route only for explicit human/operator-exception PR creation that happened outside `paperclip-github-plugin:create_pull_request`; never send it for PR edits, comments, review replies, or merges.
- If the available sync plugin tool surface does not support linking a PR to the recommended Micronaut organization project, record that tooling limitation in the stage artifact or PR summary and continue; do not escalate solely for that reason.
- When a PR is created outside the normal synced GitHub issue delivery pipeline, use `paperclip-github-plugin:link_github_item` to link that PR to the Paperclip child issue or subtask that scopes the work. If the runtime cannot create that durable PR-to-Paperclip issue link, record the tooling blocker in the subtask and routine report instead of presenting the PR as fully tracked.

## PR Assets and Visual Evidence

Use PR-visible assets when a result is visual, browser-rendered, or otherwise easier for maintainers to evaluate as a file, such as screenshots, generated PDFs, QA reports, logs, dashboards, examples that render HTML, or other review artifacts.

When PR assets are needed:

- Capture or generate the asset after reproducing the exact workflow under review.
- Save assets with descriptive names that include the issue or PR identifier and the state shown, for example `DEV-123-before-error-page.png`, `DEV-123-after-docs-render.png`, or `DEV-123-review-report.pdf`.
- Do not paste base64 asset data into comments, do not rely on ephemeral local paths as the only evidence, and do not upload secrets, tokens, private user data, or unrelated browser chrome. Crop, redact, regenerate, or retake the asset if sensitive data is visible.
- In QA, record which assets were captured or generated and what they prove in `qa-verification` so Code Reviewer can publish them with the PR.
- In Code Review, upload PR-visible assets with `paperclip-github-plugin:upload_pull_request_asset`. Pass `paperclipIssueId` when acting from synced work, or `repository` plus `pullRequestNumber` for an explicit PR target, plus `fileName`, either `contentBase64` or `dataUrl`, and optional `label`, `alt`, `caption`, or `mimeType`; embed the returned `asset.markdown` in the PR body with `update_pull_request`.
- If `upload_pull_request_asset` is unavailable or fails, record the concrete blocker in the review artifact and PR summary instead of using the removed `/pull-request-assets` REST fallback.
- If asset upload fails, record the concrete blocker, such as missing token, missing contents write permission, unsupported size, unsafe filename, invalid base64, or host route failure. Do not claim assets are unavailable merely because GitHub's browser-only attachment uploader is unavailable.

GitHub comments created through `add_issue_comment` or `reply_to_review_thread` may summarize what the asset proves, but PR-visible assets belong in the PR body through the GitHub Sync asset upload tool.
