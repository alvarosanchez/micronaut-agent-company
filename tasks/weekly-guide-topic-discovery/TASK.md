---
name: Weekly Guide Topic Discovery
assignee: technical-writer
project: company-operations
recurring: true
---

Identify missing standalone Micronaut Guide topics for the managed Micronaut-related Paperclip projects and prepare guide PRs when a concrete user-learning gap exists.

During each run:

- inspect active Paperclip projects and include active Micronaut-related Paperclip projects that map to managed GitHub repositories
- exclude internal company-operating projects such as `company-operations`
- record skip reasons for projects that cannot be mapped to a managed GitHub repository or fall outside the managed Micronaut-related boundary
- inspect project capabilities, docs, examples, recent changes, issues, and common user workflows
- use the Micronaut `guides` skill when evaluating standalone tutorial-guide opportunities
- identify missing guide topics that would help users learn the project
- deduplicate candidate topics against existing `micronaut-guides` content, nearby guide topics, repository docs, open issues, and open PRs
- check existing issues and PRs in `micronaut-projects/micronaut-guides`; an existing PR or an assigned issue for the same topic indicates work in progress, so avoid creating another guide for that topic and record the existing work instead
- because this routine can open PRs outside the normal delivery pipeline, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip before opening any guide PR, determine inside the subtask whether a guide PR is needed, and link any resulting PR to that Paperclip issue
- use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`; when plugin tools are unavailable, call `POST /api/plugins/paperclip-github-plugin/api/issue-link` with `Authorization: Bearer ${PAPERCLIP_API_KEY}` and a JSON body containing `paperclipIssueId` plus `pullRequestUrl` or `reference`
- create or update a PR in `micronaut-projects/micronaut-guides` when a concrete standalone guide topic is warranted
- when a guide PR is opened or updated, export the generated guide PDF and make that exact PDF PR-visible as an uploaded artifact or PR attachment link; do not commit the PDF to the repository

Use the `guides` skill for standalone Micronaut Guides work in `micronaut-projects/micronaut-guides`. Do not use it for ordinary module documentation under `src/main/docs/guide`; those fixes belong to Weekly User Guide Review or normal synced `type: docs` work.

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- candidate missing guide topics considered
- deduplication searches in project docs and `micronaut-projects/micronaut-guides`, including rejected duplicate or near-duplicate topics, existing PRs, and assigned issues treated as work in progress
- selected guide topic and why it matters
- source facts from the local project that prove the guide content
- Paperclip child issues or subtasks created for out-of-pipeline PRs, PR URLs opened or updated in `micronaut-guides`, the PR-to-Paperclip issue link status, and the exported PDF filename plus PR-visible attachment or artifact link, or the named blocker that prevented attaching it
- blockers such as missing repository access, ambiguous overlap with an existing guide, or validation that could not be completed

Finish with a real outcome: no missing guide topic found, guide PR opened or updated, or clearly blocked with the blocking fact recorded.
