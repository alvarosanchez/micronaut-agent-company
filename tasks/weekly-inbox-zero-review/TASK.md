---
name: Weekly Inbox Zero Review
assignee: ceo
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

- inspect issue and PR aging
- confirm every open item has an owner and next action
- close or escalate stalled work
- rebalance WIP across repositories and roles
- surface any repo-level patterns that should become recurring improvements
