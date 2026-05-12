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

## Execution-Policy-Backed Workflow

- Synced GitHub issues should use an issue `executionPolicy` for review and approval gates. Inside an active stage, Paperclip is the routing mechanism.
- Use review stages for genuine sign-off gates such as QA verification, Security Engineer, Code Reviewer, and any other live review or approval checkpoint that should be enforced by the runtime.
- Use linked Paperclip approvals for human governance decisions such as package-policy exceptions and other public GitHub actions outside QA's direct closure authority. Do not treat a free-form comment as approval.
- `executionState.currentParticipant` is the only actor allowed to resolve the active stage, and `executionState.returnAssignee` is who receives the work back when changes are requested.
- A stage ends with one of three outcomes: `approved`, `changes_requested`, or `request_board_approval` when a linked human approval must gate the next public action.
- Approve an active stage with `PATCH /api/issues/{issueId}` and `status: done` plus a decision comment. If another stage remains, Paperclip keeps the issue in `in_review`, reassigns the next participant, and records the decision automatically.
- Request changes with a non-`done` status, preferably `in_progress`, plus a precise decision comment. Paperclip records `changes_requested`, reassigns through `returnAssignee`, and routes back to the same stage after the executor resubmits.
- For synced GitHub delivery work, `approved` only advances the execution policy or the documented follow-through route. Agents do not manually mark the Paperclip item `DONE`; the GitHub sync plugin does that after merge or after an approved GitHub closure path actually lands.
- A stage artifact is still required: plan, reproducer, QA report, security review, review summary, or rollout note. Put the artifact in the issue output, issue document, linked approval, PR, or other durable workspace owned by the stage.
- Use normal `TODO` assignment only for non-policy owner changes such as intake-to-planning, planning-to-implementation, or post-PR follow-through. In those cases, assign the next owner, add a comment that names the reason and next action, and invoke their heartbeat only if the work should start immediately.
- Do not use `@` mentions as the primary routing mechanism. If a deployment still has mention-wake bugs or the next agent needs extra context, add a structured mention only as a fallback note after the real assignment or stage transition is already correct.
- Adding a Paperclip reviewer does not guarantee an immediate wake. If the next reviewer should act now and the runtime did not wake them automatically, explicitly invoke that agent heartbeat with the documented `POST /api/agents/{agentId}/heartbeat/invoke` endpoint, the equivalent runtime wake endpoint exposed by your installed build, or the UI's `Review now` action after the stage has advanced.
- A review stage may list multiple participants. Invoke every reviewer you expect to engage immediately after the stage becomes active.
- The installed `paperclipai@2026.428.0` runtime in this package still exposes `approvalsNeeded: 1` for execution stages, so do not rely on a single multi-participant stage for unanimous sign-off. If all listed reviewers must approve in order, model that as separate sequential stages.
- Paperclip also has a separate generic approvals system for linked board approvals. Those approvals have their own lifecycle (`pending`, `approved`, `rejected`, revision request, and resubmission) and can wake the requester when they are resolved.
- Paperclip issue-thread interactions are for non-governance user input in the issue thread: use `suggest_tasks` when the board/user should accept or reject a proposed task list, `ask_user_questions` for bounded structured answers, and `request_confirmation` for explicit proposal or plan confirmation. Keep linked approvals for governance decisions.
- If GitHub Sync reopens a PR-based issue because the linked PR has failing CI or unresolved review feedback, treat that as actionable PR follow-through work even when the failure also reproduces on the target branch. Route it to the Micronaut Engineer to make the PR mergeable or produce a concrete named blocker; do not restore `blocked` solely because the failure appears baseline.
- If GitHub Sync drops a PR-based issue from `in_review` to `in_progress` but the live PR is still open, non-draft, `CLEAN`, all reported checks are passing, and there is no actionable unresolved review state left inside the company workflow, restore `in_review`, clear the internal assignee, and leave a routing-correction comment instead of keeping an engineer or reviewer on repeated follow-through while the PR only waits on normal maintainer review.
- PRs opened by the CEO from recurring routines, including managed Micronaut repository `AGENTS.md` PRs, follow the same merge-readiness rules as other agent PRs: CI must be green, reported checks must pass, and no unresolved review threads may remain. Because CEO heartbeats may be disabled, the daily self-improvement routine must rediscover and follow up those CEO-opened PRs instead of waiting for a PR wakeup.
- PRs created outside the normal delivery pipeline must be scoped in Paperclip before they are opened. Create one Paperclip child issue or subtask per affected project when the project exists in Paperclip; the subtask must belong to the actual corresponding project and be assigned to the routine owner. Decide inside that subtask whether a PR is needed, link any resulting PR to that Paperclip issue through GitHub Sync, and record both URLs plus link status in the routine or stage artifact. Synced GitHub issues created by the sync plugin are already linked and do not need this extra subtask.

## Execution-Semantics Guardrails

- Paperclip is single-assignee by design. Keep one live owner on an issue at a time, either an agent or a human board user. Linked approvals are for governance, not a second assignee.
- `todo` is dispatch state and may be assigned or unassigned. `in_progress` is active work and requires an assignee. `blocked` is the correct state for waiting on another issue, a human decision, or an external system. `in_review` means the next move belongs to a reviewer or approver, not the current executor.
- For agent-owned issues, checkout is required before moving the issue into `in_progress`. When your deployment exposes `checkoutRunId` and `executionRunId`, read them as execution-rights lock versus the currently live execution path.
- Do not leave agent-assigned non-terminal work stranded. In `paperclipai@2026.428.0`, an assigned `todo` with no prior issue run is dispatched by recovery as a normal assignment wake and reported as `assignmentDispatched`; wait for or repair that wake instead of creating duplicate recovery issues. An assigned `in_progress` should have an active run, queued continuation, liveness recovery state, or recorded next-action hint. Inspect checkout, execution run, liveness, continuation-attempt, watchdog, and `continuation-summary` context before creating duplicate work. If Paperclip's configured liveness recovery surfaces the issue as stranded or moves it to `blocked` with a visible comment, treat that as an operational problem to repair or escalate.
- Paperclip may create productivity review issues with type `issue_productivity_review` for source work with a no-comment streak, long-active duration, or high-churn loop. Treat the productivity review as queue-health work owned by the manager or CEO: inspect the source issue and run evidence, then make a manager decision to close the review as expected progress, decompose or reroute the source work, block it with a named unblock owner, or stop/cancel the loop. If the open review holds continuation, fix the source route or review decision before forcing `resume: true`.
- Use `parentId` for structure, work breakdown, checklist display, and rollup context. Create known child issues directly and use `blockParentUntilDone` when a child should hold the parent. Use `blockedByIssueIds` for dependency semantics and automatic wakeups when the blocker clears. If a parent is truly waiting on a child, model both the parent link and the blocker relationship explicitly.

## Recommended Stage Layouts

- `type: bug`: QA intake review -> Micronaut Engineer review stage -> QA verification review -> Security Engineer review -> Code Reviewer review.
- `type: docs`: QA intake review -> Technical Writer review stage -> QA verification review -> Security Engineer review -> Code Reviewer review.
- `type: improvement`, `type: enhancement`, `type: breaking`, `type: dependency-upgrade`: QA intake review -> Architect review -> Micronaut Engineer or Technical Writer review stage -> QA verification review -> Security Engineer review -> Code Reviewer review.
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
6. If your work depends on deduplication, perform it against open and closed GitHub issues in the synced repository through the GitHub sync plugin, not against unrelated Paperclip issues. For closed GitHub issues, inspect why they were closed, including closure disposition, duplicate links, closure comments, and already-implemented evidence, then use that history to form the QA deduplication decision about whether they supersede, block, or leave the new work actionable.

## Built-In Paperclip Control-Plane APIs

These are built into Paperclip itself. Use them even when no plugin-specific tool is involved:

- identity and inbox: `GET /api/agents/me`, `GET /api/agents/me/inbox-lite`, fallback `GET /api/companies/{companyId}/issues?assigneeAgentId={yourId}&status=todo,in_progress,in_review,blocked`
- execution lock: `POST /api/issues/{issueId}/checkout`, `POST /api/issues/{issueId}/release`
- issue context: `GET /api/issues/{issueId}`, `GET /api/issues/{issueId}/heartbeat-context`, `GET /api/issues/{issueId}/comments` for assignee, status, execution state, dependency context, liveness and continuation context, and any exposed `parentId`, `blockedByIssueIds`, `checkoutRunId`, or `executionRunId`
- state updates: `PATCH /api/issues/{issueId}` with the run-id header when you need to change issue status, change assignee, update `executionPolicy`, or append a Paperclip comment in the same call
- durable stage artifacts: `GET /api/issues/{issueId}/documents`, `GET /api/issues/{issueId}/documents/{key}`, `PUT /api/issues/{issueId}/documents/{key}`, `GET /api/issues/{issueId}/documents/{key}/revisions`
- attachments when a file artifact matters: `POST /api/companies/{companyId}/issues/{issueId}/attachments`, `GET /api/issues/{issueId}/attachments`, `GET /api/attachments/{attachmentId}/content`; this package imports `attachmentMaxBytes: 10485760` (10 MiB), and the process-level attachment cap remains the final ceiling
- subtask or escalation creation: `POST /api/companies/{companyId}/issues`; use `parentId` for structure, `blockParentUntilDone` for known child work that should hold the parent checklist, and `blockedByIssueIds` when the new issue is a real blocker
- issue-thread interactions: `POST /api/issues/{issueId}/interactions` with `kind: suggest_tasks`, `kind: ask_user_questions`, or `kind: request_confirmation`; use idempotency keys and a continuation policy when the assignee should resume after the board/user response
- approvals: `GET /api/companies/{companyId}/approvals?status=pending`, `POST /api/companies/{companyId}/approvals`, `GET /api/approvals/{approvalId}`, `GET /api/approvals/{approvalId}/issues`, `POST /api/approvals/{approvalId}/comments`, `POST /api/approvals/{approvalId}/resubmit`
- reviewer wakeups: the documented `POST /api/agents/{agentId}/heartbeat/invoke` endpoint or the equivalent runtime wake endpoint exposed by the installed build after the stage or assignment is already correct

Default artifact policy for this package:

- store plans, QA intake records, QA verification records, security reviews, and review summaries in keyed issue documents such as `plan`, `qa-intake`, `qa-verification`, `security-review`, or `code-review`
- use Paperclip issue comments for human-visible progress notes, GitHub-facing explanations copied back for audit, execution-policy decision notes, and any non-policy owner handoff notes
- use issue-thread interactions instead of comment-only proposal lists when the board/user needs to choose tasks, answer structured questions, or confirm a plan
- use linked approvals for board governance instead of treating comments as approvals
- after creating or following up on a linked approval, verify the linkage with `GET /api/approvals/{approvalId}/issues` instead of relying only on `issue.linkedApprovalIds`, because some runtimes may leave that issue field empty even when the approval is actually linked

Example keyed-document flow:

1. Read the current artifact with `GET /api/issues/{issueId}/documents/ceo` (or another stable key such as `qa-intake`, `qa-verification`, `plan`, or `security-review`).
2. Write the updated artifact with `PUT /api/issues/{issueId}/documents/ceo` so the stage output stays anchored to the same durable key.
3. Use `GET /api/issues/{issueId}/documents/ceo/revisions` when you need the audit trail for an earlier version.

Plan-confirmation flow:

1. Write or update the `plan` document and read back its latest revision id.
2. Create `POST /api/issues/{issueId}/interactions` with `kind: request_confirmation`, `target.type: issue_document`, `target.key: plan`, the latest `revisionId`, `idempotencyKey: confirmation:{issueId}:plan:{revisionId}`, and `continuationPolicy: wake_assignee_on_accept`.
3. Wait for acceptance before creating implementation child issues. If a later user or board comment supersedes the plan, update the document and create a fresh confirmation instead of reusing the stale card.

## Execution Workspaces And Runtime Services

- Runs execute in the resolved issue execution workspace, which may be the project primary workspace or a separate durable execution workspace.
- Runs may also resolve through a Paperclip `Environment`, such as the local driver, an SSH-backed remote environment, or a sandbox-backed provider. Environment records, default agent environments, provider credentials, and leases are live deployment settings, not portable package defaults.
- If sandbox execution is required, the operator should install `@paperclipai/plugin-e2b` or another environment-driver plugin in the live Paperclip instance instead of adding that provider to this company package.
- Project workspace services and jobs define what can be run, but Paperclip does not auto-start or auto-restart those services as part of issue execution.
- Machine-local checkout paths, service commands, jobs, and workspace-specific runtime overrides belong on live project or execution workspace config, not in this portable package.
- If a repository task depends on a service that is not already running, call out the missing runtime setup explicitly instead of assuming the heartbeat started it for you.

## GitHub Sync Plugin Agent Tools

These are provided by `alvarosanchez/paperclip-github-plugin` via the plugin capability `agent.tools.register`. Use the exact runtime tool IDs below. Paperclip namespaces plugin tools as `<pluginId>:<toolName>`, and this plugin's manifest id is `paperclip-github-plugin`.

`GITHUB_TOKEN` GitHub access rule:

- When `GITHUB_TOKEN` is present in the environment, prefer the `gh` CLI for GitHub reads and writes, including Micronaut organization-project lookup and live PR association, even when an equivalent GitHub sync plugin tool exists.
- If `GITHUB_TOKEN` is not available, use the agent tools below for GitHub operations they cover, including organization-project lookup and PR-to-project association.
- By `GITHUB_TOKEN`, mean the environment variable with that exact name. Do not search the filesystem, plugin config, or other files for a token.
- When an authenticated run creates a PR with `gh` or another non-plugin GitHub client in a repository mapped to the current company, immediately create the durable PR-to-Paperclip link by posting to `POST /api/plugins/paperclip-github-plugin/api/issue-link` with `paperclipIssueId` plus `pullRequestUrl` or `reference`, then separately `POST /api/plugins/paperclip-github-plugin/api/company-metrics/events` with `metric: "pull_request_created"` plus either `pullRequestUrl` or `repository` and `pullRequestNumber`. Include `companyId` only when useful for disambiguation; if present, it must match the calling agent's company.
- The PR creation metric is not the issue link. Confirm the `issue-link` route returns `status: "linked"` before reporting the PR as tracked by GitHub Sync.
- Authenticate both native plugin JSON routes with `Authorization: Bearer ${PAPERCLIP_API_KEY}`. The Paperclip host authenticates the bearer token, scopes each request to the calling agent's company, and rejects missing, expired, invalid, non-agent, or cross-company calls before the plugin worker handles it.
- This metric endpoint is a native plugin JSON route with agent auth, not a plugin-tool call or webhook. The issue-link endpoint uses the same native route authentication.
- Do not send that route call when `paperclip-github-plugin:create_pull_request` created the PR; the plugin records `pull_request_created` automatically. Do not send it for PR edits, comments, review replies, or merges.
- This route exists because authenticated runs can create those PRs through `gh`, and GitHub alone cannot attribute those PRs to Paperclip work.
- `PAPERCLIP_API_KEY` is already present in authenticated agent runs and is the credential for this route.
- When you publish maintainer-visible GitHub body text directly with `gh` or another `GITHUB_TOKEN`-backed write, separate the footer from the previous sentence with one blank line, then append this exact GitHub-flavored Markdown footer: `---` on its own line, then `###### ✨ This message was AI-generated using <exact model id>` on the next line.
- Do not add that footer manually when you use the GitHub sync plugin tools; they append the same footer automatically.
- Treat the plugin tool list below as the required surface for no-`GITHUB_TOKEN` GitHub work.
- Any later `do not use gh` boundary in this skill applies when `GITHUB_TOKEN` is not available; it does not override the `GITHUB_TOKEN` preference above.

Example authenticated KPI attribution call:

```bash
payload='{"metric":"pull_request_created","repository":"owner/repo","pullRequestNumber":123}'

curl -fsS -X POST "${PAPERCLIP_API_URL%/}/api/plugins/paperclip-github-plugin/api/issue-link" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${PAPERCLIP_API_KEY}" \
  -d '{"paperclipIssueId":"<paperclipIssueId>","pullRequestUrl":"https://github.com/owner/repo/pull/123"}'

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

## Required Outcomes

Every stage must end in one of these states:

- `approved`: your stage artifact is complete, the issue is ready for the next configured stage immediately, and no missing governance decision remains for the issue route itself. Intake may still resolve `approved` when a linked contributor PR stays open while the issue moves toward a separate maintainer-owned PR.
- `changes_requested`: your stage artifact names the exact gap, risk, or missing fact that must be addressed before the issue can move forward.
- `request_board_approval`: when public GitHub action or a policy exception needs a human decision first, create or update the linked Paperclip approval instead of using a free-form comment as the approval mechanism.

When the work needs explicit plan or proposal confirmation but not governance approval, create a Paperclip `request_confirmation` issue-thread interaction and leave the issue in the appropriate waiting state instead of treating a plain comment as the confirmation mechanism.

## Required Final Verification

Before you stop:

1. Re-open the issue.
2. Confirm the current execution state reflects the outcome you intended:
   - after `approved`, the current stage participant is no longer you
   - after `changes_requested`, the execution state shows `changes_requested`
   - after `request_board_approval`, the linked approval exists and is pending or approved
3. After `approved`, confirm the current stage participant is no longer you and the issue is `in_review` or `done` as expected for the remaining execution-policy stages.
4. For synced GitHub delivery work, confirm the issue was not incorrectly marked `DONE` just because a stage approved. `DONE` is reserved only for sync-confirmed GitHub completion: for PR-based delivery work, verify the synced context shows the linked PR as merged; for approved closure paths, verify the synced context shows the linked GitHub issue as closed with the approved disposition or answer path actually applied.
5. For non-policy owner changes, confirm the issue is `TODO`, the next owner is assigned, and the next-action comment is clear.
6. If you expect another agent to act immediately and they are now a current stage participant or assignee, explicitly invoke that heartbeat only after the routing is correct. If the stage has multiple reviewer participants, invoke each intended reviewer.
7. If you expected a GitHub side effect such as a label change, PR creation, issue comment, review-thread reply, or closure, confirm it exists instead of assuming it happened.
8. If the state is wrong, fix it before you finish.

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

- `type: bug`: QA reproduces first. Reproduced bugs move into the Micronaut Engineer stage sequence. Unreproducible bugs may be closed directly by QA with `closed: cannot reproduce`, GitHub's native `Close as not planned` reason instead of `Close as completed`, and a detailed, evidence-rich closure comment with the exact non-reproducer steps, versions, and observed results.
- `type: improvement`, `type: enhancement`, `type: breaking`, and `type: dependency-upgrade`: QA moves the item into the Architect planning stage.
- `type: docs`: QA moves the item into the Technical Writer stage.
- `type: question`: QA answers directly on GitHub with `type: question` and `closed: question` when confident, or posts a request-for-comments message with `status: awaiting feedback`; issues that remain awaiting feedback for more than 30 days may be closed with `closed: question` and GitHub's native `Close as not planned` reason instead of `Close as completed`.

## Closure Dispositions

- `already-implemented` (closure disposition, not a GitHub `type:` label): QA may close the issue directly once it documents the exact version, PR, release, or documentation evidence in a detailed, evidence-rich closure comment and uses GitHub's native `Close as not planned` reason instead of `Close as completed`.
- `duplicate` (closure disposition, not a GitHub `type:` label): QA may close the issue directly with `closed: duplicate`, GitHub's native `Close as duplicate` reason, a detailed, evidence-rich closure comment that explains why the superseding issue fully covers the report, and a link to the superseding GitHub issue for traceability.
- `linked contributor PR needs replacement` (operating situation, not a GitHub `type:` label): QA documents why the imported PR is not salvageable, leaves that contributor PR open, and still routes the issue through the normal implementation stages toward a separate maintainer-owned PR.

## Documentation Policy

- Documentation is part of the fix whenever public API, annotations, configuration properties, defaults, behavior, guides, or setup paths change.
- If migration pain is even slightly plausible, write the migration note while change context is still fresh.
- For code issues with documentation impact, keep the original non-docs `type:` label instead of relabeling the work as `type: docs`.
- Before editing docs in a Micronaut repository, identify where guides, reference docs, release notes, and upgrade notes live and how examples or snippets are validated there.
- When a guide, docs, or documentation PR's CI is not needed because the changed documentation is not exercised by the build, include a GitHub CI-skip keyword in the commit message, such as `[skip ci]` for that PR.
- Before opening or updating a guide, docs, or documentation PR, update the work branch from the target branch; if the rebase or merge produces conflicts, record the merge conflict as a blocker and do not open or update a conflicting PR.
- Do not skip CI for documentation tied to build-validated snippets, executable examples, generated guides, `./gradlew publishGuide`, or other docs checks. Record the validation or skip rationale in the PR body or routine report.

## Release Targeting And Branch Rules

- Confirm the correct target repository, branch, and release line before planning or coding.
- QA intake owns release targeting and Micronaut organization-project selection. Later stages consume and verify those facts instead of reinventing them from scratch.
- Trust the repository's actual current default branch instead of assuming a generic Micronaut branch strategy.
- Determine the next release from the repository's default branch plus the latest stable non-pre-release GitHub release.
- GitHub prereleases, including milestones such as `4.0.0-M1` and release candidates such as `4.0.0-RC1`, are early-testing releases and do not count as the default branch having already shipped.
- If the default branch is `1.2.x` and the latest stable non-pre-release release is `1.1.5`, the next release on that branch is `1.2.0`, so that default branch has not shipped yet.
- If the default branch is `1.2.x` and the latest stable non-pre-release release is `1.2.3`, the next release on that branch is `1.2.4`, so that default branch is already on a patch line.
- If the current default branch has never been released, it may accept `type: bug`, `type: improvement`, `type: enhancement`, and docs, CI, or build-only changes. If that unreleased default branch is a new major line such as `5.0.x`, it may also accept `type: breaking` work with the required approvals.
- If the current default branch has already been released, it may accept `type: bug`, `type: improvement`, and docs, CI, or build-only changes. `type: enhancement` and `type: breaking` do not target that branch unless a human-approved release-policy exception exists.
- `type: dependency-upgrade` follows the actual compatibility impact of the resulting repository release, not the label alone.
- Do not invent or create another target branch during triage just to fit SemVer. If the current default branch cannot legally take the requested SemVer impact, QA records that mismatch and routes the issue into planning or governance instead of targeting a non-default branch by default.
- Micronaut organization projects under `https://github.com/orgs/micronaut-projects/projects` act as release boards for future Micronaut Platform releases.
- QA should choose the best-fit Micronaut organization project set during intake from the open, public Micronaut organization projects (`is:open is:public`) by asking which Micronaut Platform release can first consume the repository's next release.
- If a GA release target has both matching milestone or release candidate projects and a GA release board open, select all matching projects so the PR can appear on both prerelease and GA boards; for example, a `5.0.0` target with open `5.0.0-M3` and `5.0.0 Release` projects should select both.
- If the best-fit organization-project choice is somewhat ambiguous, including major-version upgrades that may or may not fit the next Platform minor board cleanly, still choose the best-fit project set and record the ambiguity in the QA artifact so the eventual PR description can repeat it.
- `type: breaking` requires explicit Architect approval and, when necessary, a linked human approval before work proceeds.
- If no matching organization project exists yet, or if the runtime cannot apply the project link, record that gap and continue. Missing organization-project linkage alone does not block PR creation or approval.
- After PR creation, human maintainer project changes win over earlier agent-selected projects. If a maintainer changes, reschedules, or retargets the PR organization project, preserve that live maintainer choice and do not restore, reapply, re-add, or reset the original QA-selected organization project links unless a later maintainer or board decision explicitly asks for it.

## Approval Boundaries

- Board approval always means a real Paperclip approval linked to the relevant issue or proposal, not a free-form comment.
- Paperclip's generic approvals API is the package's source of truth for board approvals. Treat execution-policy `approval` stages as optional live-instance sugar unless their semantics are explicitly verified in that instance.
- QA may publish direct GitHub answers and issue closures for `type: question`, `status: awaiting feedback`, `closed: question`, `closed: cannot reproduce`, `closed: duplicate`, and evidence-backed `already-implemented` closures without separate board approval when the policy conditions are satisfied and the public comment is detailed, evidence-rich, and not short on details.
- Any direct GitHub closure comment must cite the exact facts that justify the closure, such as the clarification request and timeout date, non-reproducer steps and observed results, duplicate overlap with the superseding issue, or the exact version, PR, release, documentation, or policy evidence. Do not post a short generic close note.
- QA does not publish other policy-exception proposals on GitHub until the linked approval exists.
- Do not create a board approval whose only purpose is to close an inadequate contributor PR. Leave contributor PRs open and continue with a separate maintainer-owned PR when replacement work is necessary.
- Only the board or other Micronaut maintainers merge PRs or cut releases.
- Agents may prepare, label, comment, close, and create PRs when their role allows it, but they do not merge or release.
- For PR-based delivery work, agents do not transition the synced Paperclip issue to `DONE` themselves. The GitHub sync plugin transitions it to `DONE` after the linked PR merges.
- When QA closes a synced GitHub issue directly, agents still do not close the Paperclip issue manually. The GitHub sync plugin transitions it after the closure sync arrives.
- Paperclip issue blockers and execution policies for synced GitHub delivery items are runtime controls. Configure them in the live Paperclip instance or sync layer rather than trying to encode them in this package.

## Internal Operating Routines

This package intentionally keeps internal automation small. It includes one lightweight project, `company-operations`, with six recurring Paperclip routines:

- `weekly-product-discovery`, assigned to `product-manager`
- `weekly-security-deep-scan`, assigned to `security-engineer`
- `weekly-user-guide-review`, assigned to `technical-writer`
- `weekly-guide-topic-discovery`, assigned to `technical-writer`
- `daily-ceo-self-improvement`, assigned to `ceo`
- `training`, assigned to `ceo`

These routines are company-operating work, not substitutes for the synced GitHub backlog. They exist to keep the maintenance system healthy, product-aware, and guide-aware even when the GitHub queue is quiet.

They import active by default.

When routine instructions say to include active Micronaut-related projects, exclude `micronaut-projects/micronaut-project-template`. It is a repository template and file sync source, not an actual Micronaut project, so skip it for Product Manager discovery, product development issues, feature requests, user guide review, guide topic creation, standalone guide PRs, and other normal project routines. For guide routines, also exclude `micronaut-projects/micronaut-build`; it contains internal Gradle plugins for Micronaut committers and is not intended for end-user projects, so skip it for user guide review, guide topic creation, standalone guide PRs, and other normal project documentation routines. Inspect these repositories only when the task is explicitly about template maintenance, shared file synchronization, referenced skills, repository-template infrastructure, or internal build tooling.

When a routine surfaces a new problem:

- reuse or update an existing synced GitHub issue or PR when one already covers the work
- for any routine that needs to work across more than one project, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip; put each subtask in the actual corresponding project, set assignee to the routine owner, and perform the project-specific work inside that subtask instead of only on the routine issue
- for Product Manager discovery, use the `product-discovery` skill; keep the parent routine issue as a coordinator only, search for an existing open or already-created product-discovery child issue or subtask for the same routine issue and project, also search for orphan or top-level product-discovery issues for the same project from recent routine attempts, reuse, update, or reparent the existing issue when possible, record a blocker instead of creating another duplicate if it cannot be safely reparented, and write a child issue description that is self-contained and complete and tells Product Manager to use the product-discovery skill
- for Product Manager discovery, do not perform deep review, market research, candidate selection, feature request creation, or top-level product development issue creation from the routine issue itself; from each project subtask, inspect previous product-discovery reports, prior routine run notes, and project subtask reports, including created product issues, no-create decisions, rejected candidates, and duplicate decisions, then create a top-level Paperclip product development issue in the corresponding project with `status: backlog`, no `parentId`, and assignee QA (`qa-engineer`) only when the Weekly Product Discovery instructions authorize it and duplicate checks are complete; do not propose or create the same previously proposed feature candidate unless new evidence materially changes the decision, and do not publish issues to GitHub
- for Technical Writer guide routines, keep the parent routine issue as a coordinator only: it creates one Paperclip child issue or subtask per affected project when the project exists in Paperclip, puts each child in the actual corresponding project, sets `parentId` to the routine issue when supported, sets assignee to Technical Writer, and then stops instead of opening or updating PRs
- for Technical Writer guide routines, do not create top-level project-specific Paperclip issues for routine follow-up; the child issue or subtask is the project-owned work item
- for Technical Writer guide routines, perform the project-specific validation and the PR/no-PR decision only inside the project child issue or subtask, and create direct documentation PRs only there when the relevant guide assembly, fact-checking, deduplication, or validation evidence is recorded; label guide-related PRs `type: docs`, link any resulting PR to the child issue or subtask through GitHub Sync, leave that child issue or subtask in `in_review`, and do not close it or mark it `DONE` just because the PR was created
- for CEO package-core, managed repository `AGENTS.md`, upstream dependency, or other out-of-pipeline PRs, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip before deciding whether a PR is needed; put each subtask in the actual corresponding project, set assignee to CEO, and if a routine may affect more than one project, create multiple subtasks so each project has a clear Paperclip state owner
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
- `paperclip-github-plugin:upload_pull_request_asset`
- `paperclip-github-plugin:link_github_item`

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
- When `GITHUB_TOKEN` is available, use `gh` for Micronaut organization-project lookup and live PR association.
- If `GITHUB_TOKEN` is not available, use `paperclip-github-plugin:list_organization_projects` during QA intake, or later verification when the upstream facts changed, to identify the best-fit Micronaut organization project set for the eventual PR from the open, public Micronaut organization projects (`is:open is:public`).
- If `GITHUB_TOKEN` is not available, use `paperclip-github-plugin:add_pull_request_to_project` after PR creation, when adopting an already-open surviving PR, or after agent retargeting when the chosen release board changed, so the live PR is linked to every selected organization project chosen during QA intake or any explicitly revised upstream decision. Do not use this repair path to undo a maintainer project change.
- Naming the chosen organization project set in a Paperclip artifact, GitHub comment, or PR description is not a substitute for the live PR associations when the `gh` flow or no-`GITHUB_TOKEN` plugin tooling can apply them.
- In `GITHUB_TOKEN`-backed runs, if `gh` or another non-plugin GitHub client created the PR in a repository mapped to the current company, call the `issue-link` API route immediately after creation so GitHub Sync can track the PR, then call the metric API route using the bearer-token pattern above so the KPI dashboard can attribute that `pull_request_created` event to Paperclip work.
- For `paperclip-github-plugin:add_issue_comment` and `paperclip-github-plugin:reply_to_review_thread`, send only the human-facing body and set `llmModel` to your exact runtime model id from `.paperclip.yaml`. The plugin appends the same Markdown footer automatically.
- Use `paperclip-github-plugin:link_github_item` after creating or discovering an out-of-pipeline PR that should drive a Paperclip issue. Pass `kind: "pull_request"`, `paperclipIssueId`, and either `pullRequestUrl` or `reference`; include `repository` when you use a number-only reference and the Paperclip issue project is not mapped to that repository.
- When plugin tools are unavailable, call `POST /api/plugins/paperclip-github-plugin/api/issue-link` with `Authorization: Bearer ${PAPERCLIP_API_KEY}`, `Content-Type: application/json`, and a JSON body containing `paperclipIssueId` plus `pullRequestUrl` or `reference` for the PR. Use the same route with `kind: "issue"` only when linking an existing GitHub issue to a Paperclip issue is the intended outcome.
- GitHub Sync issue and pull request links are durable monitoring records for agents. Agents may create or repair links through `paperclip-github-plugin:link_github_item` or the `/issue-link` route, but must not unlink, tombstone, delete, or deactivate GitHub Sync issue-link or pull-request-link metadata; intentional unlinking is an operator UI action or an internal GitHub Sync repair path.
- Do not silently resolve review threads. Reply first with the decision, such as committed the requested change, not applicable, or disagreement with the feedback, and resolve the thread only after that reply when the thread is settled.
- CEO-opened PRs from recurring routines stay on the daily self-improvement routine's follow-up list until CI is green, checks pass, and unresolved review threads are answered and settled.
- For QA deduplication and closure-path checks, search the GitHub issue corpus for the synced repository with `paperclip-github-plugin:search_repository_items`. Do not treat generic Paperclip issue search as the deduplication source of truth.

## Tool Boundaries

- Use the local git CLI for all git operations: branch creation, commits, rebases, cherry-picks, and pushes.
- Use `gh` for GitHub operations when `GITHUB_TOKEN` is available, including organization-project lookup and PR-to-project association.
- Use the sync plugin agent tools for GitHub operations when `GITHUB_TOKEN` is not available: deduplication search, issue reads and updates, GitHub comments, PR creation and updates, changed-file inspection, CI inspection, review-thread work, and reviewer requests.
- Do not use `gh`, direct GitHub browser edits, or ad hoc scripts when `GITHUB_TOKEN` is not available and the sync plugin tools cover the operation.
- In `GITHUB_TOKEN`-backed runs, use the company metric API route only for PR creation that happened outside `paperclip-github-plugin:create_pull_request`; never send it for PR edits, comments, review replies, or merges.
- If the available sync plugin tool surface does not support linking a PR to the recommended Micronaut organization project, record that tooling limitation in the stage artifact or PR summary and continue; do not escalate solely for that reason.
- When a PR is created outside the normal synced GitHub issue delivery pipeline, use `paperclip-github-plugin:link_github_item` or `POST /api/plugins/paperclip-github-plugin/api/issue-link` to link that PR to the Paperclip child issue or subtask that scopes the work. If the runtime cannot create that durable PR-to-Paperclip issue link, record the tooling blocker in the subtask and routine report instead of presenting the PR as fully tracked.

## PR Assets and Visual Evidence

Use PR-visible assets when a result is visual, browser-rendered, or otherwise easier for maintainers to evaluate as a file, such as screenshots, generated PDFs, QA reports, logs, dashboards, examples that render HTML, or other review artifacts.

When PR assets are needed:

- Capture or generate the asset after reproducing the exact workflow under review.
- Save assets with descriptive names that include the issue or PR identifier and the state shown, for example `DEV-123-before-error-page.png`, `DEV-123-after-docs-render.png`, or `DEV-123-review-report.pdf`.
- Do not paste base64 asset data into comments, do not rely on ephemeral local paths as the only evidence, and do not upload secrets, tokens, private user data, or unrelated browser chrome. Crop, redact, regenerate, or retake the asset if sensitive data is visible.
- In QA, record which assets were captured or generated and what they prove in `qa-verification` so Code Reviewer can publish them with the PR.
- In Code Review, upload PR-visible assets with `paperclip-github-plugin:upload_pull_request_asset` when plugin tools are available. Pass `paperclipIssueId` when acting from synced work, or `repository` plus `pullRequestNumber` for an explicit PR target, plus `fileName`, either `contentBase64` or `dataUrl`, and optional `label`, `alt`, `caption`, or `mimeType`; embed the returned `asset.markdown` in the PR body with `update_pull_request`.
- If authenticated runtime blocks plugin tool execution, call `POST /api/plugins/paperclip-github-plugin/api/pull-request-assets` with `Authorization: Bearer ${PAPERCLIP_API_KEY}`, `Content-Type: application/json`, and the same JSON payload. Embed the response's `asset.markdown` in the PR body.
- If asset upload fails, record the concrete blocker, such as missing token, missing contents write permission, unsupported size, unsafe filename, invalid base64, or host route failure. Do not claim assets are unavailable merely because GitHub's browser-only attachment uploader is unavailable.

GitHub comments created through `add_issue_comment` or `reply_to_review_thread` may summarize what the asset proves, but PR-visible assets belong in the PR body through the GitHub Sync asset upload tool or route.

## PR Rules

- The delivery loop combines normal owner assignment for intake, planning, implementation, and PR follow-through with execution-policy stages for the enforced review chain.
- Once the target branch is identified for any PR, fetch and update the work branch from the target branch before starting work, editing, committing, opening, creating, or updating the PR. If that target branch rebase or merge produces conflicts, record the conflict as a blocker and do not open, create, or update a conflicting PR.
- `code-reviewer` creates the GitHub PR only after QA and Security Engineer stages are approved.
- `code-reviewer` must not resolve PR-based delivery work as `approved` unless, by the end of that run, a non-draft GitHub PR exists in the correct repository and branch, is readable through the synced GitHub context, and carries the correct issue linkage, closing keyword, and `type:` label. All selected organization projects should be linked when the chosen projects exist and GitHub tooling can apply them, but missing linkage due to no matching project or tooling gaps alone does not block `approved`.
- Normal delivery PRs created from synced GitHub issues already have a Paperclip issue from the sync plugin. The affected-project child issue or subtask requirement applies to routine PRs, package-evolution PRs, managed repository `AGENTS.md` PRs, upstream dependency PRs, and any other PR created outside that normal delivery pipeline.
- Every PR must include a closing keyword such as `Fixes #123`.
- Every PR must carry exactly one `type:` label.
- Every PR should be linked to all selected Micronaut organization projects chosen during QA intake, representing the best-fit Micronaut Platform release boards that can first consume the repository's next module release.
- When the selected projects exist and GitHub tooling can apply them, agents should create every live PR-to-project association with `gh` when `GITHUB_TOKEN` is available or `paperclip-github-plugin:add_pull_request_to_project` otherwise instead of only restating the intended boards in prose.
- If the selected organization-project set carried ambiguity, repeat the ambiguity in the PR description instead of dropping the project links. For a GA release target with both milestone or release candidate boards and a GA release board, keep both links, such as `5.0.0-M3` and `5.0.0 Release`.
- If a human maintainer changes, reschedules, or retargets the PR organization project after PR creation, that maintainer project change is authoritative and must remain. Agents must not restore, reapply, re-add, or reset the original QA-selected organization project set over the maintainer's choice.
- `code-reviewer` applies the project named earlier by QA intake unless an upstream artifact explicitly revised it.
- After PR creation, `micronaut-engineer` keeps CI green, addresses Sonar Quality Gate issues, replies to every review thread with a decision explanation, and only then resolves settled threads.
- PR-based delivery work stays open in Paperclip until GitHub merge sync completes. Agents do not manually move those items to `DONE`.
- Any material post-PR change re-enters the same execution-policy-controlled review loop after the owner has resumed the work.

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
