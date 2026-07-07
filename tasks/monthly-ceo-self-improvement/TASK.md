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

For each accepted candidate, use `company-package-evolution` and end in one state: linked board approval for the exact governance decision; scoped QA-assigned child with evidence and measurable acceptance criteria; verified no-op; or named blocker. Textual docs/guides/repository `AGENTS.md`/company instructions route to Technical Writer. Executable package scripts/tests/config behavior/adapters/plugins route to Micronaut Engineer. Workflow/authority semantics add Architect before Writer; authority/tool/security changes add Security. Executable adapter/config impact alone does not add Architect before Engineer: add planning only for cross-module compatibility, materially different fixes, migration, compatibility-matrix work, or design ambiguity, and name the trigger. Every child requires observable before/after behavior and regression or verification evidence appropriate to its artifact; only executable adapter/config findings must name that boundary. CEO then stops and does not implement or follow PRs. Treat bundled system skills (`paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, and `para-memory-files`) as immutable.

## 2. Separate operational lanes

Treat active Paperclip productivity review issues (`issue_productivity_review`) as first-class queue-health work. Correct their actionable source routes and stale handoffs directly, but do not report those corrections as new proposals. Align status, assignee, `executionState.currentParticipant`, `executionState.returnAssignee`, blocker/next-action comment, and wake only when ownership permits. Use issue-thread interactions (`suggest_tasks`, `ask_user_questions`, or `request_confirmation`) for bounded non-governance input and linked approvals for governance.

Load the `maintenance-lanes.md` reference from `ceo-issue-history` for the mechanics below instead of expanding this prompt:

- **Hermes Runtime Skill Sync:** inspect Paperclip-managed skills across all company agents, not only CEO. Record missing runtime/catalog materialization and create a scoped Micronaut Engineer child for executable reconciliation; CEO does not mutate Hermes local skill storage.
- **Managed Repository AGENTS.md Audit:** classify every active managed Micronaut repository root `AGENTS.md` as durable/current, stale/generated, or missing. Record no action or create a scoped QA-assigned Technical Writer child. Add Architect/Security as classification requires.
- **PR ownership check:** do not rediscover or follow CEO PRs. Confirm GitHub Sync routes actionable PR events to the durable Engineer/Writer implementation owner and leaves healthy maintainer wait unassigned.

These lanes preserve their prior capability but do not affect candidate ranking.

## Report and finish

Store one compact Paperclip report under the stable `ceo` document key. Include:

- `asOf`, exact window, coverage outcome, missing-resource ledger, and evidence JSON fingerprint/version;
- ranked or rejected candidate counts and issue-level references; for each accepted candidate, threshold, stable fingerprint, exact action, state, owner, target, acceptance criterion, and risk;
- direct handoff/productivity-review corrections and any interaction kind/idempotency key;
- a **Hermes Runtime Skill Sync** section with checked source/target and present, missing, no-op, or blocked verification;
- a **Managed Repository AGENTS.md Audit** section with root-file classification and no-action or scoped Writer-child outcome per repository;
- safe routing corrections and every created child's project, QA assignment, actual delivery/follow-through owner, acceptance criteria, and conditional Architect/Security gates.

CEO governs, synthesizes, prioritizes, corrects safe Paperclip routing drift, creates and assigns scoped children with acceptance criteria, then stops. CEO never branches, edits, commits, pushes, creates or updates PRs, repairs CI, replies to review threads, or performs PR rediscovery/follow-through. The implementation owner creates and links any PR outside the normal synced GitHub issue delivery pipeline from its project-specific Paperclip child, updates from the target branch before starting work, and owns all follow-through. Re-open the routine and created children to verify governance mutations, then finish.
