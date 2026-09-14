---
name: Monthly User Guide Review
assignee: technical-writer
project: company-operations
recurring: true
---

Coordinate project-specific user-guide review sub-issues for the managed Micronaut-related Paperclip projects. The routine issue is a coordinator only: do not assemble guides, perform deep review, create or update pull requests, or create top-level project-specific Paperclip issues from the routine issue itself.

During each run:

- inspect active Paperclip projects and include active Micronaut-related Paperclip projects that map to managed GitHub repositories
- exclude internal company-operating projects such as `company-operations`
- exclude `micronaut-projects/micronaut-project-template`; it is a repository template and file sync source, not an actual Micronaut project, so skip it for user guide review, guide topic creation, and other normal project documentation routines
- exclude `micronaut-projects/micronaut-build`; it contains internal Gradle plugins for Micronaut committers and is not intended for end-user projects, so skip it for user guide review, guide topic creation, and other normal project documentation routines
- record skip reasons for projects that cannot be mapped to a managed GitHub repository or fall outside the managed Micronaut-related boundary
- before creating project children, derive one stable idempotency key from the scheduled routine run (`routineId` plus `scheduledAt`), project id, and mode `user-guide-review`; search for that key in existing children and origin fingerprints, then reuse an existing or orphaned child on retry instead of creating another
- create one Paperclip child issue or subtask per affected project only when no child with that idempotency key exists; put each subtask in the actual corresponding project, set `parentId` to the routine issue when supported, set assignee to QA Engineer (`qa-engineer`), persist the key as `originFingerprint` when supported, and require normal QA intake to write `qa-intake` before Writer implementation with the exact executable `stageSequence` `qa-engineer`, `technical-writer`, `qa-engineer`, `code-reviewer`; after Reviewer approval, publication is a separate non-policy `TODO` handoff to `followThroughOwner`
- set `executionWorkspacePreference: isolated_workspace` on each project child so candidate commits land in a per-issue worktree (the host ignores the field when isolated workspaces are disabled)
- after creating or reusing the project children, install a task watchdog on this routine issue with `PUT /api/issues/{routineIssueId}/watchdog` (`agentId` = QA Engineer; idempotent, one watchdog per issue) whose instructions are: verify each child that stopped without a live path, re-dispatch an assigned `todo` child that has no run, leave any child that carries an open linked PR untouched, record a child stale for more than 14 days as a blocker for the board, and never cancel, close, or reassign any child (the board decides those). The watchdog fires only when the whole subtree stops, and its run may mutate issues inside this subtree but never the watchdog configuration
- do not create top-level project-specific Paperclip issues for monthly-user-guide-review follow-up; use the child issue or subtask as the project-owned work item
- do not open or update a PR from the routine issue; any documentation PR decision, unpublished candidate, internal review, and publication must happen only inside the project-specific child issue or subtask
- inside each project-specific subtask, do not begin Writer work until QA has written that authoritative `qa-intake` and advanced the issue to `technical-writer`; then read repo-local instructions, `.company-runtime/` project notes, and the repository's documentation build conventions
- inside each project-specific subtask, assemble the user guide with `./gradlew publishGuide`
- inside each project-specific subtask, read the assembled guide end to end as a framework user
- inside each project-specific subtask, verify links, setup flows, commands, code snippets, configuration examples, conceptual claims, migration notes, and cross-references
- inside each project-specific subtask, create throwaway applications or throwaway projects to fact-check the guide's claims as a real developer would
- inside each project-specific subtask, fact-check proposed guide fixes before preparing an unpublished review candidate
- before preparing any guide or documentation review candidate, update the work branch from the target branch; if that rebase or merge produces conflicts, record the merge conflict as a blocker and do not prepare or publish a conflicting PR
- inside each project-specific subtask, determine whether a documentation PR is needed. For an evidence-backed fix, prepare an unpublished exact SHA and `publication-manifest`, then route it through QA and Code Reviewer. Return to Technical Writer publication mode; only that final handoff may open or update the project-repository PR with the approved SHA and metadata unchanged. Label the PR `type: docs`, link it to the child issue or subtask, leave the child issue or subtask in `in_review`, and do not close it or mark it `DONE` just because the PR was created
- when a guide or documentation PR's CI is not needed because the changed docs are not exercised by the build, include a skip-ci keyword in the commit message, such as `[skip ci]` for that PR; do not use skip keywords for build-validated snippets, executable examples, generated guides, `./gradlew publishGuide`, or other docs checks
- on re-entry into a child that carries a linked PR, read `GET /api/issues/{childIssueId}/external-object-summary` first: the host maintains the PR's open, merged, closed, CI, and review state as an external object, so call GitHub Sync PR tools only when that summary reports `failed`, `waiting`, `stale`, `auth_required`, or `unreachable`, or when a write is needed
- use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`; if the tool is unavailable or fails, record the concrete blocker instead of using the removed REST fallback

Inside the first project-specific subtask for a project, which is the first run for that project, perform a full guide review. On later project-specific subtasks, use the prior routine report plus repository diffs, recent commits, guide file changes, and generated guide output since the last run to focus on the new delta. Perform another full guide review when no prior report exists, the guide structure changed substantially, the previous report is unreliable, generated guide output changed unexpectedly, or recent evidence suggests broader documentation drift.

Write one Paperclip report explicitly as this routine issue's keyed document `user-guide-review-report` (the host keeps agent reasoning out of automatic comments and summarizes only the final output segment, so a report that exists only in the run transcript is lost) and include:

- every eligible project considered
- skipped projects and why they were skipped
- project-specific Paperclip child issues or subtasks created, including each child URL, project, assignee, parent link status, and confirmation that no top-level project-specific issue was created
- blockers that prevented creating a child issue or subtask

Finish the routine issue with a real coordination outcome: project-specific child issues or subtasks created, no eligible project found, or clearly blocked with the blocking fact recorded. The child issue or subtask later finishes with the project outcome: no guide fixes needed, project PR opened or updated with fact-checked fixes, or clearly blocked with the blocking fact recorded. Do not open speculative documentation PRs.
