---
name: Review Open PRs
assignee: core-reviewer
project: inbox-zero-program
---

Review the entire open PR backlog for the repository cluster and decide the next action for each PR.

Expected outcomes:

- identify PRs that are structurally ready for maintainer merge once normal approvals are complete
- identify PRs that need engineering changes, QA re-verification, architect input, or maintainer intervention
- identify stale or superseded PRs
- surface architectural concerns that should go back to the Architect
- hand actionable PR work back to the Micronaut Engineer with a clear risk summary and next step

Remember that only the board or other Micronaut maintainers merge PRs. If a ready issue has finished `Engineering -> QA -> Core Reviewer` but no PR exists yet, create it directly with the sync plugin tools.
