---
name: micronaut-quality-gates
description: Shared definition of done for Micronaut planning, implementation, QA, security review, code review, and PR handoff.
---

# Micronaut Quality Gates

This skill defines the minimum bar each role must protect before its execution-policy stage can resolve as `approved`.

## Shared Stage Contract

Before any role resolves its stage:

- the role has read the current execution stage, current stage participant, latest linked GitHub context, and any linked approval
- the role has produced one durable stage artifact that explains the decision
- the role resolves the stage with `approved` or `changes_requested` instead of routing by Paperclip handoff comment
- if a human governance decision is required, the role creates or updates a real Paperclip approval instead of treating a comment as approval
- if the next stage should run immediately, the role explicitly invokes the next agent heartbeat instead of assuming that adding a reviewer wakes them
- the role re-opens the issue and verifies the execution state matches the intended outcome before finishing

## Intake Gate

Before an actionable issue moves out of QA intake:

- a human has moved the synced issue from `BACKLOG` to `TODO`
- deduplication has been performed against GitHub issues in the same synced repository
- the issue has the correct `type:` label, unless it is on a documented immediate-closure path
- bugs have a reproducer or a precise non-reproducer record
- unreproduced bugs that now point toward closure use the explicit board-approval path instead of falling back to `changes_requested`
- the downstream execution-policy stage sequence is correct for the issue type
- required all-of gates are modeled as separate sequential stages instead of one multi-participant stage
- if the issue needs a public answer or approved closure, the board-approval path is explicit

## Planning Gate

Before implementation starts, the plan artifact must state:

- target repository and branch
- target release or release line
- problem statement and expected outcome
- acceptance criteria
- compatibility and migration impact
- test strategy
- documentation impact
- whether the change must remain non-breaking
- the exact Micronaut organization project the PR must use
- explicit human approval when the change needs one

If any of these are missing, planning does not resolve as `approved`.

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
- the implementation still matches the approved plan or the reproducer
- the original issue or PR concern is actually resolved
- tests and documentation support the claimed change
- no important acceptance criteria were silently dropped
- public answers and closure paths have the required Paperclip board approval before anything is published on GitHub

Work that passes QA moves into the next configured review stage. Work that needs a board-approved public answer or closure resolves as `request_board_approval`. Work that fails QA resolves as `changes_requested`.

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
- correct PR issue linkage, `type:` label, organization project, and reviewer requests when approving work

If the work is approved, the Code Reviewer creates or verifies the PR. If not, it resolves as `changes_requested`.

## PR Gate

Before a PR is considered healthy:

- the Code Reviewer created the PR after QA and Security Engineer stages approved
- the summary and rationale are coherent
- linked issue context is accurate and uses a closing keyword
- the PR carries exactly one `type:` label
- the PR is linked to the exact Micronaut organization project chosen earlier
- test evidence is ready to share
- documentation or migration notes are included when needed
- security review comments are addressed
- CI is green
- Sonar Quality Gate issues are addressed
- all review threads are resolved
- the maintainers can understand the change without reconstructing hidden context
- the team remembers that only the board or other maintainers merge or release
