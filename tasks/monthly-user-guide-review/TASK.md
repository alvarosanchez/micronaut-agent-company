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
- create one Paperclip child issue or subtask per affected project when the project exists in Paperclip before any documentation PR is opened; put each subtask in the actual corresponding project, set `parentId` to the routine issue when supported, set assignee to Technical Writer, and describe the project-specific guide review to perform
- do not create top-level project-specific Paperclip issues for Weekly User Guide Review follow-up; use the child issue or subtask as the project-owned work item
- do not open or update a PR from the routine issue; any documentation PR decision and PR creation must happen only inside the project-specific child issue or subtask
- inside each project-specific subtask, read repo-local instructions, `.company-runtime/` project notes, and the repository's documentation build conventions
- inside each project-specific subtask, assemble the user guide with `./gradlew publishGuide`
- inside each project-specific subtask, read the assembled guide end to end as a framework user
- inside each project-specific subtask, verify links, setup flows, commands, code snippets, configuration examples, conceptual claims, migration notes, and cross-references
- inside each project-specific subtask, create throwaway applications or throwaway projects to fact-check the guide's claims as a real developer would
- inside each project-specific subtask, fact-check proposed guide fixes before opening a PR
- before opening or updating any guide or documentation PR, update the work branch from the target branch; if that rebase or merge produces conflicts, record the merge conflict as a blocker and do not open or update a conflicting PR
- inside each project-specific subtask, determine whether a documentation PR is needed; because any such PR is created outside the normal delivery pipeline, open or update that project-repository PR only for evidence-backed documentation fixes, label the PR `type: docs`, link any resulting PR to that child issue or subtask, leave the child issue or subtask in `in_review`, and do not close it or mark it `DONE` just because the PR was created
- when a guide or documentation PR's CI is not needed because the changed docs are not exercised by the build, include a skip-ci keyword in the commit message, such as `[skip ci]` for that PR; do not use skip keywords for build-validated snippets, executable examples, generated guides, `./gradlew publishGuide`, or other docs checks
- use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`; if the tool is unavailable or fails, record the concrete blocker instead of using the removed REST fallback

Inside the first project-specific subtask for a project, which is the first run for that project, perform a full guide review. On later project-specific subtasks, use the prior routine report plus repository diffs, recent commits, guide file changes, and generated guide output since the last run to focus on the new delta. Perform another full guide review when no prior report exists, the guide structure changed substantially, the previous report is unreliable, generated guide output changed unexpectedly, or recent evidence suggests broader documentation drift.

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- project-specific Paperclip child issues or subtasks created, including each child URL, project, assignee, parent link status, and confirmation that no top-level project-specific issue was created
- blockers that prevented creating a child issue or subtask

Finish the routine issue with a real coordination outcome: project-specific child issues or subtasks created, no eligible project found, or clearly blocked with the blocking fact recorded. The child issue or subtask later finishes with the project outcome: no guide fixes needed, project PR opened or updated with fact-checked fixes, or clearly blocked with the blocking fact recorded. Do not open speculative documentation PRs.
