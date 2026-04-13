---
name: micronaut-repo-operations
description: Shared operating rules for running a Micronaut repository cluster to inbox zero across issues, pull requests, release branches, and maintainer handoffs.
---

# Micronaut Repo Operations

Use this skill whenever you are acting on synced GitHub issues or pull requests for this company.

## Scope Discipline

- Work only inside the repositories listed in `references/repository-cluster.md`.
- Treat the repository cluster as a maintained boundary. If work spills into unrelated Micronaut repositories, escalate to the CEO before expanding scope.
- Do not assume all Micronaut repositories share the same branch strategy, release process, docs layout, or test commands. Read the local repo facts first.

## Inbox Zero Definition

Inbox zero does not mean "merge everything." It means every synced GitHub issue and PR is in one of these states:

- closed or merged
- waiting on explicit external clarification
- actively owned by a company role with a clear next action
- intentionally deferred with a recorded reason

No item should sit in the queue without an owner, state, and next action after the active triage cycle.

## Triage Rubric

Classify every issue or PR before deeper work starts:

- actionable
- needs clarification
- duplicate
- stale or superseded
- out of scope for this repository cluster
- blocked on upstream dependency, release timing, or external maintainer input

When requesting clarification, ask for the minimum missing information required to decide whether the company should act.

## Repository And Branch Awareness

- Confirm the correct target repository, branch, and release line before planning or coding.
- Prefer the oldest supported branch that legitimately needs the fix, or the branch specified by the repository's contributor guidance.
- If the same bug affects multiple supported lines, make the branching strategy explicit in the plan.
- Never mix unrelated repositories in one PR unless the Architect explicitly approves a coordinated cross-repo change.

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
