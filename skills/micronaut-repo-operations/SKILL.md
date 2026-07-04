---
name: micronaut-repo-operations
description: Compact router for Micronaut repository workflow, delivery gates, deterministic evidence, and on-demand operating references.
---

# Micronaut Repo Operations

Use this skill whenever you act on synced GitHub issues or pull requests for this company. This entrypoint contains only the always-needed contract. Load detailed procedures on demand before the matching action.

## Load The Right Reference

- Stage routing, Paperclip APIs, interactions, approvals, planning confirmation, productivity reviews, environments, liveness recovery, dependencies, and final-state checks: `references/workflow-control-plane.md`.
- QA intake, issue types, closure dispositions, release targeting, target branches, Micronaut organization projects, documentation policy, and imported issues with existing PRs: `references/intake-routing-release.md`.
- GitHub Sync tool names, authentication boundaries, footer behavior, PR linking, KPI attribution, monitor ownership, link immutability, review threads, and assets: first follow `micronaut-github-operations`; load `references/github-sync-tools.md` only when an uncommon or legacy detail is still needed.
- Internal routines, project children, no-diff outcomes, product discovery, guide work, package evolution, and `.company-runtime/` overlays: `references/internal-routines-overlays.md`.
- PR creation/readiness, organization-project links, reviewer requests, follow-through, maintainer-wait state, and evidence: `references/pr-delivery-evidence.md`.

Before mutating issue state, publishing to GitHub, opening or updating a PR, closing an issue, creating routine follow-up, or handling an uncommon release/approval case, load the matching reference.

## Efficient Evidence Collection

- For local repository preflight, run `node <skill-directory>/scripts/repo-evidence.mjs --base <ref>` once; omit `--base` until the approved target is known. Resolve `<skill-directory>` from this skill's inventory. The read-only script returns compact machine-readable JSON for repository root, branch, HEAD, upstream, worktree state, base divergence, changed files, build markers, and instruction files. Read raw git output only when `errors` is non-empty or the decision needs omitted evidence.
- Batch independent reads and GitHub Sync lookups. Consume current QA, plan, implementation, and review artifacts instead of rediscovering facts already recorded upstream.
- For source localization or impact analysis, make one focused CodeGraph query per hypothesis before broad search. Treat returned source as already read; fetch it again only when exact context is missing or the index may be stale.
- Prefer structured JSON and stable issue documents. Keep decision-relevant fields in stage artifacts and link to larger evidence instead of copying it.
- Do not narrow Hermes toolsets in this portable package. Deployment MCP names are operator-owned, and both GitHub Sync and CodeGraph are required. A deployment may narrow its wrapper only after preserving both MCP surfaces and validating representative workflows.

## Shared Stage Contract

- Act only as the current execution-stage participant, the explicit assignment owner, or the invoked routine owner. If another participant or a human approval owns the next move, stop without changing routing.
- If a wake reveals no new decision-relevant evidence since the latest durable comment or artifact, make no Paperclip mutation: do not post a no-change comment, do not rewrite an unchanged artifact, and do not mutate status, assignment, execution state, or wake another agent. A successful silent no-op is preferable to an audit-trail entry that merely repeats the current state.
- Paperclip execution policies own review routing. `executionState.currentParticipant` resolves the active stage; `executionState.returnAssignee` receives `changes_requested`; active review stays `in_review` until the configured route advances.
- Every substantive stage produces one durable artifact. QA keeps `qa-intake` and `qa-verification` separate.
- Approve an active stage with `status: done` and a decision comment. Request changes with a non-`done` status, preferably `in_progress`, and a precise decision comment. Manual `TODO` assignment is only for owner changes outside an active review policy.
- Invoke the next heartbeat only after routing or assignment has advanced correctly. Do not use `@` mentions as the routing mechanism.
- For synced GitHub delivery work, `approved` advances the workflow; it never authorizes an agent to mark the Paperclip item `DONE`. GitHub Sync closes or completes it after merge or an allowed GitHub closure.
- Board governance uses a linked Paperclip approval. Non-governance input uses issue interactions such as `suggest_tasks`, `ask_user_questions`, or `request_confirmation`. Put the exact proposed public comment in `recommendedAction` when approval gates a maintainer-visible write.
- Use standard work mode for delivery, routine project children, product proposals, and PR follow-through. Planning mode is only for explicit plan-only precursors; accepted plans create standard-mode children through accepted-plan decomposition.
- Work only in repositories configured by this company's GitHub Sync plugin. Read repo-local `AGENTS.md`, optional `.company-runtime/` overlays, and project docs for local facts; do not infer membership, branch strategy, release policy, docs layout, or tests from another repository.
- Human merge/release decisions and human post-creation project retargeting are authoritative.

## Route Summary

- Bugs: QA intake/reproducer → Micronaut Engineer → QA verification → Security Engineer → Code Reviewer.
- Docs: QA intake → Technical Writer → QA verification → Security Engineer → Code Reviewer.
- Improvements, enhancements, breaking changes, and dependency upgrades: QA intake → Architect → implementation/docs → QA verification → Security Engineer → Code Reviewer.
- Questions, clarification waits, unreproducible reports, duplicates, and already-implemented reports may use QA's evidence-backed direct disposition path.
- Existing contributor PRs remain on normal gates when salvageable; replacement work does not require closing the contributor PR.

## Model Profile Boundary

The `cheap` profile may classify wakeups, test adapter availability, read bounded inventory, and detect deterministic no-op states. It must not approve or reject a stage, close or mutate a GitHub issue, publish or update a PR, make security or release-target decisions, request governance approval, or create durable product work. Escalate substantive decisions and all external writes to the agent's configured primary model.

## Finish

Before stopping, re-read the issue or routine state and verify the intended outcome exists. Record the current state, next action, affected repository/branch, tests or evidence, docs/security/compatibility impact, and exact stage outcome. If a required tool or source is unavailable, name the concrete blocker; never claim a mutation or verification that did not occur.
