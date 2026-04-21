---
name: Micronaut Agent Company
description: Agent company for Micronaut open-source maintenance that drives a related repository cluster to zero open GitHub issues and pull requests through triage, planning, implementation, QA, security review, code review, and documentation.
slug: micronaut-agent-company
schema: agentcompanies/v1
version: 1.2.0
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
3. **QA Engineer** handles the intake stage, deduplicates against GitHub issues in the synced repository, applies the correct GitHub `type:` label, determines the repository's current default-branch release target and best-fit Micronaut organization project, chooses the correct downstream execution-policy stage sequence for that issue type, and evaluates any already-linked PR.
4. **Architect** handles the planning stage for `type: improvement`, `type: enhancement`, `type: breaking`, and `type: dependency-upgrade` work, consumes QA's release-targeting facts, and locks the implementation plan.
5. **Micronaut Engineer** or **Technical Writer** handles the implementation stage using local git CLI only.
6. **QA Engineer** handles the verification stage and either approves the work for security review or resolves the stage with `changes_requested`.
7. **Security Engineer** handles the security stage and either approves the work for code review or resolves the stage with `changes_requested`.
8. **Code Reviewer** handles the final review stage, creates the GitHub PR directly when the work is approved, or verifies an acceptable already-open PR, and links the surviving PR to the Micronaut organization project chosen during QA intake when that project exists and GitHub tooling can apply it.
9. **Micronaut Engineer** handles PR follow-through after PR creation: CI must stay green, Sonar Quality Gate issues must be addressed, all review threads must be resolved, and any chosen project link must stay correct if the PR is retargeted.
10. The board or other Micronaut maintainers merge the PR or cut the release, and the sync plugin eventually marks the Paperclip item `DONE`.

Each stage acts only when it is the current execution stage participant. Inside an active review or approval stage, the runtime is the routing mechanism: only `executionState.currentParticipant` can decide the stage, approving with `status: done` advances to the next participant while the issue stays in `in_review` until the final stage, and requesting changes with a non-`done` status, preferably `in_progress`, routes back through `executionState.returnAssignee`. For synced GitHub delivery work, `approved` advances the work through the next stage or into a documented follow-through route; it does not mean the item is finished, and agents must not mark the Paperclip issue `DONE` themselves. Closing a synced GitHub issue also does not mean manually closing the Paperclip item; the GitHub sync plugin handles that on the next sync. Use normal `TODO` assignment only for non-policy owner changes such as intake-to-planning, planning-to-implementation, or post-PR follow-through. QA keeps intake and verification in separate keyed issue documents, `qa-intake` and `qa-verification`, instead of overwriting one QA record with the other.

The board is intentionally not modeled as an agent role. Board approval is an explicit human Paperclip approval linked to the relevant issue or proposal, and merge or release authority remains human. When the approval is asking permission to post a maintainer-visible GitHub comment, or proposes a GitHub action with a maintainer-visible `commentBody`, the approval request must put the exact proposed comment body in `recommendedAction` so the default approval card shows the literal public text without expanding hidden fields.

Paperclip issues are single-assignee by design: keep one current owner, either an agent or a human, and use linked approvals for governance because they are not a second assignee. Treat `TODO` as dispatch state, `in_progress` as active work, `blocked` as an external wait, and `in_review` as reviewer or approver turn. For agent-owned work, move into `in_progress` only after checkout; if assigned `todo` or `in_progress` work loses its live wake path, let Paperclip spend its one automatic recovery wake and then treat any resulting `blocked` plus visible stranded-work comment as a repair signal. Use `parentId` for structural context and use `blockedByIssueIds` for dependency semantics; when one issue truly waits on another, do not rely on `parentId` alone.

Imported issues may already have a linked PR from an external contributor. QA evaluates that PR during intake. If it is good enough to salvage, the issue stays on the normal gates and later stages are responsible for getting that existing PR into the same mergeable condition expected of an agent-created PR. If the PR needs substantial replacement work, QA leaves the contributor PR open, records that it is not the implementation vehicle, and still routes the issue itself through the normal engineering pipeline toward a separate maintainer-owned PR.

Immediate closure outcomes such as duplicate, stale, out-of-scope, or already-implemented issues are handled during QA triage as documented closure dispositions rather than new `type:` labels. QA may answer confident questions directly on GitHub with `type: question` and `closed: question`, request clarification with `status: awaiting feedback`, and close issues that stay awaiting feedback for more than 30 days with `closed: question`. QA may also close unreproducible reports with `closed: cannot reproduce` and clear duplicates with `closed: duplicate` plus a link to the superseding GitHub issue. Every such GitHub closure must include a comment with enough detail for the reporter to understand why the issue was closed. For already-implemented reports, QA can close the issue directly without board approval once the closure comment cites the exact version, PR, release, or documentation evidence that shows the requested work already exists.

This package is intentionally generic about repository selection. The GitHub sync plugin configuration defines the actual repository set and creates the Paperclip projects and synced issues or PRs that become the real work queue. Put supplemental operational facts that agents need at runtime, such as release-line notes, CI commands, Sonar quirks, docs conventions, and maintainer preferences, into `.company-runtime/shared.md` or `.company-runtime/projects/<project-slug>.md`. Machine-local checkout paths, workspace services, jobs, and runtime overrides belong on the live Paperclip project or execution workspace instead of this portable package, and heartbeats do not auto-start those services.

QA triage trusts the repository's actual current default branch. During intake it determines the latest stable release, the next release implied by that default branch, whether that branch has already shipped, whether the issue's SemVer impact is allowed on that branch, and the best-fit Micronaut organization project for the eventual PR from the open, public Micronaut organization projects (`is:open is:public`). If the project choice is ambiguous, QA still chooses the best-fit board and records the ambiguity for the later PR description.

Because synced GitHub delivery issues are created by the GitHub sync plugin after import, Paperclip blocker graphs and execution policies for those items should be configured in the live Paperclip instance or sync layer rather than encoded in this portable package. In practice, that means the live system should attach review stages that match this company workflow and use linked Paperclip approvals for board governance. If a linked approval is gating a maintainer-visible GitHub comment or a GitHub action with `commentBody`, the approval request must carry the exact proposed comment body in `recommendedAction` rather than only a summary or a hidden `proposedCommentBody` or `proposedGithubAction.commentBody` field.

The package also includes one lightweight internal project, `company-operations`, with one bootstrap **CEO** verification issue plus two recurring Paperclip routines: a weekly **Security Engineer** deep scan and a daily **CEO** self-improvement review. The bootstrap issue imports in `TODO` so the CEO can verify that the imported entities are complete before normal operations begin. The recurring routines are company-operating work, not delivery backlog, and they exist to keep the maintenance system healthy even when the synced GitHub queue is temporarily quiet. They import active by default so those maintenance checks start automatically after import. The CEO routine may also promote reusable company learnings into PRs against the source package repository when a default should improve for future imports, but it must end with a real action such as an implemented change, a linked board approval request, or a package PR instead of a proposal-only report. One required review point for that routine is stale handoff repair: when issue status, assignee, `executionState.currentParticipant`, `executionState.returnAssignee`, and the expected next owner disagree, the CEO should correct the routing if possible instead of only reporting it.

Because this company package is expected to be reimported over time, its package-owned instruction files should be treated as immutable defaults inside imported company instances. Agents may read optional additive overlays from `.company-runtime/` in the current workspace root, and should write learned local guidance there instead of mutating the package-owned files in place:

- `.company-runtime/shared.md`
- `.company-runtime/agents/<agent-slug>.md`
- `.company-runtime/projects/<project-slug>.md`

These overlay files are intentionally outside the importable package surface so local runtime learnings can survive repeated imports of newer package versions. When a learning should become part of the default package behavior for future imports, the CEO should promote it through a PR to `https://github.com/alvarosanchez/micronaut-agent-company` instead of baking it into a local overlay.

Here, a `.company-runtime/` overlay simply means an optional local sidecar folder at the workspace root for instance-specific guidance. If that folder does not exist, there is no active local overlay. Paperclip's bundled system skills such as `paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, and `para-memory-files` are not editable from this package; fill any example gaps with company-owned guidance or skills instead.
