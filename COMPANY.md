---
name: Micronaut Agent Company
description: Agent company for Micronaut open-source maintenance that drives a related repository cluster to zero open GitHub issues and pull requests through triage, planning, implementation, QA, security review, code review, and documentation.
slug: micronaut-agent-company
schema: agentcompanies/v1
version: 1.0.5
license: MIT
authors:
  - name: Álvaro Sánchez-Mariscal
goals:
  - Keep a defined Micronaut repository cluster at inbox zero: every synced GitHub issue and pull request is either closed or actively owned with a next action.
  - Enforce the lifecycle `BACKLOG -> TODO -> QA -> implementation -> QA -> Security Engineer -> Code Reviewer -> PR cycle -> human merge`.
  - Preserve Micronaut's developer experience by favoring small, well-tested, well-documented changes that fit release-branch realities.
  - Separate triage, architecture, implementation, QA, security review, code review, and human governance so maintainers get clear handoffs and auditable quality gates.
  - Treat documentation, migrations, contributor ergonomics, and security posture as first-class parts of every user-facing change.
  - Run lightweight internal operating routines for proactive security scanning and continuous company improvement without replacing the synced GitHub work queue.
  - Keep the package reimport-safe by treating package-owned instruction files as immutable inside imported company instances, routing local guidance into additive overlays, and promoting reusable defaults through PRs to the source repository.
  - Keep merge and release authority with the board or other Micronaut maintainers; agents may prepare work but never merge or cut releases.
tags:
  - micronaut
  - java
  - github
  - maintenance
  - open-source
  - security
---

Micronaut Agent Company is a lean maintenance company for Micronaut open-source development. It is designed for Paperclip companies that own a bounded cluster of related repositories inside the `micronaut-projects` GitHub organization and assumes the GitHub sync plugin is responsible for syncing GitHub issues and PRs into Paperclip and exposing GitHub operations as agent tools.

The package combines local company-specific operating skills with referenced maintainer skills pinned to `micronaut-project-template`, so agents inherit upstream Micronaut coding, docs, and Gradle guidance without copying those skills into the company package.

The company operates as a gated pipeline:

1. The sync plugin creates new GitHub issues in Paperclip in `BACKLOG`, assigned to **QA Engineer**.
2. A human reviews backlog items and moves actionable ones to `TODO`.
3. **QA Engineer** deduplicates the issue, applies the correct GitHub `type:` label, and routes it by issue type.
4. **Architect** plans `type: improvement`, `type: enhancement`, `type: breaking`, and `type: dependency-upgrade` work, explicitly approves any breaking change, and chooses the exact Micronaut organization project that matches the intended release.
5. **Micronaut Engineer** or **Technical Writer** implements the work using local git CLI only.
6. **QA Engineer** verifies the implementation against the Architect's plan or the reproducer test and either returns it for rework or signs it off.
7. **Security Engineer** reviews the source, dependency, build, CI/CD, configuration, and documentation attack surface and either returns the work for remediation or passes it onward.
8. **Code Reviewer** reviews for code quality, developer experience, performance, and maintainability, then creates the GitHub PR directly when the work is approved and links it to the chosen Micronaut organization project.
9. **Micronaut Engineer** owns the PR cycle after PR creation: CI must stay green, Sonar Quality Gate issues must be addressed, all review threads must be resolved, and the chosen project link must stay correct if the PR is retargeted.
10. The board or other Micronaut maintainers merge the PR or cut the release, and the sync plugin eventually marks the Paperclip item `DONE`.

The board is intentionally not modeled as an agent role. Board approval is a human comment in Paperclip, and merge or release authority remains human.

This package is intentionally generic about repository selection. The GitHub sync plugin configuration defines the actual repository set and creates the Paperclip projects and synced issues or PRs that become the real work queue. Use `references/repository-cluster.md` only for supplemental operational facts that the sync configuration does not capture well, such as release-line notes, CI commands, Sonar quirks, docs conventions, and maintainer preferences.

The package also includes one lightweight internal project, `company-operations`, with two recurring Paperclip routines: a weekly **Security Engineer** deep scan and a weekly **CEO** self-improvement review. These are company-operating routines, not delivery backlog, and they exist to keep the maintenance system healthy even when the synced GitHub queue is temporarily quiet. The CEO routine may also promote reusable company learnings into PRs against the source package repository when a default should improve for future imports.

Because this company package is expected to be reimported over time, its package-owned instruction files should be treated as immutable defaults inside imported company instances. Agents may read optional additive overlays from `.company-runtime/` in the current workspace root, and should write learned local guidance there instead of mutating the package-owned files in place:

- `.company-runtime/shared.md`
- `.company-runtime/agents/<agent-slug>.md`
- `.company-runtime/projects/<project-slug>.md`

These overlay files are intentionally outside the importable package surface so local runtime learnings can survive repeated imports of newer package versions. When a learning should become part of the default package behavior for future imports, the CEO should promote it through a PR to `https://github.com/alvarosanchez/micronaut-agent-company` instead of baking it into a local overlay.
