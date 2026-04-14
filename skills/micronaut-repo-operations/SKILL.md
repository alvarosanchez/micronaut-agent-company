---
name: micronaut-repo-operations
description: Shared operating rules for running a Micronaut repository cluster to inbox zero across issues, pull requests, release branches, and maintainer handoffs.
---

# Micronaut Repo Operations

Use this skill whenever you are acting on synced GitHub issues or pull requests for this company. The human-readable source of truth for this workflow is `references/issue-lifecycle.md`.

## Preconditions

- Work only inside the repositories configured in the GitHub sync plugin for this company.
- Use `references/repository-cluster.md` as supplemental operational context, not as the authoritative source of repository membership.
- Treat the repository cluster as a maintained boundary. If work spills into unrelated Micronaut repositories, escalate to the CEO before expanding scope.
- Do not assume all Micronaut repositories share the same branch strategy, release process, docs layout, or test commands. Read the local repo facts first.
- This company expects the GitHub sync plugin mapping to create new Paperclip issues in `BACKLOG` assigned to `qa-engineer`.
- The GitHub sync plugin creates the per-repository Paperclip projects. Synced GitHub issues and PRs are the normal work items; do not invent internal starter tasks for routine queue work.

## Canonical Lifecycle

1. The sync plugin creates new GitHub issues in Paperclip in `BACKLOG`, assigned to `qa-engineer`.
2. A human reviews the backlog and moves actionable issues to `TODO`.
3. `qa-engineer` deduplicates, labels, and routes the issue.
4. Implementation happens with either `micronaut-engineer` or `technical-writer`.
5. `qa-engineer` signs the work off or rejects it.
6. `security-engineer` performs the dedicated security review and either passes or rejects the work.
7. `code-reviewer` performs the structural review and creates the GitHub PR when the work is approved.
8. `micronaut-engineer` owns the PR cycle after PR creation.
9. The board or other Micronaut maintainers merge the PR or cut the release.
10. The sync plugin eventually reflects the GitHub outcome back into Paperclip as `DONE`.

Inbox zero does not mean "merge everything." It means every synced GitHub issue and PR is in one of these states:

- closed or merged
- waiting on explicit external clarification
- waiting on explicit board approval in Paperclip
- actively owned by a company role with a clear next action
- intentionally deferred with a recorded reason

No item should sit in the queue without an owner, state, and next action after the active triage cycle.

## Required GitHub Type Labels

Actionable issues and PRs should carry exactly one `type:` label:

- `type: breaking` for changes that require a new major line and explicit Architect approval
- `type: enhancement` for new features that belong on the next minor line
- `type: improvement` for small non-breaking product changes that fit a patch release
- `type: docs` for documentation-only changes
- `type: dependency-upgrade` for squad-originated version bumps that are not Dependabot work
- `type: bug` for bug fixes
- `type: question` for questions that need a board-approved answer proposal

Duplicate, stale, superseded, and out-of-scope issues may be closed without forcing a `type:` label if that closure path is immediate and well documented.

## Type Routing

- `type: bug`: QA reproduces first. Reproduced bugs go to `micronaut-engineer`. Unreproducible bugs require a board-approved closure proposal before QA comments on GitHub and closes them.
- `type: improvement`, `type: enhancement`, `type: breaking`, and `type: dependency-upgrade`: QA routes to `architect` for release-targeting and implementation planning.
- `type: docs`: QA routes directly to `technical-writer`.
- `type: question`: QA prepares an answer proposal for board approval, then publishes the approved answer on GitHub and closes or resolves the issue according to maintainer policy.

## Documentation Policy

- Documentation is part of the fix whenever public API, annotations, configuration properties, defaults, behavior, guides, or setup paths change.
- If migration pain is even slightly plausible, write the migration note while change context is still fresh.
- For code issues with documentation impact, keep the original non-docs `type:` label instead of relabeling the work as `type: docs`.
- Before editing docs in a Micronaut repository, identify where guides, reference docs, release notes, and upgrade notes live and how examples or snippets are validated there.

## Release Targeting And Branch Rules

- Confirm the correct target repository, branch, and release line before planning or coding.
- Determine the next release from the repository's default branch plus the latest non-pre-release GitHub release.
- If the default branch is `1.2.x` and the latest production release is `1.1.5`, the next release on that branch is `1.2.0`.
- If the default branch is `1.2.x` and the latest production release is `1.2.3`, the next release on that branch is `1.2.4`.
- `type: improvement`, `type: bug`, `type: docs`, and most `type: dependency-upgrade` work should remain non-breaking and target the next patch release when possible.
- `type: enhancement` belongs on the next minor line. If the minor branch does not exist yet, create it from the current default branch with local git CLI.
- `type: breaking` requires explicit Architect approval and, when necessary, a new major branch created from the current default branch with local git CLI.
- Prefer the smoothest migration path possible. Choose non-breaking behavior whenever a credible non-breaking option exists.

## Approval Boundaries

- Board approval always means a human comment in Paperclip.
- QA does not publish answer proposals or closure proposals on GitHub until that Paperclip comment exists.
- Only the board or other Micronaut maintainers merge PRs or cut releases.
- Agents may prepare, label, comment, close, and create PRs when their role allows it, but they do not merge or release.

## GitHub Sync Agent Tools

The sync plugin currently exposes this GitHub tool surface for agents:

- `search_repository_items`
- `get_issue`
- `list_issue_comments`
- `update_issue`
- `add_issue_comment`
- `create_pull_request`
- `get_pull_request`
- `update_pull_request`
- `list_pull_request_files`
- `get_pull_request_checks`
- `list_pull_request_review_threads`
- `reply_to_review_thread`
- `resolve_review_thread`
- `unresolve_review_thread`
- `request_pull_request_reviewers`

Use them by workflow stage:

- QA and CEO queue work: `search_repository_items`, `get_issue`, `list_issue_comments`, `update_issue`
- Planning and review context: `get_pull_request`, `list_pull_request_files`, `get_pull_request_checks`, `list_pull_request_review_threads`
- Security review context: `search_repository_items`, `get_issue`, `list_issue_comments`, `get_pull_request`, `list_pull_request_files`, `get_pull_request_checks`, `list_pull_request_review_threads`
- PR creation and routing: `create_pull_request`, `update_pull_request`, `request_pull_request_reviewers`
- Review-thread handling: `reply_to_review_thread`, `resolve_review_thread`, `unresolve_review_thread`

Important usage rules:

- Prefer `paperclipIssueId` whenever you are acting from a synced Paperclip issue so the plugin can infer the linked GitHub item and repository.
- Provide `repository` only when the plugin cannot infer it; the repository may be omitted when the current Paperclip project has exactly one mapped repository.
- Use `update_issue` for labels, assignees, state, body, title, and milestone changes.
- Use `update_pull_request` for PR title, body, base branch, open or close state, and draft vs ready-for-review changes.
- For `add_issue_comment` and `reply_to_review_thread`, send only the human-facing body and always set `llmModel: gpt-5.4`. The plugin appends the mandatory AI-authorship footer.

## Tool Boundaries

- Use the local git CLI for all git operations: branch creation, commits, rebases, cherry-picks, and pushes.
- Use the sync plugin agent tools for all GitHub operations: deduplication search, issue reads and updates, GitHub comments, PR creation and updates, changed-file inspection, CI inspection, review-thread work, and reviewer requests.
- Do not use `gh`, direct GitHub browser edits, or ad hoc scripts when the sync plugin tools cover the operation.

## PR Rules

- The implementation loop is always `Engineering or Writing -> QA -> Security Engineer -> Code Reviewer`.
- `code-reviewer` creates the GitHub PR only after QA and Security Engineer sign-off.
- Every PR must include a closing keyword such as `Fixes #123`.
- Every PR must carry exactly one `type:` label.
- After PR creation, `micronaut-engineer` keeps CI green, addresses Sonar Quality Gate issues, and resolves all review threads.
- Any material post-PR change re-enters the same `Engineering or Writing -> QA -> Security Engineer -> Code Reviewer` loop.

## Maintainer-Friendly Evidence

Every non-trivial handoff should include:

- linked issue or PR context
- current state and next action
- affected repositories and branches
- tests run or still required
- documentation impact
- security impact
- compatibility or migration risk

## Communication Style

- Keep explanations concise and respectful.
- Favor reversible decisions and small diffs.
- Close or decline work with reasons, not silence.
- Maintain a clean audit trail so a human Micronaut maintainer can understand the state of the queue quickly.
