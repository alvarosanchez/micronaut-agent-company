# Workflow Control Plane

Detailed reference extracted from `micronaut-repo-operations` so the primary skill can stay a compact router. These rules remain runtime guidance when this reference is loaded for the matching work mode.

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
- Use normal `TODO` assignment only for non-policy owner changes such as intake-to-planning, planning-to-implementation, or post-PR follow-through. In those cases, assign the next owner and add a comment that names the reason and next action; Paperclip owns dispatch.
- Do not use `@` mentions as the primary routing mechanism. If a deployment still has mention-wake bugs or the next agent needs extra context, add a structured mention only as a fallback note after the real assignment or stage transition is already correct.
- Adding a Paperclip reviewer does not guarantee an immediate run. Advance the stage or assignment correctly and let Paperclip dispatch it. Agent-authenticated callers cannot invoke another agent; if no matching run is queued after correct routing, record a runtime wake blocker for an operator or runtime repair instead of retrying, mentioning, or polling.
- When every reviewer must approve, use separate sequential stages so runtime dispatch and decision ownership stay unambiguous.
- The installed `paperclipai@2026.626.0` runtime in this package still exposes `approvalsNeeded: 1` for execution stages, so do not rely on a single multi-participant stage for unanimous sign-off. If all listed reviewers must approve in order, model that as separate sequential stages.
- Paperclip also has a separate generic approvals system for linked board approvals. Those approvals have their own lifecycle (`pending`, `approved`, `rejected`, revision request, and resubmission) and can wake the requester when they are resolved.
- Paperclip issue-thread interactions are for non-governance user input in the issue thread: use `suggest_tasks` when the board/user should accept or reject a proposed task list, `ask_user_questions` for bounded structured answers, and `request_confirmation` for explicit proposal or plan confirmation. Keep linked approvals for governance decisions.
- While a pending issue interaction owns the next decision, do not post reminder or verification comments, change routing, or wake the assignee for unrelated observations. Let the interaction's continuation policy trigger the next run when the user acts; only a new blocker or an explicit user/board request justifies an earlier mutation.
- PR follow-through belongs to the implementation owner recorded by QA: Micronaut Engineer for source, tests, dependencies, build logic, package scripts, adapters, and plugins; Technical Writer for prose docs, guides, repository `AGENTS.md`, company role instructions, and other textual control-plane changes. A healthy maintainer wait is `in_review` and unassigned.
- The GitHub Sync plugin should persist a company-validated `followThroughAssigneeAgentId` on the issue/PR link and resolve PR re-entry in this order: execution-policy return assignee, durable follow-through owner, configured executor fallback, configured default assignee. This is a durable plugin contract documented by the package; this repository does not implement plugin code.
- Re-entry is effect-based: no repository change returns to the implementation owner only for any required response, then to unassigned maintainer wait; routine source, test, dependency, or build changes go Micronaut Engineer -> QA -> Code Reviewer; routine prose or executable docs go Technical Writer -> QA -> Code Reviewer; behavior-changing executable instructions with no established Security pre-triage trigger set `securityPrecheckRequired: false`, `securityFinalReviewRequired: true`, and go Technical Writer -> QA -> Security final -> Code Reviewer; defined Security triggers add pre-triage before the owner and final Security review after QA; design-changing requests go Architect -> recorded implementation owner -> applicable gates. A clean rebase with green CI returns to maintainer wait; conflicts or semantic changes rerun the applicable gates. Escalate unresolved behavior, compatibility, or security questions instead of improvising.
- If GitHub Sync reopens a PR-based issue because the linked PR has failing CI or unresolved review feedback, that is actionable PR follow-through for the durable owner. Even when the failure also reproduces on the target branch, Micronaut Engineer owns source/test/build repair needed to make the PR mergeable; do not restore `blocked` merely because the target-branch baseline also fails.
- If GitHub Sync drops a PR-based issue from `in_review` to `in_progress` but the live PR is open, non-draft, `CLEAN`, all checks pass, and no actionable review state remains, restore unassigned `in_review` maintainer wait without waking an agent.
- CEO governs, synthesizes, prioritizes, corrects safe Paperclip routing drift, and creates/assigns scoped children with acceptance criteria, then stops. CEO never branches, edits, commits, pushes, creates or updates PRs, repairs CI, replies to review threads, or performs PR rediscovery. Textual findings route to Technical Writer; executable package/plugin findings route to Micronaut Engineer; add Architect and/or Security when QA classification requires them.
- PRs created outside the normal delivery pipeline must still be scoped in a project-specific Paperclip child assigned to the actual implementation owner and linked through GitHub Sync. Synced GitHub issues are already linked.

## Execution-Semantics Guardrails

- Paperclip is single-assignee by design. Keep one live owner on an issue at a time, either an agent or a human board user. Linked approvals are for governance, not a second assignee.
- `todo` is dispatch state and may be assigned or unassigned. `in_progress` is active work and requires an assignee. `blocked` is the correct state for waiting on another issue, a human decision, or an external system. `in_review` means the next move belongs to a reviewer or approver, not the current executor.
- For agent-owned issues, checkout is required before moving the issue into `in_progress`. When your deployment exposes `checkoutRunId` and `executionRunId`, read them as execution-rights lock versus the currently live execution path.
- Do not leave agent-assigned non-terminal work stranded. Paperclip v2026.512.0, still true in `paperclipai@2026.626.0`, makes assigned issue creation default to `todo` when status is omitted, while explicit `backlog` still parks work for human review. An assigned `todo` with no prior issue run is dispatched by recovery as a normal assignment wake and reported as `assignmentDispatched`; wait for or repair that wake instead of creating duplicate recovery issues. An assigned `in_progress` should have an active run, queued continuation, liveness recovery state, or recorded next-action hint. Inspect checkout, execution run, liveness, continuation-attempt, watchdog, and `continuation-summary` context before creating duplicate work. If Paperclip's configured liveness recovery surfaces the issue as stranded or moves it to `blocked` with a visible comment, treat that as an operational problem to repair or escalate.
- Use standard work mode for this company's normal delivery issues, routine project subtasks, Product Manager feature proposals, and PR follow-through work. Reserve Paperclip planning mode for planning-only issues where the assignee must produce or update a plan, not implementation; after an accepted planning-mode plan, create child implementation issues with `workMode: standard`.
- Paperclip may create productivity review issues with type `issue_productivity_review` for source work with a no-comment streak, long-active duration, or high-churn loop. Treat the productivity review as queue-health work owned by the manager or CEO: inspect the source issue and run evidence, then make a manager decision to close the review as expected progress, decompose or reroute the source work, block it with a named unblock owner, or stop/cancel the loop. If the open review holds continuation, fix the source route or review decision before forcing `resume: true`.
- Use `parentId` for structure, work breakdown, checklist display, and rollup context. Create known child issues directly and use `blockParentUntilDone` when a child should hold the parent. Use `blockedByIssueIds` for dependency semantics and automatic wakeups when the blocker clears. If a parent is truly waiting on a child, model both the parent link and the blocker relationship explicitly.

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
- issue context: resolve the imported `paperclip-control-plane` skill and use `snapshot` for normalized issue, heartbeat, and selected-document evidence; use native Paperclip comments when the audit thread is also needed
- state updates: `PATCH /api/issues/{issueId}` with the run-id header when you need to change issue status, change assignee, update `executionPolicy`, or append a Paperclip comment in the same call
- durable stage artifacts: use the imported control-plane `snapshot` and `verify` commands for deterministic reads. Use native Paperclip document tools for role-authorized writes, and stop rather than retry if the runtime cannot preserve the requested key
- attachments when a file artifact matters: `POST /api/companies/{companyId}/issues/{issueId}/attachments`, `GET /api/issues/{issueId}/attachments`, `GET /api/attachments/{attachmentId}/content`; this package imports `attachmentMaxBytes: 10485760` (10 MiB), and the process-level attachment cap remains the final ceiling
- subtask or escalation creation: `POST /api/companies/{companyId}/issues`; use `parentId` for structure, `blockParentUntilDone` for known child work that should hold the parent checklist, and `blockedByIssueIds` when the new issue is a real blocker
- issue-thread interactions: `POST /api/issues/{issueId}/interactions` with `kind: suggest_tasks`, `kind: ask_user_questions`, or `kind: request_confirmation`; use idempotency keys and a continuation policy when the assignee should resume after the board/user response
- approvals: use native Paperclip approval tools to list, create, inspect, comment on, or resubmit approvals; use imported control-plane `approval-link` for deterministic issue-link verification
- runtime dispatch evidence: inspect the issue execution state and queued/running work after correct stage advancement or assignment; agent-authenticated callers do not perform cross-agent wakeups

Default artifact policy for this package:

- store plans, QA intake records, QA verification records, security reviews, and review summaries in keyed issue documents such as `plan`, `qa-intake`, `qa-verification`, `security-review`, or `code-review`
- use Paperclip issue comments for human-visible progress notes, GitHub-facing explanations copied back for audit, execution-policy decision notes, and any non-policy owner handoff notes
- use issue-thread interactions instead of comment-only proposal lists when the board/user needs to choose tasks, answer structured questions, or confirm a plan
- use linked approvals for board governance instead of treating comments as approvals
- after creating or following up on a linked approval, use imported control-plane `approval-link` instead of relying only on `issue.linkedApprovalIds`, because some runtimes may leave that issue field empty even when the approval is actually linked

Keyed-document flow:

1. Use imported control-plane `snapshot --document <key>` to read the current artifact.
2. Use a native Paperclip document tool for the role-authorized update. If it cannot guarantee the requested key or reports a remap, stop and record the authoritative result; do not retry.
3. Use the native revision-history view when you need the audit trail, then re-run `snapshot` or `verify` for the current key.

Plan-confirmation and decomposition flow:

1. Write or update the `plan` document and read back its latest revision id.
2. Create `POST /api/issues/{issueId}/interactions` with `kind: request_confirmation`, `target.type: issue_document`, `target.key: plan`, the latest `revisionId`, `idempotencyKey: confirmation:{issueId}:plan:{revisionId}`, and `continuationPolicy: wake_assignee_on_accept`.
3. Wait for acceptance before creating implementation child issues. If a later user or board comment supersedes the plan, update the document and create a fresh confirmation instead of reusing the stale card.
4. For accepted planning-mode precursor issues, create the implementation child set with `POST /api/issues/{issueId}/accepted-plan-decompositions`, passing the accepted `plan` revision id and child drafts with `workMode: standard`. Treat the endpoint as idempotent for the same accepted revision and child set; do not manually duplicate the same decomposition.

## Execution Workspaces And Runtime Services

- Runs execute in the resolved issue execution workspace, which may be the project primary workspace or a separate durable execution workspace.
- Runs may also resolve through a Paperclip `Environment`, such as the local driver, an SSH-backed remote environment, or a sandbox-backed provider. Environment records, default agent environments, provider credentials, and leases are live deployment settings, not portable package defaults.
- If sandbox execution is required, the operator should install `@paperclipai/plugin-e2b` or another environment-driver plugin in the live Paperclip instance instead of adding that provider to this company package.
- Project workspace services and jobs define what can be run, but Paperclip does not auto-start or auto-restart those services as part of issue execution.
- Machine-local checkout paths, service commands, jobs, and workspace-specific runtime overrides belong on live project or execution workspace config, not in this portable package.
- If a repository task depends on a service that is not already running, call out the missing runtime setup explicitly instead of assuming the heartbeat started it for you.

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
6. If another agent should act next, confirm routing is correct and Paperclip queued or started the matching run. If not, record a runtime wake blocker; do not invoke another agent's heartbeat.
7. If you expected a GitHub side effect such as a label change, PR creation, issue comment, review-thread reply, or closure, confirm it exists instead of assuming it happened.
8. If the state is wrong, fix it before you finish.
