---
name: Monthly CEO Self-Improvement
assignee: ceo
project: company-operations
recurring: true
---

Run one evidence-first monthly operating-system review. Keep new-improvement discovery separate from direct queue correction and bounded maintenance.

## 1. Deterministic discovery

Choose the routine's explicit scheduled UTC boundary as `asOf`; do not infer the current time. Load `ceo-issue-history` and run:

```bash
node skills/ceo-issue-history/scripts/issue-history-evidence.mjs --as-of <ISO-8601-UTC>
```

The collector analyzes every issue and canonical agent over `[asOf-30d,asOf)` using issue-level evidence, controlled reason codes, stable fingerprints, and explicit coverage. For a ranked GitHub Sync issue, call `paperclip-github-plugin:get_issue_interaction_summary` for the same interval as supplementary evidence. Record its post-instrumentation coverage separately; it is not complete Paperclip history.

- On `blocked_incomplete_evidence`, fail closed: create no discovery proposal, approval, PR, or interaction. Report the missing resources/pages.
- On `no_change`, record a verified no-op. Complete evidence with no eligible candidate is successful completion.
- On `ranked_candidates`, inspect only the cited evidence for up to three candidates. Require the named threshold, affected issues/events, owner and target surface, exact proposed change, measurable acceptance criterion, deduplication result, governance path, and compatibility/safety risk.

The thresholds are two issues plus three events, a concentrated loop of three bad events across two runs, or a concrete critical one-off control failure. Do not promote generic dissatisfaction, duplicate events, ordinary isolated mistakes, or already-decided fingerprints.

For each accepted candidate, use `company-package-evolution` and end in one state: change implemented now; linked board approval request opened for the specific next action; or clearly blocked with the fact named. Approved changes are implemented in the same run instead of re-reported. Treat bundled system skills (`paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, and `para-memory-files`) as immutable; add company-owned guidance around them when needed.

## 2. Separate operational lanes

Treat active Paperclip productivity review issues (`issue_productivity_review`) as first-class queue-health work. Correct their actionable source routes and stale handoffs directly, but do not report those corrections as new proposals. Align status, assignee, `executionState.currentParticipant`, `executionState.returnAssignee`, blocker/next-action comment, and wake only when ownership permits. Use issue-thread interactions (`suggest_tasks`, `ask_user_questions`, or `request_confirmation`) for bounded non-governance input and linked approvals for governance.

Load the `maintenance-lanes.md` reference from `ceo-issue-history` for the mechanics below instead of expanding this prompt:

- **Hermes Runtime Skill Sync:** inspect Paperclip-managed skills across all company agents, not only the CEO; reconcile missing runtime/catalog materializations into Hermes local skill storage and verify with `skills_list`/`skill_view`.
- **Managed Repository AGENTS.md Audit:** classify every active managed Micronaut repository's root `AGENTS.md` as durable/current, stale/generated, or missing. Record no action needed, repo-local PR opened or updated, linked follow-up issue, linked approval, or named blocker. Managed Micronaut repository `AGENTS.md` changes require a PR path.
- **CEO-opened PR follow-up:** rediscover prior CEO PRs and continue until CI/checks are green and unresolved review threads are zero.

These lanes preserve their prior capability but do not affect candidate ranking.

## Report and finish

Store one compact Paperclip report under the stable `ceo` document key. Include:

- `asOf`, exact window, coverage outcome, missing-resource ledger, and evidence JSON fingerprint/version;
- ranked or rejected candidate counts and issue-level references; for each accepted candidate, threshold, stable fingerprint, exact action, state, owner, target, acceptance criterion, and risk;
- direct handoff/productivity-review corrections and any interaction kind/idempotency key;
- a **Hermes Runtime Skill Sync** section with checked source/target and copied, updated, no-op, or blocked verification;
- a **Managed Repository AGENTS.md Audit** section with root-file classification and concrete outcome per repository;
- CEO-opened PR follow-up with CI/check and unresolved-thread state;
- any package/upstream/repo-local PR and its project-specific Paperclip child issue, durable GitHub Sync link, and `in_review` state.

A Paperclip subtask that owns a PR stays `in_review`; do not close it or mark it `DONE` merely because the PR was created.

For any PR outside the normal synced GitHub issue delivery pipeline, when the affected project exists in Paperclip, first create one Paperclip child issue or subtask per affected project, place it in the actual corresponding Paperclip project, and set its assignee to CEO. Once the target branch is identified, fetch and update the work branch from the target branch before starting work, editing, committing, opening, creating, or updating the PR. Treat a target-branch merge or rebase conflict as a blocker; do not open, create, or update a conflicting PR. Link a valid PR with `paperclip-github-plugin:link_github_item` using `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`; leave the subtask `in_review` and do not close it or mark it `DONE` just because the PR was created. If access, approval, or linking blocks the path, name that fact. If `.company-runtime/` is relevant, state whether the optional local sidecar exists. Re-open the routine issue and report document, verify every mutation and link, and finish without inventing work.
