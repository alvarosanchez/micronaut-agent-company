---
name: Daily CEO Self-Improvement
assignee: ceo
project: company-operations
recurring: true
---

Review the company's recent execution history and improve the operating system without creating instruction drift or silent package forks.

Focus on:

- repeated blockers, stalled handoffs, and noisy queue patterns
- open Paperclip productivity review issues (`issue_productivity_review`) for no-comment streak, long-active duration, or high-churn source work, including whether each source issue needs a manager decision, decomposition, reroute, blocker, or cancellation
- broken handoffs where issue status, assignee, `executionState.currentParticipant`, `executionState.returnAssignee`, and the expected next owner do not agree
- liveness recovery, continuation-attempt, and `resume: true` paths where stalled or completed work needs an intentional restart instead of another generic comment
- QA, security, or review churn that suggests missing guidance or the wrong quality gate
- missed chances to use issue-thread interactions for non-governance board input, such as `suggest_tasks` selectable task proposals, `ask_user_questions` bounded questions, or `request_confirmation` plan confirmations
- missing or outdated repo-level `AGENTS.md` guidance in managed Micronaut repositories
- live workspace or runtime-service gaps where repo work keeps stalling because jobs or services were assumed to auto-start
- gaps or upgrade opportunities in the company's imported skill inventory that would materially improve delivery and can be turned into a concrete approval or implementation step now
- CEO-opened PRs from earlier routine runs, linked approvals, or open PR searches that still need follow-up because CI is not green, checks are failing, or review threads remain unresolved
- whether local extension instructions or `.company-runtime/` overlays should be added, simplified, or pruned
- whether any reusable company learning should be promoted into the package core with a PR to `alvarosanchez/micronaut-agent-company`

Produce one Paperclip report that includes:

- the most important operational frictions from recent executions
- zero to three concrete improvement candidates and the exact next action for each one
- any linked board approval request you opened, including the exact change it authorizes, the target surface (`.company-runtime/`, company-owned skill/docs, or package-core PR), and the implementation path after approval
- any approved change you implemented immediately instead of re-reporting it as a proposal
- any stale handoff you corrected by aligning issue status, assignee, `executionState.currentParticipant`, `executionState.returnAssignee`, and any required next-action comment or wake
- any productivity review issue you handled, the linked source issue, the trigger evidence such as no-comment, long-active, or high-churn behavior, and the concrete manager decision you recorded for the source work
- any issue-thread interaction you created for a non-governance decision, including its kind, idempotency key, and expected continuation behavior
- any managed Micronaut repository `AGENTS.md` updates you made using `agent-md-refactor`, including the Paperclip child issue or subtask that scopes the out-of-pipeline PR, the PR you opened or updated in that managed repository, and the PR-to-Paperclip issue link status
- a **Managed Repository AGENTS.md Audit** section that lists each active managed Micronaut repository you considered, whether root `AGENTS.md` exists, whether it is durable/current or stale/generated/missing, and the concrete outcome for each repository: no action needed, repo-local PR opened or updated, linked follow-up issue created, linked approval requested, or blocker named
- any CEO-opened PRs you rechecked or followed up, including CI/check status, unresolved review-thread status, and the next action if the PR is not green and review-thread-clean yet
- any proposed additive extension-instruction or `.company-runtime/` changes
- any package-core PR you opened for `alvarosanchez/micronaut-agent-company`, including the Paperclip child issue or subtask that scopes the out-of-pipeline PR and the PR-to-Paperclip issue link status

For each improvement candidate, finish the routine with one of these states instead of a naked proposal list:

- change implemented now
- linked board approval request opened for a specific next action
- clearly blocked, with the blocking fact named
- manager decision recorded on the productivity review and source issue route corrected

Treat Paperclip's bundled system skills `paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, and `para-memory-files` as immutable runtime capabilities. Do not propose editing them from this routine. If one of those capabilities needs better examples or safer defaults, add company-owned guidance or a company-owned skill in this package instead.

If you mention a `.company-runtime/` overlay in the report, explain plainly whether it exists in the current workspace and that it is just an optional local sidecar folder for instance-specific instructions that survive package reimports.

When you inspect managed Micronaut repository `AGENTS.md` files, a bounded metadata/readability check is enough unless recent execution evidence points to a deeper repo-specific guidance problem. When a repository needs `AGENTS.md` work, create or route a target-repository issue/PR rather than silently deferring it or editing imported company package files in place. When you touch repo-level `AGENTS.md` files in managed Micronaut repositories, keep the root file short and use linked topic files when appropriate, then open or update a PR in that managed repository for the `AGENTS.md` change. If a default should change for future imports, make the change in a clone of `alvarosanchez/micronaut-agent-company` and send a PR; if the required board approval already exists and is approved, implement the change in the same run instead of stopping at a proposal.

When the daily routine may create a package-core PR, managed Micronaut repository `AGENTS.md` PR, upstream dependency PR, or any other PR outside the normal delivery pipeline, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip before deciding whether a PR is needed. Scope each subtask to the project-specific task, link any resulting PR to that Paperclip issue, and record the subtask URL, PR URL, and link status in the routine report. Use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`; when plugin tools are unavailable, call `POST /api/plugins/paperclip-github-plugin/api/issue-link` with `Authorization: Bearer ${PAPERCLIP_API_KEY}` and a JSON body containing `paperclipIssueId` plus `pullRequestUrl` or `reference`. Synced GitHub issues created by the sync plugin are already linked and do not need this extra subtask.

Because CEO heartbeats may be disabled, use the daily CEO self-improvement routine as the follow-up mechanism for PRs opened by the CEO. Rediscover CEO-opened PRs from the previous routine report, linked board approvals, recorded PR URLs, and open PR searches; follow up until CI is green, reported checks are passing, and no unresolved review threads remain. Reply to each review thread with the decision before resolving it.
