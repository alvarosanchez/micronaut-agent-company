---
name: Weekly Inbox Zero Review
assignee: ceo
project: inbox-zero-program
schedule:
  timezone: Europe/Madrid
  startsAt: 2026-04-20T09:00:00+02:00
  recurrence:
    frequency: weekly
    interval: 1
    weekdays:
      - monday
    time:
      hour: 9
      minute: 0
---

Review the health of the Micronaut repository-cluster queue.

In each review:

- inspect `BACKLOG`, `TODO`, and PR aging separately
- confirm every open item has an owner, next action, and correct lifecycle stage
- confirm actionable issues have exactly one `type:` label or an explicit pending-triage reason
- confirm question answers and closure proposals waiting on a human Paperclip comment are visible to the board
- confirm PRs have an active owner for CI, Sonar, and review-thread follow-through
- close or escalate stalled work
- rebalance WIP across repositories and roles
- surface any repo-level patterns that should become recurring improvements
