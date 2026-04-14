---
name: Classify Open Issues
assignee: qa-engineer
project: inbox-zero-program
---

Sweep all synced open issues in the selected repository cluster that are ready for QA action.

For each issue:

- respect the human `BACKLOG -> TODO` gate and leave untouched issues in `BACKLOG` until a human promotes them
- run the deduplication search before deeper work starts
- classify it using the current triage rubric
- apply exactly one GitHub `type:` label to actionable issues
- request clarification only when the missing detail is truly blocking
- route reproduced bugs to the **Micronaut Engineer**
- hand improvements, enhancements, breaking changes, and dependency upgrades to the **Architect**
- hand docs-only work to the **Technical Writer**
- convert questions and closure candidates into explicit board-approval proposals instead of acting unilaterally
