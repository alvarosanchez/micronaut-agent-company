---
name: micronaut-quality-gates
description: Shared definition of done for Micronaut planning, implementation, review, QA, and PR handoff.
---

# Micronaut Quality Gates

This skill defines the minimum bar each role must protect before work advances to the next stage.

## Intake Gate

Before an actionable issue moves out of QA triage:

- a human has moved the synced issue from `BACKLOG` to `TODO`
- deduplication has been performed
- the issue has the correct `type:` label
- the next owner is explicit
- if the issue is a bug, a reproducer test or reproducer verification note exists
- if the issue is an unreproducible bug or a question that needs a final public answer, the board-approval path is explicit

## Planning Gate

Before implementation starts, the plan must state:

- target repository and branch
- target release or release line
- problem statement and expected outcome
- acceptance criteria
- compatibility and migration impact
- test strategy
- documentation impact
- whether the change must remain non-breaking
- explicit Architect approval if the change is breaking

If any of these are missing, the item is not ready.

## Implementation Gate

Before code or docs leave implementation:

- the change is the smallest safe diff
- the change follows the Architect's plan or makes the QA reproducer pass
- tests cover the changed behavior or a reason is given when tests cannot be added
- docs impact is addressed or explicitly ruled out
- branch and release-line choices are correct
- git work used the local git CLI
- the implementer is handing back to QA, not skipping straight to PR creation
- hidden cleanup has not been bundled without approval

## Review Gate

The Core Reviewer checks for:

- correctness beyond the happy path
- maintainability and readability
- security, performance, and regression risk
- API, config, and developer-experience quality
- missing or weak tests
- correct PR issue linkage and `type:` label when approving work

If the work is approved, the Core Reviewer creates the PR. If not, it goes back to implementation and then re-enters QA.

## QA Gate

The QA Engineer verifies:

- the implementation still matches the Architect's plan
- the original issue or PR concern is actually resolved
- tests and documentation support the claimed change
- no important acceptance criteria were silently dropped
- unreproducible bug closures and question answers have the required board approval comment before anything is published on GitHub

Work that passes QA moves to Core Reviewer. Work that fails QA goes back to the implementer.

## PR Gate

Before a PR is considered healthy:

- the Core Reviewer created the PR after QA sign-off
- summary and rationale are coherent
- linked issue context is accurate and uses a closing keyword
- the PR carries exactly one `type:` label
- test evidence is ready to share
- documentation or migration notes are included when needed
- CI is green
- Sonar Quality Gate issues are addressed
- all review threads are resolved
- the maintainers can understand the change without reconstructing hidden context
- the team remembers that only the board or other maintainers merge or release
