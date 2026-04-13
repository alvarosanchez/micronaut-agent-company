---
name: micronaut-quality-gates
description: Shared definition of done for Micronaut planning, implementation, review, QA, and PR handoff.
---

# Micronaut Quality Gates

This skill defines the minimum bar each role must protect before work advances to the next stage.

## Planning Gate

Before implementation starts, the plan must state:

- target repository and branch
- problem statement and expected outcome
- acceptance criteria
- compatibility and migration impact
- test strategy
- documentation impact

If any of these are missing, the item is not ready.

## Implementation Gate

Before code or docs leave implementation:

- the change is the smallest safe diff
- tests cover the changed behavior or a reason is given when tests cannot be added
- docs impact is addressed or explicitly ruled out
- branch and release-line choices are correct
- hidden cleanup has not been bundled without approval

## Review Gate

The Code Reviewer checks for:

- correctness beyond the happy path
- maintainability and readability
- security, performance, and regression risk
- API, config, and developer-experience quality
- missing or weak tests

## QA Gate

The QA Engineer verifies:

- the implementation still matches the Architect's plan
- the original issue or PR concern is actually resolved
- tests and documentation support the claimed change
- no important acceptance criteria were silently dropped

## PR Gate

Before a PR is opened or updated:

- summary and rationale are coherent
- linked issues or PR context are accurate
- test evidence is ready to share
- documentation or migration notes are included when needed
- the maintainers can understand the change without reconstructing hidden context
