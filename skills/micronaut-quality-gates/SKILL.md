---
name: micronaut-quality-gates
description: Shared definition of done for Micronaut planning, implementation, QA, security review, code review, and PR handoff.
---

# Micronaut Quality Gates

This skill defines the minimum bar each role must protect before its execution-policy stage can resolve as `approved`.

## Shared Stage Contract

Before any role resolves its stage:

- the role has read the current execution stage, current stage participant, latest linked GitHub context, and any linked approval
- the role has read `executionState.returnAssignee` when the issue is in active review
- the role has produced one durable stage artifact that explains the decision
- QA does not collapse intake and verification into one artifact; use separate durable issue documents such as `qa-intake` and `qa-verification`
- when the role is the active execution-stage participant, it resolves `approved` with `status: done` plus a decision comment and resolves `changes_requested` with a non-`done` status, preferably `in_progress`, so Paperclip routes automatically through `currentParticipant` and `returnAssignee`
- manual `TODO` assignment is reserved for non-policy owner changes outside the active review chain
- for synced GitHub delivery work, `approved` advances the issue to the next stage or PR follow-through; it is not permission to mark the Paperclip item `DONE`
- if a human governance decision is required, the role creates or updates a real Paperclip approval instead of treating a comment as approval
- if the next stage or next owner should run immediately, the role explicitly invokes the next heartbeat only after the stage or assignment has already advanced correctly
- the role re-opens the issue and verifies the execution state matches the intended outcome before finishing

## Intake Gate

Before an actionable issue moves out of QA intake:

- a human has moved the synced issue from `BACKLOG` to `TODO`
- deduplication has been performed against GitHub issues in the same synced repository
- the issue has the correct `type:` label, unless it is on a documented immediate-closure path
- QA has identified the repository's actual current default branch, the latest stable non-pre-release release, the next release implied by that branch, and whether that branch has already shipped
- QA has decided whether the issue's SemVer impact fits the current default branch and recorded any mismatch instead of inventing a non-default target branch
- QA has chosen the best-fit Micronaut organization project for the eventual PR, or recorded that no matching project exists yet or tooling cannot apply it
- any linked contributor PR has been evaluated for whether it should stay on the normal gates or be replaced by a separate maintainer-owned PR while staying open
- confident questions use the documented `type: question` plus `closed: question` direct-answer path
- clarification requests use the documented `status: awaiting feedback` path and may close after 30 days with `closed: question`
- bugs have a reproducer or a precise non-reproducer record
- unreproduced bugs that now point toward closure use the documented `closed: cannot reproduce` path instead of falling back to `changes_requested`
- duplicates use the documented `closed: duplicate` path with a link to the superseding GitHub issue
- already-implemented closures cite the exact version, PR, release, or documentation evidence and use QA's direct closure path
- the downstream execution-policy stage sequence is correct for the issue type
- required all-of gates are modeled as separate sequential stages instead of one multi-participant stage
- if the issue needs a public answer or closure outside QA's direct GitHub authority, the board-approval path is explicit

## Planning Gate

Before implementation starts, the plan artifact must state:

- target repository and branch
- target release or release line
- the QA-derived release-targeting facts still hold, or any revision is explicitly justified
- problem statement and expected outcome
- acceptance criteria
- compatibility and migration impact
- test strategy
- documentation impact
- whether the change must remain non-breaking
- the QA-selected Micronaut organization project, or the recorded ambiguity or tooling gap that explains why the live PR may not carry it yet
- explicit human approval when the change needs one

If any required items above are missing, planning does not resolve as `approved`. The QA-selected organization project or ambiguity note should be carried forward, but missing live linkage alone does not block planning approval.

## Implementation Gate

Before code or docs leave implementation:

- the change is the smallest safe diff
- the change follows the approved plan or makes the QA reproducer pass
- tests cover the changed behavior, or the implementation artifact explains why that is impossible
- docs impact is addressed or explicitly ruled out
- branch and release-line choices are correct
- git work used the local git CLI
- hidden cleanup has not been bundled without approval
- the next QA stage can verify the work without reconstructing intent from scratch

## QA Gate

The QA Engineer verifies:

- intake decisions are correct and the downstream stage sequence is correct
- release-targeting facts, allowed change class, and organization-project selection from QA intake are correct
- the implementation still matches the approved plan or the reproducer
- when a linked contributor PR exists, QA has correctly decided whether it remains the implementation vehicle or should be replaced
- the original issue or PR concern is actually resolved
- tests and documentation support the claimed change
- no important acceptance criteria were silently dropped
- public answers and closure paths use the correct GitHub labels when applicable, include enough detail for the reporter, treat evidence-backed already-implemented issues as part of QA's direct closure authority, and only require Paperclip board approval when the path is outside QA's direct GitHub authority

Work that passes QA moves into the next configured review stage or completes through the allowed direct GitHub answer or closure path. Inside an active execution-policy stage, QA should let Paperclip move the issue into the next `in_review` participant automatically. When QA is changing owners outside the active review chain, it should use a normal `TODO` assignment plus a clear next-action comment. Work that needs a board-approved public answer or closure resolves as `request_board_approval`. Work that fails QA resolves as `changes_requested`.

## Security Gate

The Security Engineer checks for:

- source-code exploit paths and attack-surface changes
- authentication, authorization, secret handling, serialization, filesystem, process, and network risk
- dependency, build, CI/CD, release, and supply-chain risk
- insecure defaults or examples that would steer users into unsafe deployment or configuration choices
- whether blocking findings are concrete enough to justify `changes_requested`

If the work is approved, it moves to Code Reviewer. If not, it returns through the execution policy as `changes_requested`.

## Code Review Gate

The Code Reviewer checks for:

- correctness beyond the happy path
- maintainability and readability
- performance and regression risk
- API, config, and developer-experience quality
- missing or weak tests
- correct PR issue linkage, `type:` label, reviewer requests, and organization-project guidance chosen during QA intake
- if `approved` is chosen, a non-draft GitHub PR exists by the end of the run in the correct repository and branch, is readable from the synced GitHub context, and includes the correct issue linkage, closing keyword, and `type:` label; the organization project should be linked when the chosen project exists and GitHub tooling can apply it, but missing organization-project linkage due to no matching project or tooling gaps alone does not block code review approval

If the work is approved, the Code Reviewer creates or verifies the PR. If not, it resolves as `changes_requested`.

## PR Gate

Before a PR is considered healthy:

- the Code Reviewer created the PR after QA and Security Engineer stages approved, or verified an acceptable already-open contributor PR after those stages approved
- the synced Paperclip delivery item remains open until GitHub merge or an approved GitHub closure path syncs back
- the summary and rationale are coherent
- linked issue context is accurate and uses a closing keyword
- the PR carries exactly one `type:` label
- the PR should be linked to the Micronaut organization project chosen during QA intake when GitHub tooling can apply it; if that choice carried ambiguity, the PR description repeats it; missing organization-project linkage due to no matching project or tooling gaps does not by itself block a healthy PR
- test evidence is ready to share
- documentation or migration notes are included when needed
- security review comments are addressed
- CI is green
- Sonar Quality Gate issues are addressed
- all review threads are resolved
- the maintainers can understand the change without reconstructing hidden context
- the team remembers that only the board or other maintainers merge or release
