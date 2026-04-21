---
name: micronaut-repo-operations
description: Shared operating rules for running a Micronaut repository cluster to inbox zero across issues, pull requests, release branches, and maintainer handoffs.
---

# Micronaut Repo Operations

Use this skill whenever you are acting on synced GitHub issues or pull requests for this company. Inside imported company instances, this skill plus the live issue execution policy are the runtime source of truth for the workflow.

## Preconditions

- Work only inside the repositories configured in the GitHub sync plugin for this company.
- Use the GitHub sync plugin configuration, any `.company-runtime/` overlays present in the active workspace, and repo-local docs or `AGENTS.md` files as supplemental operational context, not as the authoritative source of repository membership.
- Treat the repository cluster as a maintained boundary. If work spills into unrelated Micronaut repositories, escalate to the CEO before expanding scope.
- Do not assume all Micronaut repositories share the same branch strategy, release process, docs layout, or test commands. Read the local repo facts first.
- The GitHub sync plugin creates the per-repository Paperclip projects. Synced GitHub issues and PRs are the normal delivery work items; do not invent internal starter tasks for routine queue work.

## Execution-Policy-First Workflow

- Synced GitHub issues should move through Paperclip with an issue `executionPolicy`, not through agent-written assignee flips or Paperclip handoff comments.
- Use execution stages for agent-owned work that should take checkout and drive `in_progress`, such as Micronaut Engineer, Technical Writer, and PR follow-through.
- Use review stages for sign-off or approval points where the next move belongs to a reviewer or approver, and surface `in_review` while that review work is pending, such as QA intake, Architect planning, QA verification, Security Engineer review, and Code Reviewer review.
- If a live issue truly cannot continue until another issue changes state, model that with blockers in the live Paperclip instance. Parent/sub-issue links are structural context only and do not replace blockers.
- Use linked Paperclip approvals for human governance decisions such as package-policy exceptions and other public GitHub actions outside QA's direct closure authority. Do not treat a free-form comment as approval.
- The current stage participant is the routing source of truth. If the issue is waiting on another participant or a linked human approval, stop instead of improvising side-channel routing.
- A stage ends with one of three outcomes: `approved`, `changes_requested`, or `request_board_approval` when a linked human approval must gate the next public action.
- For synced GitHub delivery work, `approved` only advances the execution policy. Agents do not manually mark the Paperclip item `DONE`; the GitHub sync plugin does that after merge or after an approved GitHub closure path actually lands.
- A stage artifact is still required: plan, reproducer, QA report, security review, review summary, or rollout note. Put the artifact in the issue output, issue document, linked approval, PR, or other durable workspace owned by the stage. The stage decision, not the note, is what routes the work.
- If the live sync layer keeps a stable assignee for convenience, treat it as informational. The current execution stage still decides who acts next.
- Agent-owned `todo` is dispatch state. Do not leave assigned work there without a wake path or an intentional resting decision after a successful run.
- Agent-owned `in_progress` is checkout-backed active work. Take checkout before active engineering or writing work and release it when intentionally handing the issue back to review or another waiting state.
- Adding a Paperclip reviewer does not wake that reviewer automatically. After you move work into a review stage and want the next reviewer to act now, explicitly invoke that agent heartbeat with the documented `POST /api/agents/{agentId}/heartbeat/invoke` endpoint, the equivalent runtime wake endpoint exposed by your installed build, or the UI's `Review now` action.
- A review stage may list multiple participants. Invoke every reviewer you expect to engage immediately after the stage becomes active.
- The installed `paperclipai@2026.416.0` runtime in this package still exposes `approvalsNeeded: 1` for execution stages, so do not rely on a single multi-participant stage for unanimous sign-off. If all listed reviewers must approve in order, model that as separate sequential stages.
- Paperclip also has a separate generic approvals system for linked board approvals. Those approvals have their own lifecycle (`pending`, `approved`, `rejected`, revision request, and resubmission) and can wake the requester when they are resolved.

## Recommended Stage Layouts

- `type: bug`: QA intake review -> Micronaut Engineer execution -> QA verification review -> Security Engineer review -> Code Reviewer review.
- `type: docs`: QA intake review -> Technical Writer execution -> QA verification review -> Security Engineer review -> Code Reviewer review.
- `type: improvement`, `type: enhancement`, `type: breaking`, `type: dependency-upgrade`: QA intake review -> Architect review -> Micronaut Engineer or Technical Writer execution -> QA verification review -> Security Engineer review -> Code Reviewer review.
- `type: question`, clarification wait paths, unreproducible bug closures, duplicate closures, and already-implemented closures: QA intake review, with QA publishing the GitHub answer, clarification request, or closure directly and waiting for sync.
- Recurring internal routines stay as Paperclip company-operating work and may use a shorter stage sequence when no downstream review is required.

## Imported Issues With Existing PRs

- QA intake owns the first decision on any linked PR that arrived with the synced issue, including PRs opened by external contributors before import.
- If the linked contributor PR is good enough to salvage, keep it on the normal stage layout and treat it like an agent-created PR that still has to clear every configured gate.
- If the linked contributor PR needs substantial replacement work, QA should leave that contributor PR open, document that it is not the implementation vehicle, and continue routing the issue itself through the normal engineering pipeline toward a separate maintainer-owned PR.
- An inadequate linked contributor PR does not become a closure path. Leave it open and keep the underlying issue moving through the normal implementation stages.

## Required Session Start

Before you do any work on a synced issue or PR:

1. Open the Paperclip issue, the current execution policy, the current execution state, the latest linked GitHub item, and any linked approval.
2. Continue only if you are the current stage participant, the issue returned `changes_requested` to your stage, or the issue is one of your recurring routines.
3. If another stage participant or a human approval is active, stop and leave the routing unchanged.
4. Read the latest stage artifact before acting so you are responding to the actual current request, not stale queue history.
5. Read any repo-local or `.company-runtime/` guidance that changes release-line, CI, docs, or maintainer expectations.
6. If your work depends on deduplication, perform it against GitHub issues in the synced repository through the GitHub sync plugin, not against unrelated Paperclip issues.

## Built-In Paperclip Control-Plane APIs

These are built into Paperclip itself. Use them even when no plugin-specific tool is involved:

- identity and inbox: `GET /api/agents/me`, `GET /api/companies/{companyId}/issues?assigneeAgentId={yourId}&status=todo,in_progress,blocked`
- execution lock: `POST /api/issues/{issueId}/checkout`, `POST /api/issues/{issueId}/release`
- issue context: `GET /api/issues/{issueId}`, `GET /api/issues/{issueId}/comments`
- state updates: `PATCH /api/issues/{issueId}` with the run-id header when you need to change issue status or append a Paperclip comment in the same call
- durable stage artifacts: `GET /api/issues/{issueId}/documents`, `GET /api/issues/{issueId}/documents/{key}`, `PUT /api/issues/{issueId}/documents/{key}`, `GET /api/issues/{issueId}/documents/{key}/revisions`
- attachments when a file artifact matters: `POST /api/companies/{companyId}/issues/{issueId}/attachments`, `GET /api/issues/{issueId}/attachments`, `GET /api/attachments/{attachmentId}/content`
- subtask or escalation creation: `POST /api/companies/{companyId}/issues`
- approvals: `GET /api/companies/{companyId}/approvals?status=pending`, `POST /api/companies/{companyId}/approvals`, `GET /api/approvals/{approvalId}`, `GET /api/approvals/{approvalId}/issues`, `POST /api/approvals/{approvalId}/comments`, `POST /api/approvals/{approvalId}/resubmit`
- reviewer wakeups: the documented `POST /api/agents/{agentId}/heartbeat/invoke` endpoint or the equivalent runtime wake endpoint exposed by the installed build

Default artifact policy for this package:

- store plans, QA records, security reviews, and review summaries in keyed issue documents such as `plan`, `qa`, `security-review`, or `code-review`
- use Paperclip issue comments only for human-visible progress notes, GitHub-facing explanations copied back for audit, or `@AgentName` wakeup fallback when the dedicated wake endpoint is unavailable
- use linked approvals for board governance instead of treating comments as approvals

Checkout rule:

- use `POST /api/issues/{issueId}/checkout` before moving agent-owned active work into `in_progress`
- use `POST /api/issues/{issueId}/release` when you intentionally hand the issue back to review or another waiting state

Example keyed-document flow:

1. Read the current artifact with `GET /api/issues/{issueId}/documents/ceo` (or another stable key such as `qa`, `plan`, or `security-review`).
2. Write the updated artifact with `PUT /api/issues/{issueId}/documents/ceo` so the stage output stays anchored to the same durable key.
3. Use `GET /api/issues/{issueId}/documents/ceo/revisions` when you need the audit trail for an earlier version.

## GitHub Sync Plugin Agent Tools

These are provided by `alvarosanchez/paperclip-github-plugin` via the plugin capability `agent.tools.register`. Use the exact runtime tool IDs below. Paperclip namespaces plugin tools as `<pluginId>:<toolName>`, and this plugin's manifest id is `paperclip-github-plugin`.

Authenticated deployment rule:

- On authenticated deployments, if `GITHUB_TOKEN` is present in the environment, prefer the `gh` CLI for GitHub reads and writes, even when an equivalent GitHub sync plugin tool exists.
- When you publish maintainer-visible GitHub body text directly with `gh` or another `GITHUB_TOKEN`-backed write, append this exact GitHub-flavored Markdown footer: `---` on its own line, then `###### ✨ This message was AI-generated using <exact model id>` on the next line.
- On unauthenticated deployments, use the agent tools below for GitHub operations they cover.
- Do not add that footer manually when you use the GitHub sync plugin tools; they append the same footer automatically.
- Treat the plugin tool list below as the preferred surface for unauthenticated or plugin-capable flows, and as the required surface for any GitHub action that still needs the Paperclip-linked `paperclipIssueId` flow.
- Any later `do not use gh` boundary in this skill applies only to those unauthenticated or `paperclipIssueId`-dependent flows; it does not override the authenticated `GITHUB_TOKEN` preference above.

- `paperclip-github-plugin:search_repository_items`: repository-scoped GitHub issue and PR search for deduplication, backlog scans, and prior-art lookup
- `paperclip-github-plugin:get_issue`, `paperclip-github-plugin:list_issue_comments`, `paperclip-github-plugin:update_issue`, `paperclip-github-plugin:add_issue_comment`: GitHub issue reads, metadata updates, and maintainer-facing issue comments
- `paperclip-github-plugin:create_pull_request`, `paperclip-github-plugin:get_pull_request`, `paperclip-github-plugin:update_pull_request`: PR creation and PR metadata/state management
- `paperclip-github-plugin:list_pull_request_files`, `paperclip-github-plugin:get_pull_request_checks`: changed-file inspection and CI/check status
- `paperclip-github-plugin:list_pull_request_review_threads`, `paperclip-github-plugin:reply_to_review_thread`, `paperclip-github-plugin:resolve_review_thread`, `paperclip-github-plugin:unresolve_review_thread`: review-thread inspection and response
- `paperclip-github-plugin:request_pull_request_reviewers`: request user or team reviewers on a GitHub PR
- `paperclip-github-plugin:list_organization_projects`: list visible open, public GitHub organization Projects (`is:open is:public`) so the agent can choose the right Micronaut release board
- `paperclip-github-plugin:add_pull_request_to_project`: associate a GitHub pull request with the chosen organization Project

Use these plugin-tool conventions exactly:

- prefer `paperclipIssueId` whenever the work starts from a synced Paperclip issue so the plugin can infer the linked GitHub issue or PR and repository
- provide `repository` only when the plugin cannot infer it from the mapped Paperclip project
- for GitHub comments and review-thread replies, send only the human-facing body and always include `llmModel` so the plugin can append the same Markdown footer automatically
- use `paperclip-github-plugin:search_repository_items` for deduplication and prior-art search; do not replace it with generic Paperclip issue listing

## Required Outcomes

Every stage must end in one of these states:

- `approved`: your stage artifact is complete, the issue is ready for the next configured stage immediately, and no missing governance decision remains for the issue route itself. Intake may still resolve `approved` when a linked contributor PR stays open while the issue moves toward a separate maintainer-owned PR.
- `changes_requested`: your stage artifact names the exact gap, risk, or missing fact that must be addressed before the issue can move forward.
- `request_board_approval`: when public GitHub action or a policy exception needs a human decision first, create or update the linked Paperclip approval instead of using a free-form comment as the approval mechanism.

## Required Final Verification

Before you stop:

1. Re-open the issue.
2. Confirm the current execution state reflects the outcome you intended:
   - after `approved`, the current stage participant is no longer you
   - after `changes_requested`, the execution state shows `changes_requested`
   - after `request_board_approval`, the linked approval exists and is pending or approved
3. For synced GitHub delivery work, confirm the issue was not incorrectly marked `DONE` just because a stage approved. `DONE` is reserved only for sync-confirmed GitHub completion: for PR-based delivery work, verify the synced context shows the linked PR as merged; for approved closure paths, verify the synced context shows the linked GitHub issue as closed with the approved disposition or answer path actually applied.
4. If you expect another agent to act immediately and they are now a current stage participant, explicitly invoke that agent heartbeat. If the stage has multiple reviewer participants, invoke each intended reviewer.
5. If you expected a GitHub side effect such as a label change, PR creation, issue comment, review-thread reply, or closure, confirm it exists instead of assuming it happened.
6. If the state is wrong, fix it before you finish.

## Required GitHub Type Labels

Actionable issues and PRs should carry exactly one `type:` label:

- `type: breaking` for changes that would require a major module version and explicit Architect approval
- `type: enhancement` for new non-breaking feature work that normally implies a minor module version
- `type: improvement` for small non-breaking product changes that should fit the current default branch when improvements are allowed there
- `type: docs` for documentation-only changes
- `type: dependency-upgrade` for squad-originated version bumps that are not Dependabot work; route it by actual compatibility impact, not by label alone
- `type: bug` for bug fixes that should fit the current default branch when bugfixes are allowed there
- `type: question` for questions QA can answer directly or route into a clarification request

Duplicate, stale, superseded, out-of-scope, and already-implemented issues are immediate-closure dispositions that may be closed without forcing a `type:` label if the closure path is well documented.

## Type Routing

- `type: bug`: QA reproduces first. Reproduced bugs move into the Micronaut Engineer stage sequence. Unreproducible bugs may be closed directly by QA with `closed: cannot reproduce` and a detailed closure comment.
- `type: improvement`, `type: enhancement`, `type: breaking`, and `type: dependency-upgrade`: QA moves the item into the Architect planning stage.
- `type: docs`: QA moves the item into the Technical Writer stage.
- `type: question`: QA answers directly on GitHub with `type: question` and `closed: question` when confident, or posts a request-for-comments message with `status: awaiting feedback`; issues that remain awaiting feedback for more than 30 days may be closed with `closed: question`.

## Closure Dispositions

- `already-implemented` (closure disposition, not a GitHub `type:` label): QA may close the issue directly once it documents the exact version, PR, release, or documentation evidence in a detailed closure comment.
- `duplicate` (closure disposition, not a GitHub `type:` label): QA may close the issue directly with `closed: duplicate`, a detailed closure comment, and a link to the superseding GitHub issue for traceability.
- `linked contributor PR needs replacement` (operating situation, not a GitHub `type:` label): QA documents why the imported PR is not salvageable, leaves that contributor PR open, and still routes the issue through the normal implementation stages toward a separate maintainer-owned PR.

## Documentation Policy

- Documentation is part of the fix whenever public API, annotations, configuration properties, defaults, behavior, guides, or setup paths change.
- If migration pain is even slightly plausible, write the migration note while change context is still fresh.
- For code issues with documentation impact, keep the original non-docs `type:` label instead of relabeling the work as `type: docs`.
- Before editing docs in a Micronaut repository, identify where guides, reference docs, release notes, and upgrade notes live and how examples or snippets are validated there.

## Release Targeting And Branch Rules

- Confirm the correct target repository, branch, and release line before planning or coding.
- QA intake owns release targeting and Micronaut organization-project selection. Later stages consume and verify those facts instead of reinventing them from scratch.
- Trust the repository's actual current default branch instead of assuming a generic Micronaut branch strategy.
- Determine the next release from the repository's default branch plus the latest stable non-pre-release GitHub release.
- If the default branch is `1.2.x` and the latest stable release is `1.1.5`, the next release on that branch is `1.2.0`, so that default branch has not shipped yet.
- If the default branch is `1.2.x` and the latest stable release is `1.2.3`, the next release on that branch is `1.2.4`, so that default branch is already on a patch line.
- If the current default branch has never been released, it may accept `type: bug`, `type: improvement`, `type: enhancement`, and docs, CI, or build-only changes. If that unreleased default branch is a new major line such as `5.0.x`, it may also accept `type: breaking` work with the required approvals.
- If the current default branch has already been released, it may accept `type: bug`, `type: improvement`, and docs, CI, or build-only changes. `type: enhancement` and `type: breaking` do not target that branch unless a human-approved release-policy exception exists.
- `type: dependency-upgrade` follows the actual compatibility impact of the resulting repository release, not the label alone.
- Do not invent or create another target branch during triage just to fit SemVer. If the current default branch cannot legally take the requested SemVer impact, QA records that mismatch and routes the issue into planning or governance instead of targeting a non-default branch by default.
- Micronaut organization projects under `https://github.com/orgs/micronaut-projects/projects` act as release boards for future Micronaut Platform releases.
- QA should choose the best-fit Micronaut organization project during intake from the open, public Micronaut organization projects (`is:open is:public`) by asking which Micronaut Platform release can first consume the repository's next release.
- If the best-fit organization-project choice is somewhat ambiguous, including major-version upgrades that may or may not fit the next Platform minor board cleanly, still choose the best-fit project and record the ambiguity in the QA artifact so the eventual PR description can repeat it.
- `type: breaking` requires explicit Architect approval and, when necessary, a linked human approval before work proceeds.
- If no matching organization project exists yet, or if the runtime cannot apply the project link, record that gap and continue. Missing organization-project linkage alone does not block PR creation or approval.

## Approval Boundaries

- Board approval always means a real Paperclip approval linked to the relevant issue or proposal, not a free-form comment.
- Paperclip's generic approvals API is the package's source of truth for board approvals. Treat execution-policy `approval` stages as optional live-instance sugar unless their semantics are explicitly verified in that instance.
- QA may publish direct GitHub answers and issue closures for `type: question`, `status: awaiting feedback`, `closed: question`, `closed: cannot reproduce`, `closed: duplicate`, and evidence-backed `already-implemented` closures without separate board approval when the policy conditions are satisfied and the public comment is specific enough for the reporter.
- QA does not publish other policy-exception proposals on GitHub until the linked approval exists.
- Do not create a board approval whose only purpose is to close an inadequate contributor PR. Leave contributor PRs open and continue with a separate maintainer-owned PR when replacement work is necessary.
- Only the board or other Micronaut maintainers merge PRs or cut releases.
- Agents may prepare, label, comment, close, and create PRs when their role allows it, but they do not merge or release.
- For PR-based delivery work, agents do not transition the synced Paperclip issue to `DONE` themselves. The GitHub sync plugin transitions it to `DONE` after the linked PR merges.
- When QA closes a synced GitHub issue directly, agents still do not close the Paperclip issue manually. The GitHub sync plugin transitions it after the closure sync arrives.
- Paperclip issue blockers and execution policies for synced GitHub delivery items are runtime controls. Configure them in the live Paperclip instance or sync layer rather than trying to encode them in this package. When one live issue truly waits on another, use blockers instead of relying on parent/sub-issue structure alone.

## Internal Operating Routines

This package intentionally keeps internal automation small. It includes one lightweight project, `company-operations`, with two recurring Paperclip routines:

- `weekly-security-deep-scan`, assigned to `security-engineer`
- `daily-ceo-self-improvement`, assigned to `ceo`

These routines are company-operating work, not substitutes for the synced GitHub backlog. They exist to keep the maintenance system healthy even when the GitHub queue is quiet.

They import active by default.

When a routine surfaces a new problem:

- reuse or update an existing synced GitHub issue or PR when one already covers the work
- otherwise, prepare a maintainer-ready Paperclip escalation instead of inventing unsupported GitHub issue-creation workflows

## Reimport-Safe Runtime Overlays

This company package is meant to be reimported over time. Treat the package-owned files as immutable defaults inside imported company instances. Local runtime learnings stay additive; reusable defaults for future imports belong in a PR to `https://github.com/alvarosanchez/micronaut-agent-company`.

Normal Micronaut repository work should not self-edit this package:

- `COMPANY.md`
- `README.md`
- `.paperclip.yaml`
- `agents/`
- `skills/`
- `projects/`
- `tasks/`
- `teams/`

Instead, read and optionally maintain additive local overlays in `.company-runtime/` at the workspace root:

- `.company-runtime/shared.md`
- `.company-runtime/agents/<agent-slug>.md`
- `.company-runtime/projects/<project-slug>.md`

These files are optional and additive. If they do not exist, continue with the package defaults. If they grow unwieldy, refactor them with `agent-md-refactor`.

When a reusable company improvement should become a new package default, route it through the CEO and `company-package-evolution` so the change lands as a PR to the source repository instead of a local runtime mutation.

This immutability rule applies only to this company package. In managed Micronaut repositories, repo-level `AGENTS.md` files are product artifacts and may be updated when an explicit task or routine calls for it.

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

Use them by workflow stage:

- intake and queue work: `paperclip-github-plugin:search_repository_items`, `paperclip-github-plugin:get_issue`, `paperclip-github-plugin:list_issue_comments`, `paperclip-github-plugin:update_issue`
- planning and review context: `paperclip-github-plugin:get_pull_request`, `paperclip-github-plugin:list_pull_request_files`, `paperclip-github-plugin:get_pull_request_checks`, `paperclip-github-plugin:list_pull_request_review_threads`, `paperclip-github-plugin:list_organization_projects`
- PR creation and routing: `paperclip-github-plugin:create_pull_request`, `paperclip-github-plugin:update_pull_request`, `paperclip-github-plugin:request_pull_request_reviewers`, `paperclip-github-plugin:add_pull_request_to_project`
- review-thread handling: `paperclip-github-plugin:reply_to_review_thread`, `paperclip-github-plugin:resolve_review_thread`, `paperclip-github-plugin:unresolve_review_thread`
- reviewer wakeups: the documented `POST /api/agents/{agentId}/heartbeat/invoke` endpoint or the equivalent runtime wake endpoint exposed by the installed build when the live issue should move immediately to the next reviewer

Important usage rules:

- Prefer `paperclipIssueId` whenever you are acting from a synced Paperclip issue so the plugin can infer the linked GitHub item and repository.
- Provide `repository` only when the plugin cannot infer it; the repository may be omitted when the current Paperclip project has exactly one mapped repository.
- Use `paperclip-github-plugin:update_issue` for labels, assignees, state, body, title, and milestone changes.
- Use `paperclip-github-plugin:update_pull_request` for PR title, body, base branch, open or close state, and draft vs ready-for-review changes.
- Use `paperclip-github-plugin:list_organization_projects` during QA intake, or later verification when the upstream facts changed, to identify the best-fit Micronaut organization project for the eventual PR from the open, public Micronaut organization projects (`is:open is:public`).
- Use `paperclip-github-plugin:add_pull_request_to_project` after PR creation so the live PR is linked to the recommended organization project chosen during QA intake or any explicitly revised upstream decision.
- For `paperclip-github-plugin:add_issue_comment` and `paperclip-github-plugin:reply_to_review_thread`, send only the human-facing body and always set `llmModel: gpt-5.4`. The plugin appends the same Markdown footer automatically.
- For QA deduplication and closure-path checks, search the GitHub issue corpus for the synced repository with `paperclip-github-plugin:search_repository_items`. Do not treat generic Paperclip issue search as the deduplication source of truth.

## Tool Boundaries

- Use the local git CLI for all git operations: branch creation, commits, rebases, cherry-picks, and pushes.
- Use the sync plugin agent tools for GitHub operations in unauthenticated runs and in any `paperclipIssueId`-dependent flow: deduplication search, issue reads and updates, GitHub comments, PR creation and updates, changed-file inspection, CI inspection, review-thread work, and reviewer requests.
- Do not use `gh`, direct GitHub browser edits, or ad hoc scripts when the sync plugin tools cover the operation in those unauthenticated or `paperclipIssueId`-dependent flows.
- If the available sync plugin tool surface does not support linking a PR to the recommended Micronaut organization project, record that tooling limitation in the stage artifact or PR summary and continue; do not escalate solely for that reason.

## PR Rules

- The delivery loop is modeled by execution-policy stages, not manual Paperclip handoff comments.
- `code-reviewer` creates the GitHub PR only after QA and Security Engineer stages are approved.
- `code-reviewer` must not resolve PR-based delivery work as `approved` unless, by the end of that run, a non-draft GitHub PR exists in the correct repository and branch, is readable through the synced GitHub context, and carries the correct issue linkage, closing keyword, and `type:` label. The organization project should be linked when the chosen project exists and GitHub tooling can apply it, but missing linkage due to no matching project or tooling gaps alone does not block `approved`.
- Every PR must include a closing keyword such as `Fixes #123`.
- Every PR must carry exactly one `type:` label.
- Every PR should be linked to the Micronaut organization project chosen during QA intake, representing the best-fit Micronaut Platform release that can first consume the repository's next module release.
- If that chosen project carried ambiguity, repeat the ambiguity in the PR description instead of dropping the project link.
- `code-reviewer` applies the project named earlier by QA intake unless an upstream artifact explicitly revised it.
- After PR creation, `micronaut-engineer` keeps CI green, addresses Sonar Quality Gate issues, and resolves all review threads.
- PR-based delivery work stays open in Paperclip until GitHub merge sync completes. Agents do not manually move those items to `DONE`.
- Any material post-PR change re-enters the same execution-policy-controlled loop.

## Maintainer-Friendly Evidence

Every non-trivial stage artifact should include:

- linked issue or PR context
- current state and next action
- affected repositories and branches
- tests run or still required
- documentation impact
- security impact
- compatibility or migration risk
- the exact outcome you recorded for the current stage

## Communication Style

- Keep explanations concise and respectful.
- Favor reversible decisions and small diffs.
- Close or decline work with reasons, not silence.
- Maintain a clean audit trail so a human Micronaut maintainer can understand the state of the queue quickly.
