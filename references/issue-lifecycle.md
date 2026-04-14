# GitHub Issue Lifecycle

This file is the canonical workflow for how this company handles synced GitHub issues and PRs.

The company also runs a small set of internal Paperclip routines under `company-operations`. Those routines create internal operating work items and do not replace or change the GitHub issue lifecycle described here.

## Preconditions

- The GitHub sync plugin is installed and configured for the company.
- New synced GitHub issues land in Paperclip in `BACKLOG`, assigned to `qa-engineer`.
- A human is available to move backlog items to `TODO`.
- The board or other Micronaut maintainers are available to leave Paperclip approval comments and to merge PRs or cut releases.
- The required GitHub `type:` labels exist in every repository in the cluster.

## Lifecycle

1. The sync plugin creates the GitHub issue in Paperclip in `BACKLOG`, assigned to `qa-engineer`.
2. A human reviews the issue and, if it should be worked, moves it to `TODO`.
3. QA performs a deduplication search, applies the correct GitHub `type:` label, and routes the issue:
   - bugs are reproduced before engineering starts
   - improvements, enhancements, breaking changes, and dependency upgrades go to Architect
   - docs issues go to Technical Writer
   - questions become board-approved answer proposals
4. Implementation happens with Micronaut Engineer or Technical Writer.
5. QA verifies the implementation against the plan or reproducer.
6. Security Engineer performs dedicated security review and either returns the work for remediation or hands it onward.
7. Code Reviewer performs structural review and creates the GitHub PR directly when the work is approved.
8. Micronaut Engineer owns the PR cycle after PR creation, including CI, Sonar Quality Gate, and review threads.
9. The board or other Micronaut maintainers merge the PR or cut the release.
10. The sync plugin reflects the GitHub outcome back into Paperclip and eventually marks the item `DONE`.

The implementation loop is always `Engineering or Writing -> QA -> Security Engineer -> Code Reviewer`.

## Type Labels

| Label | Meaning | Routing |
| --- | --- | --- |
| `type: breaking` | Breaking change that needs explicit Architect approval and a major line decision | Architect |
| `type: enhancement` | New feature that belongs on the next minor line | Architect |
| `type: improvement` | Small non-breaking product change that fits a patch release | Architect |
| `type: docs` | Documentation-only change | Technical Writer |
| `type: dependency-upgrade` | Squad-originated dependency bump, excluding Dependabot | Architect |
| `type: bug` | Reproducible bug fix | Micronaut Engineer |
| `type: question` | Question that requires a board-approved answer proposal | QA Engineer |

Actionable issues and PRs should carry exactly one `type:` label.

## Type-Specific Handling

### Bugs

- QA checks whether sufficient information exists to reproduce the bug.
- QA creates a reproducer test or verifies the reproducer provided by the reporter.
- If reproduced, QA assigns the issue to Micronaut Engineer.
- If not reproducible, QA prepares an internal closure proposal with a detailed explanation.
- Only after a human board comment appears in Paperclip may QA publish that explanation on GitHub and close the issue.

### Feature Requests

- QA distinguishes `type: improvement`, `type: enhancement`, and `type: breaking`.
- Architect then determines release targeting, branch strategy, compatibility expectations, and implementation plan.
- Breaking changes must be approved explicitly by Architect.

### Docs

- QA assigns `type: docs` issues directly to Technical Writer.
- Docs-only issues still go through QA, Security Engineer, and Code Reviewer before a PR is created.

### Questions

- QA prepares an answer proposal for human board approval.
- After the Paperclip approval comment exists, QA publishes the approved answer on GitHub and closes or resolves the issue according to maintainer direction.

## Release Targeting

- Determine the next release by combining the repository's default branch with the latest non-pre-release GitHub release.
- If the default branch is `1.2.x` and the latest production release is `1.1.5`, the next release on that line is `1.2.0`.
- If the default branch is `1.2.x` and the latest production release is `1.2.3`, the next release on that line is `1.2.4`.
- Improvements, bug fixes, docs changes, and most dependency upgrades should stay non-breaking and land on the next patch release when possible.
- Enhancements belong on the next minor line. If that branch does not exist yet, create it from the current default branch with local git CLI.
- Breaking changes belong on a new major line when needed. If the branch does not exist yet, create it from the current default branch with local git CLI.

## Governance And Tooling

- Board approval always means a human comment in Paperclip.
- Only the board or other Micronaut maintainers merge PRs or cut releases.
- Git operations must use the local git CLI.
- GitHub operations must use the GitHub agent tools provided by the sync plugin.
- QA should rely on `search_repository_items`, `get_issue`, `list_issue_comments`, `update_issue`, and `add_issue_comment` for deduplication, classification, closure proposals, and approved answers.
- Architect should use `get_issue`, `list_issue_comments`, `get_pull_request`, `list_pull_request_files`, `get_pull_request_checks`, and `list_pull_request_review_threads` when planning from issue and PR context.
- Security Engineer should use `search_repository_items`, `get_issue`, `list_issue_comments`, `get_pull_request`, `list_pull_request_files`, `get_pull_request_checks`, `list_pull_request_review_threads`, `reply_to_review_thread`, `resolve_review_thread`, and `unresolve_review_thread`.
- Code Reviewer should use `create_pull_request`, `update_pull_request`, `list_pull_request_files`, `get_pull_request_checks`, `list_pull_request_review_threads`, `reply_to_review_thread`, `resolve_review_thread`, `unresolve_review_thread`, and `request_pull_request_reviewers`.
- Micronaut Engineer should use `get_pull_request`, `update_pull_request`, `list_pull_request_files`, `get_pull_request_checks`, `list_pull_request_review_threads`, `reply_to_review_thread`, `resolve_review_thread`, and `unresolve_review_thread` during the PR cycle.
- Prefer `paperclipIssueId` whenever a synced Paperclip issue is available so the plugin can infer the linked GitHub issue or PR and repository.
- When posting a GitHub issue comment or review-thread reply, provide only the human-facing body and include `llmModel: gpt-5.4`; the plugin appends the required AI-authorship footer.
- Code Reviewer creates the PR directly after QA and Security Engineer sign-off.
- Every PR must use a closing keyword such as `Fixes #123`.
- Every PR must carry one of the `type:` labels listed above.
