---
name: github-pr-workflow
description: "Prepare a GitHub pull request from a feature branch — branch hygiene, commit shape, title/body, verification notes, screenshots for UI work, and replies to review comments."
key: paperclipai/bundled/software-development/github-pr-workflow
recommendedForRoles:
  - engineer
tags:
  - github
  - pull-requests
  - code-review
  - release
metadata:
  paperclip:
    catalog:
      skillKey: paperclipai/bundled/software-development/github-pr-workflow
      catalogId: "paperclipai:bundled:software-development:github-pr-workflow"
      catalogKey: paperclipai/bundled/software-development/github-pr-workflow
      catalogKind: bundled
      catalogCategory: software-development
      catalogPath: catalog/bundled/software-development/github-pr-workflow
      packageName: "@paperclipai/skills-catalog"
      packageVersion: 0.3.1
      originVersion: 0.3.1
      originHash: "sha256:90f278c89aa0711be150c1cd2456ca25620d02f36995b113ca9837d756a37f6c"
      sourceRef: "sha256:90f278c89aa0711be150c1cd2456ca25620d02f36995b113ca9837d756a37f6c"
---

## Micronaut Agent Company usage notes

Use this catalog skill for PR hygiene, branch freshness, PR body evidence, reviewer communication, and follow-through. It complements `gh-cli` and the GitHub Sync plugin tool rules in `micronaut-repo-operations`.

For this company:

- In the normal delivery pipeline, Code Reviewer creates the PR only after QA and Security Engineer approval. Micronaut Engineer and Technical Writer own implementation and PR follow-through, but do not bypass the final Code Reviewer gate.
- Out-of-pipeline PRs from CEO routines, package evolution, docs routines, or upstream dependency fixes must first be scoped in a Paperclip child issue or subtask and linked back to the resulting PR.
- Before creating or updating a PR, update the branch from the approved target branch; if conflicts appear, record a blocker instead of opening or updating a conflicting PR.
- Reply to review threads with the concrete decision before resolving them, and keep CI, selected organization-project links, labels, closing keywords, and GitHub Sync links correct.

# GitHub Pull Request Workflow

Ship a PR a reviewer can land without follow-up clarifying questions. The aim is high signal in the title and body, evidence the change works, and clean replies when feedback comes in.

## When to use

- You are about to open a PR for a change that is functionally complete.
- A reviewer left comments and you need to respond and push fixes.
- A PR has been open more than a day and needs to be brought back into shape (stale conflicts, missing description, missing verification).

## When not to use

- The change is not yet functionally complete. Finish the work first; draft PRs that bounce on review are noise.
- The repository uses a non-GitHub forge. Adjust to that forge's conventions; do not force GitHub-isms.

## Branch hygiene before opening

- Rebase or merge from the target base so the diff is current.
- Squash WIP commits into reviewable units. Prefer one commit per logical change; do not force one-commit-per-PR if the work is genuinely multi-step.
- Confirm tests, typecheck, and lint pass locally. Note any deliberate skips in the PR body.
- Remove debug prints, commented-out code, and `TODO` markers that are not tracked.

## PR title

- Imperative mood, under 70 characters.
- Lead with the user-visible change, not the file touched. `Allow CSV export from reports table` beats `Update reports.tsx`.
- If the repo uses an issue prefix convention (`PAP-1234:`, `[security]`), follow it.
- No trailing period.

## PR body

Use this structure:

```md
## Summary
- 1–3 bullets describing what changed and why.

## Implementation notes
- Anything non-obvious in the diff: trade-offs, dropped alternatives, gotchas.
- Migration or config implications.

## Verification
- The exact commands or steps you ran.
- Screenshots or short clips for UI changes (required if pixels moved).
- Edge cases you exercised by hand.

## Risk and rollback
- What breaks if this is reverted, and how to revert cleanly.
```

Skip the `Risk and rollback` section only for clearly trivial PRs (typos, docs).

## Verification evidence

- Tests passing in CI is necessary, not sufficient. Reviewers also need to know the change behaves correctly end to end.
- For UI work, include screenshots of the golden path and one edge case. Tag dark and light mode if the project supports both.
- For migrations, include a dry-run plan and reversal steps.
- For performance changes, include a before/after measurement, not adjectives.

## Replying to review comments

- Reply on every comment, even with just "fixed in <commit-sha>" — silent fixes leave the reviewer guessing.
- Push fixes as new commits while review is active; do not amend during review unless the reviewer agrees.
- If you disagree with feedback, say so with one sentence of rationale and let the reviewer decide. Don't escalate over comments.
- Re-request review explicitly after pushing changes.

## Merge checklist

- All required checks green.
- All review comments resolved.
- PR title/body still accurate (update if scope changed mid-review).
- Linked issue moves to `in_review` or `done` per project convention.
- Delete the branch after merge unless it is a long-lived integration branch.

## Anti-patterns

- PR description that says "see commits". Reviewers should not need to read the log.
- Mixing refactor and behavior change in the same PR with no separation in the body.
- "Address feedback" commits that bundle unrelated edits. One commit per round of feedback is fine; one commit for everything in flight is not.
- Force-pushing during active review without telling the reviewer.
