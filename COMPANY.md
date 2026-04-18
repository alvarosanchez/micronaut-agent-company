---
name: Micronaut Agent Company
description: Agent company for Micronaut open-source maintenance that drives a related repository cluster to zero open GitHub issues and pull requests through triage, planning, implementation, QA, security review, code review, and documentation.
slug: micronaut-agent-company
schema: agentcompanies/v1
version: 1.1.3
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

Micronaut Agent Company is a lean maintenance company template for Micronaut open-source development. It is designed for Paperclip companies that own a bounded cluster of related repositories inside the `micronaut-projects` GitHub organization and assumes the GitHub sync plugin is responsible for syncing GitHub issues and PRs into Paperclip and exposing GitHub operations as agent tools.

The package combines local company-specific operating skills with referenced maintainer skills pinned to `micronaut-project-template`, so agents inherit upstream Micronaut coding, docs, and Gradle guidance without copying those skills into the company package.

The company operates as a gated pipeline driven by Paperclip execution policies:

1. The sync plugin creates new GitHub issues in Paperclip in `BACKLOG`.
2. A human reviews backlog items and moves actionable ones to `TODO`.
3. **QA Engineer** handles the intake stage, deduplicates against GitHub issues in the synced repository, applies the correct GitHub `type:` label, and chooses the correct downstream execution-policy stage sequence for that issue type.
4. **Architect** handles the planning stage for `type: improvement`, `type: enhancement`, `type: breaking`, and `type: dependency-upgrade` work, locks the implementation plan, and chooses the exact Micronaut organization project that matches the intended release.
5. **Micronaut Engineer** or **Technical Writer** handles the implementation stage using local git CLI only.
6. **QA Engineer** handles the verification stage and either approves the work for security review or resolves the stage with `changes_requested`.
7. **Security Engineer** handles the security stage and either approves the work for code review or resolves the stage with `changes_requested`.
8. **Code Reviewer** handles the final review stage, creates the GitHub PR directly when the work is approved, and links it to the chosen Micronaut organization project.
9. **Micronaut Engineer** handles PR follow-through after PR creation: CI must stay green, Sonar Quality Gate issues must be addressed, all review threads must be resolved, and the chosen project link must stay correct if the PR is retargeted.
10. The board or other Micronaut maintainers merge the PR or cut the release, and the sync plugin eventually marks the Paperclip item `DONE`.

Each stage acts only when it is the current execution stage participant. Agents resolve stages with `approved` or `changes_requested`, request linked Paperclip approvals when a human governance decision is required, and explicitly invoke the next reviewer heartbeat when they need the next stage to act immediately. Assignee flips and Paperclip handoff comments are not the workflow mechanism.

The board is intentionally not modeled as an agent role. Board approval is an explicit human Paperclip approval linked to the relevant issue or proposal, and merge or release authority remains human.

Immediate closure outcomes such as duplicate, stale, out-of-scope, or already-implemented issues are handled during QA triage as documented closure dispositions rather than new `type:` labels. For already-implemented reports, QA must capture the supporting version, PR, release, or documentation evidence and wait for the required Paperclip board approval before posting the GitHub explanation and closing the issue.

This package is intentionally generic about repository selection. The GitHub sync plugin configuration defines the actual repository set and creates the Paperclip projects and synced issues or PRs that become the real work queue. Put supplemental operational facts that agents need at runtime, such as release-line notes, CI commands, Sonar quirks, docs conventions, and maintainer preferences, into `.company-runtime/shared.md` or `.company-runtime/projects/<project-slug>.md`.

Because synced GitHub delivery issues are created by the GitHub sync plugin after import, Paperclip blocker graphs and execution policies for those items should be configured in the live Paperclip instance or sync layer rather than encoded in this portable package. In practice, that means the live system should attach review stages that match this company workflow and use linked Paperclip approvals for board governance.

The package also includes one lightweight internal project, `company-operations`, with one bootstrap **CEO** verification issue plus two recurring Paperclip routines: a weekly **Security Engineer** deep scan and a weekly **CEO** self-improvement review. The bootstrap issue imports in `TODO` so the CEO can verify that the imported entities are complete before normal operations begin. The recurring routines are company-operating work, not delivery backlog, and they exist to keep the maintenance system healthy even when the synced GitHub queue is temporarily quiet. They import active by default so those maintenance checks start automatically after import. The CEO routine may also promote reusable company learnings into PRs against the source package repository when a default should improve for future imports.

Because this company package is expected to be reimported over time, its package-owned instruction files should be treated as immutable defaults inside imported company instances. Agents may read optional additive overlays from `.company-runtime/` in the current workspace root, and should write learned local guidance there instead of mutating the package-owned files in place:

- `.company-runtime/shared.md`
- `.company-runtime/agents/<agent-slug>.md`
- `.company-runtime/projects/<project-slug>.md`

These overlay files are intentionally outside the importable package surface so local runtime learnings can survive repeated imports of newer package versions. When a learning should become part of the default package behavior for future imports, the CEO should promote it through a PR to `https://github.com/alvarosanchez/micronaut-agent-company` instead of baking it into a local overlay.
