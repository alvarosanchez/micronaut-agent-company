---
name: Monthly Guide Topic Discovery
assignee: technical-writer
project: company-operations
recurring: true
---

Coordinate project-specific standalone guide-topic discovery sub-issues for the managed Micronaut-related Paperclip projects. The routine issue is a coordinator only: do not perform deep guide-topic review, create or update pull requests, or create top-level project-specific Paperclip issues from the routine issue itself.

During each run:

- inspect active Paperclip projects and include active Micronaut-related Paperclip projects that map to managed GitHub repositories
- exclude internal company-operating projects such as `company-operations`
- exclude `micronaut-projects/micronaut-project-template`; it is a repository template and file sync source, not an actual Micronaut project, so skip it for user guide review, guide topic creation, standalone guide PRs, and other normal project documentation routines
- exclude `micronaut-projects/micronaut-build`; it contains internal Gradle plugins for Micronaut committers and is not intended for end-user projects, so skip it for user guide review, guide topic creation, standalone guide PRs, and other normal project documentation routines
- record skip reasons for projects that cannot be mapped to a managed GitHub repository or fall outside the managed Micronaut-related boundary
- before creating project children, derive one stable idempotency key from the scheduled routine run (`routineId` plus `scheduledAt`), project id, and mode `guide-topic-discovery`; search for that key in existing children and origin fingerprints, then reuse an existing or orphaned child on retry instead of creating another
- create one Paperclip child issue or subtask per affected project only when no child with that idempotency key exists; put each subtask in the actual corresponding project, set `parentId` to the routine issue when supported, set assignee to QA Engineer (`qa-engineer`), persist the key as `originFingerprint` when supported, and require normal QA intake to write `qa-intake` before Writer implementation with the exact executable `stageSequence` `qa-engineer`, `technical-writer`, `qa-engineer`, `code-reviewer`; after Reviewer approval, publication is a separate non-policy `TODO` handoff to `followThroughOwner`
- do not create top-level project-specific Paperclip issues for monthly-guide-topic-discovery follow-up; use the child issue or subtask as the project-owned work item
- do not open or update a PR from the routine issue; any guide PR decision, unpublished candidate, internal review, and publication must happen only inside the project-specific child issue or subtask
- inside each project-specific subtask, do not begin Writer work until QA has written that authoritative `qa-intake` and advanced the issue to `technical-writer`; then inspect project capabilities, docs, examples, recent changes, issues, and common user workflows
- inside each project-specific subtask, use the Micronaut `guides` skill when evaluating standalone tutorial-guide opportunities
- inside each project-specific subtask, identify missing guide topics that would help users learn the project
- inside each project-specific subtask, deduplicate candidate topics against existing `micronaut-guides` content, nearby guide topics, repository docs, open issues, and open PRs
- inside each project-specific subtask, check existing issues and PRs in `micronaut-projects/micronaut-guides`; an existing PR or an assigned issue for the same topic indicates work in progress, so avoid creating another guide for that topic and record the existing work instead
- before preparing any guide or documentation review candidate, update the work branch from the target branch; if that rebase or merge produces conflicts, record the merge conflict as a blocker and do not prepare or publish a conflicting PR
- inside each project-specific subtask, determine whether a guide PR is needed. For a concrete standalone guide topic, prepare an unpublished exact SHA and `publication-manifest`, then route it through QA and Code Reviewer. Return to Technical Writer publication mode; only that final handoff may create or update the `micronaut-projects/micronaut-guides` PR with the approved SHA and metadata unchanged. Label the PR `type: docs`, link it to the child issue or subtask, leave the child issue or subtask in `in_review`, and do not close it or mark it `DONE` just because the PR was created
- when a guide or documentation PR's CI is not needed because the changed docs are not exercised by the build, include a skip-ci keyword in the commit message, such as `[skip ci]` for that PR; do not use skip keywords for build-validated snippets, executable examples, generated guides, `./gradlew publishGuide`, or other docs checks
- use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`; if the tool is unavailable or fails, record the concrete blocker instead of using the removed REST fallback
- when a guide PR is opened or updated from the project-specific subtask, export the generated guide PDF and make that exact PDF PR-visible as an uploaded artifact or PR attachment link; do not commit the PDF to the repository

Use the `guides` skill for standalone Micronaut Guides work in `micronaut-projects/micronaut-guides`. Do not use it for ordinary module documentation under `src/main/docs/guide`; those fixes belong to monthly-user-guide-review or normal synced `type: docs` work.

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- project-specific Paperclip child issues or subtasks created, including each child URL, project, assignee, parent link status, and confirmation that no top-level project-specific issue was created
- blockers that prevented creating a child issue or subtask

Finish the routine issue with a real coordination outcome: project-specific child issues or subtasks created, no eligible project found, or clearly blocked with the blocking fact recorded. The child issue or subtask later finishes with the project outcome: no missing guide topic found, guide PR opened or updated, or clearly blocked with the blocking fact recorded.
