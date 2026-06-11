---
name: Weekly Guide Topic Discovery
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
- create one Paperclip child issue or subtask per affected project when the project exists in Paperclip before any guide PR is opened; put each subtask in the actual corresponding project, set `parentId` to the routine issue when supported, set assignee to Technical Writer, and describe the project-specific guide-topic discovery to perform
- do not create top-level project-specific Paperclip issues for Weekly Guide Topic Discovery follow-up; use the child issue or subtask as the project-owned work item
- do not open or update a PR from the routine issue; any guide PR decision and PR creation must happen only inside the project-specific child issue or subtask
- inside each project-specific subtask, inspect project capabilities, docs, examples, recent changes, issues, and common user workflows
- inside each project-specific subtask, use the Micronaut `guides` skill when evaluating standalone tutorial-guide opportunities
- inside each project-specific subtask, identify missing guide topics that would help users learn the project
- inside each project-specific subtask, deduplicate candidate topics against existing `micronaut-guides` content, nearby guide topics, repository docs, open issues, and open PRs
- inside each project-specific subtask, check existing issues and PRs in `micronaut-projects/micronaut-guides`; an existing PR or an assigned issue for the same topic indicates work in progress, so avoid creating another guide for that topic and record the existing work instead
- before opening or updating any guide or documentation PR, update the work branch from the target branch; if that rebase or merge produces conflicts, record the merge conflict as a blocker and do not open or update a conflicting PR
- inside each project-specific subtask, determine whether a guide PR is needed; because any such PR is created outside the normal delivery pipeline, create or update a PR in `micronaut-projects/micronaut-guides` only when a concrete standalone guide topic is warranted, label the PR `type: docs`, link any resulting PR to that child issue or subtask, leave the child issue or subtask in `in_review`, and do not close it or mark it `DONE` just because the PR was created
- when a guide or documentation PR's CI is not needed because the changed docs are not exercised by the build, include a skip-ci keyword in the commit message, such as `[skip ci]` for that PR; do not use skip keywords for build-validated snippets, executable examples, generated guides, `./gradlew publishGuide`, or other docs checks
- use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`; if the tool is unavailable or fails, record the concrete blocker instead of using the removed REST fallback
- when a guide PR is opened or updated from the project-specific subtask, export the generated guide PDF and make that exact PDF PR-visible as an uploaded artifact or PR attachment link; do not commit the PDF to the repository

Use the `guides` skill for standalone Micronaut Guides work in `micronaut-projects/micronaut-guides`. Do not use it for ordinary module documentation under `src/main/docs/guide`; those fixes belong to Weekly User Guide Review or normal synced `type: docs` work.

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- project-specific Paperclip child issues or subtasks created, including each child URL, project, assignee, parent link status, and confirmation that no top-level project-specific issue was created
- blockers that prevented creating a child issue or subtask

Finish the routine issue with a real coordination outcome: project-specific child issues or subtasks created, no eligible project found, or clearly blocked with the blocking fact recorded. The child issue or subtask later finishes with the project outcome: no missing guide topic found, guide PR opened or updated, or clearly blocked with the blocking fact recorded.
