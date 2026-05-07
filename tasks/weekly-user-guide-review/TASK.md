---
name: Weekly User Guide Review
assignee: technical-writer
project: company-operations
recurring: true
---

Review assembled user guides for the managed Micronaut-related Paperclip projects from the point of view of a developer using the framework.

During each run:

- inspect active Paperclip projects and include active Micronaut-related Paperclip projects that map to managed GitHub repositories
- exclude internal company-operating projects such as `company-operations`
- record skip reasons for projects that cannot be mapped to a managed GitHub repository or fall outside the managed Micronaut-related boundary
- read repo-local instructions, `.company-runtime/` project notes, and the repository's documentation build conventions
- assemble the user guide with `./gradlew publishGuide`
- read the assembled guide end to end as a framework user
- verify links, setup flows, commands, code snippets, configuration examples, conceptual claims, migration notes, and cross-references
- create throwaway applications or throwaway projects to fact-check the guide's claims as a real developer would
- fact-check proposed guide fixes before opening a PR
- because this routine can open PRs outside the normal delivery pipeline, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip, determine inside the subtask whether a documentation PR is needed, and link any resulting PR to that Paperclip issue
- use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`; when plugin tools are unavailable, call `POST /api/plugins/paperclip-github-plugin/api/issue-link` with `Authorization: Bearer ${PAPERCLIP_API_KEY}` and a JSON body containing `paperclipIssueId` plus `pullRequestUrl` or `reference`
- open or update a project-repository PR only for evidence-backed documentation fixes

On the first run for a project, perform a full guide review. On later runs, use the prior routine report plus repository diffs, recent commits, guide file changes, and generated guide output since the last run to focus on the new delta. Perform another full guide review when no prior report exists, the guide structure changed substantially, the previous report is unreliable, generated guide output changed unexpectedly, or recent evidence suggests broader documentation drift.

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- whether this was a first full pass, delta-only review, or forced full reread
- guide assembly result from `./gradlew publishGuide`
- links checked and failures found
- snippets, commands, and claims fact-checked
- throwaway applications or projects created and what they proved
- proposed changes fact-checked before PR creation
- Paperclip child issues or subtasks created for out-of-pipeline PRs, the PR URLs opened or updated, and the PR-to-Paperclip issue link status
- blockers such as missing guide assembly support, failed guide generation, unavailable repository access, or validation that could not be completed

Finish with a real outcome: no guide fixes needed, project PR opened or updated with fact-checked fixes, or clearly blocked with the blocking fact recorded. Do not open speculative documentation PRs.
