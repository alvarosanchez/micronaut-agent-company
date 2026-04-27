---
name: Daily CEO Self-Improvement
assignee: ceo
project: company-operations
recurring: true
---

Review the company's recent execution history and improve the operating system without creating instruction drift or silent package forks.

Focus on:

- repeated blockers, stalled handoffs, and noisy queue patterns
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
- any issue-thread interaction you created for a non-governance decision, including its kind, idempotency key, and expected continuation behavior
- any managed Micronaut repository `AGENTS.md` updates you made using `agent-md-refactor`, including the PR you opened or updated in that managed repository
- any CEO-opened PRs you rechecked or followed up, including CI/check status, unresolved review-thread status, and the next action if the PR is not green and review-thread-clean yet
- any proposed additive extension-instruction or `.company-runtime/` changes
- any package-core PR you opened for `alvarosanchez/micronaut-agent-company`

For each improvement candidate, finish the routine with one of these states instead of a naked proposal list:

- change implemented now
- linked board approval request opened for a specific next action
- clearly blocked, with the blocking fact named

Treat Paperclip's bundled system skills `paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, and `para-memory-files` as immutable runtime capabilities. Do not propose editing them from this routine. If one of those capabilities needs better examples or safer defaults, add company-owned guidance or a company-owned skill in this package instead.

If you mention a `.company-runtime/` overlay in the report, explain plainly whether it exists in the current workspace and that it is just an optional local sidecar folder for instance-specific instructions that survive package reimports.

When you touch repo-level `AGENTS.md` files in managed Micronaut repositories, keep the root file short and use linked topic files when appropriate, then open or update a PR in that managed repository for the `AGENTS.md` change. Do not mutate an imported company instance's core instruction files in place. If a default should change for future imports, make the change in a clone of `alvarosanchez/micronaut-agent-company` and send a PR; if the required board approval already exists and is approved, implement the change in the same run instead of stopping at a proposal.

Because CEO heartbeats may be disabled, use the daily CEO self-improvement routine as the follow-up mechanism for PRs opened by the CEO. Rediscover CEO-opened PRs from the previous routine report, linked board approvals, recorded PR URLs, and open PR searches; follow up until CI is green, reported checks are passing, and no unresolved review threads remain. Reply to each review thread with the decision before resolving it.
