---
name: micronaut-repo-operations
description: Shared operating rules for running a Micronaut repository cluster to inbox zero across issues, pull requests, release branches, and maintainer handoffs.
---

# Micronaut Repo Operations

Use this skill whenever you are acting on synced GitHub issues or pull requests for this company. The human-readable source of truth for this workflow is `references/issue-lifecycle.md`.

## Preconditions

- Work only inside the repositories listed in `references/repository-cluster.md`.
- Treat the repository cluster as a maintained boundary. If work spills into unrelated Micronaut repositories, escalate to the CEO before expanding scope.
- Do not assume all Micronaut repositories share the same branch strategy, release process, docs layout, or test commands. Read the local repo facts first.
- This company expects the GitHub sync plugin mapping to create new Paperclip issues in `BACKLOG` assigned to `qa-engineer`.

## Canonical Lifecycle

1. The sync plugin creates new GitHub issues in Paperclip in `BACKLOG`, assigned to `qa-engineer`.
2. A human reviews the backlog and moves actionable issues to `TODO`.
3. `qa-engineer` deduplicates, labels, and routes the issue.
4. Implementation happens with either `micronaut-engineer` or `technical-writer`.
5. `qa-engineer` signs the work off or rejects it.
6. `core-reviewer` performs the structural review and creates the GitHub PR when the work is approved.
7. `micronaut-engineer` owns the PR cycle after PR creation.
8. The board or other Micronaut maintainers merge the PR or cut the release.
9. The sync plugin eventually reflects the GitHub outcome back into Paperclip as `DONE`.

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

## Tool Boundaries

- Use the local git CLI for all git operations: branch creation, commits, rebases, cherry-picks, and pushes.
- Use the sync plugin agent tools for all GitHub operations: deduplication search, release lookup, labels, comments, issue closure, PR creation, review-thread work, and PR metadata updates.
- Do not use `gh`, direct GitHub browser edits, or ad hoc scripts when the sync plugin tools cover the operation.

## PR Rules

- The implementation loop is always `Engineering or Writing -> QA -> Core Reviewer`.
- `core-reviewer` creates the GitHub PR only after QA sign-off.
- Every PR must include a closing keyword such as `Fixes #123`.
- Every PR must carry exactly one `type:` label.
- After PR creation, `micronaut-engineer` keeps CI green, addresses Sonar Quality Gate issues, and resolves all review threads.
- Any material post-PR change re-enters the same `Engineering or Writing -> QA -> Core Reviewer` loop.

## Maintainer-Friendly Evidence

Every non-trivial handoff should include:

- linked issue or PR context
- current state and next action
- affected repositories and branches
- tests run or still required
- documentation impact
- compatibility or migration risk

## Communication Style

- Keep explanations concise and respectful.
- Favor reversible decisions and small diffs.
- Close or decline work with reasons, not silence.
- Maintain a clean audit trail so a human Micronaut maintainer can understand the state of the queue quickly.
