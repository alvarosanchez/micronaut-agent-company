---
name: Micronaut Inbox Zero Engineering
description: Agent company for Micronaut open-source maintenance that drives a related repository cluster to zero open GitHub issues and pull requests through triage, planning, implementation, review, QA, and documentation.
slug: micronaut-inbox-zero-engineering
schema: agentcompanies/v1
version: 1.0.0
license: MIT
authors:
  - name: Alvaro Sanchez
goals:
  - Keep a defined Micronaut repository cluster at inbox zero: every synced GitHub issue and pull request is either closed or actively owned with a next action.
  - Preserve Micronaut's developer experience by favoring small, well-tested, well-documented changes that fit release-branch realities.
  - Separate triage, architecture, implementation, review, and QA so maintainers get clear handoffs and auditable quality gates.
  - Treat documentation, migrations, and contributor ergonomics as first-class parts of every user-facing change.
tags:
  - micronaut
  - java
  - github
  - maintenance
  - open-source
---

Micronaut Inbox Zero Engineering is a lean maintenance company for Micronaut open-source development. It is designed for Paperclip companies that own a bounded cluster of related repositories inside the `micronaut-projects` GitHub organization.

The company operates as a gated pipeline:

1. **CEO** keeps the queue healthy, enforces repository-cluster scope, and decides priority.
2. **QA Engineer** triages newly synced issues and PRs, separating actionable work from items that need clarification.
3. **Architect** turns viable work into an implementation plan with branch, test, compatibility, and documentation guidance.
4. **Micronaut Engineer** and **Technical Writer** execute the plan on code and docs.
5. **Code Reviewer** reviews for code quality, security, performance, maintainability, and developer experience.
6. **QA Engineer** verifies the implementation still matches the original plan and acceptance criteria.
7. **Micronaut Engineer** opens or updates the GitHub PR after QA sign-off and drives the item to closure.

This package is intentionally generic about repository selection. After import, complete the bootstrap project first and update `references/repository-cluster.md` with the exact repositories, branches, and operational constraints for the company instance.
