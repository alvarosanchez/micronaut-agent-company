---
name: company-package-evolution
description: Decide when CEO self-improvement should stay in additive runtime guidance versus becoming a PR against the Micronaut Agent Company source repository.
---

# Company Package Evolution

Use this skill whenever the company learns something about its own operating system instead of a managed Micronaut repository.

## Choose The Right Surface

Pick the smallest surface that solves the problem:

- If the learning is local to one Paperclip company instance, one maintainer group, or one temporary operating condition, keep it additive in extension instructions or `.company-runtime/` overlays.
- If the learning belongs to a managed Micronaut repository as a product artifact, update that repository's `AGENTS.md` guidance through a branch and PR in the managed Micronaut repository, and keep this company package unchanged.
- If the root cause clearly lives in a company-owned upstream dependency, such as `alvarosanchez/paperclip-github-plugin`, fix that upstream project directly instead of layering more package prose on top of it.
- If the gap is about how to use a bundled Paperclip system skill such as `paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, or `para-memory-files`, do not propose editing that bundled skill from this package. Add company-owned guidance, examples, or a companion skill here instead.
- If the gap is best solved by a reusable external skill or a live company-skill installation, prefer the company skill library and agent skill assignment model over copying ad hoc instructions into package core.
- If the learning should improve the default behavior of future imports of this company, promote it into the package core with a PR to `https://github.com/alvarosanchez/micronaut-agent-company`.

Portable package defaults should help most future imports, not just the current local runtime, and root-cause fixes should land in the owning upstream when that owner is outside the package repo.

## Package-Core PR Path

When the change belongs in the package core:

- work only in a clone of `alvarosanchez/micronaut-agent-company`
- once the target branch is identified, fetch and update the work branch from the target branch before starting work, editing, committing, opening, creating, or updating the PR; if that target branch rebase or merge produces conflicts, record the conflict as a blocker and do not open, create, or update a conflicting PR
- make the smallest portable diff across package-owned files such as `COMPANY.md`, `README.md`, `.paperclip.yaml`, `agents/`, `skills/`, `projects/`, `tasks/`, or `teams/`
- keep runtime-only learnings out of the diff; those still belong in additive extension instructions or `.company-runtime/`
- keep skills compatible with the Agent Skills model and prefer portable shortname references instead of machine-local skill wiring
- update both the behavioral instructions and the human-facing docs when policy changes
- run `npm test` or `npm run test:node22` when the environment supports it
- create or update a PR to `https://github.com/alvarosanchez/micronaut-agent-company`
- treat CEO-opened PRs as still active after creation until CI is green, reported checks are passing, and no unresolved review threads remain
- if the required linked board approval already exists and is approved, implement the change in the same run instead of stopping at a proposal
- when the package change only needs non-governance confirmation, use a Paperclip `request_confirmation` issue-thread interaction against the current proposal or plan instead of a linked board approval; keep linked approvals for decisions that authorize governance-sensitive action
- before opening a package-core PR outside the normal delivery pipeline, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip, put the subtask in the actual corresponding project, set assignee to CEO, decide inside the subtask whether the package change needs a PR, then link the PR to that Paperclip issue through GitHub Sync
- leave merge and release decisions to humans

## Managed Repository AGENTS.md PR Path

When the change belongs in a managed Micronaut repository's `AGENTS.md`:

- work in a clone of that managed Micronaut repository, not this company package
- make the smallest repo-local guidance change, using linked topic files when the root `AGENTS.md` would otherwise grow too large
- open or update a PR in that managed repository for the `AGENTS.md` change
- keep the CEO-opened PR active until CI is green, reported checks are passing, and no unresolved review threads remain
- keep package-core files unchanged unless future imports also need a reusable default change
- if repository access or required governance approval is unavailable, create the linked board approval request or record the blocker instead of editing silently
- before opening a managed Micronaut repository `AGENTS.md` PR outside the normal delivery pipeline, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip, put the subtask in the actual corresponding project, set assignee to CEO, decide inside the subtask whether the repo-local guidance change needs a PR, then link the PR to that Paperclip issue through GitHub Sync

The monthly CEO self-improvement report must include a `Managed Repository AGENTS.md Audit` section. For each active managed Micronaut repository considered, record whether root `AGENTS.md` exists, whether it is durable/current or stale/generated/missing, and the exact outcome: no action needed, repo-local PR opened or updated, linked follow-up issue created, linked approval requested, or blocker named. A bounded metadata/readability check is enough unless recent execution evidence points to a deeper repository-specific guidance problem.

When the change belongs in a company-owned upstream dependency:

- work in a clone of that upstream repository
- make the smallest root-cause fix there instead of encoding the workaround as package guidance
- update this package only when future imports also need a durable instruction or routing change in addition to the upstream fix
- run the relevant tests for that upstream repository when the environment supports it
- create or update the upstream PR in the same run when the required approval already exists
- keep CEO-opened PRs active until CI is green, reported checks are passing, and no unresolved review threads remain
- before opening an upstream dependency PR outside the normal delivery pipeline, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip, put the subtask in the actual corresponding project, set assignee to CEO, decide inside the subtask whether the upstream fix needs a PR, then link the PR to that Paperclip issue through GitHub Sync

For all package-core, managed repository, upstream dependency, or other PRs created outside the normal synced GitHub issue delivery pipeline, create the Paperclip child issue or subtask first. If one routine can affect more than one project, create multiple subtasks so each affected project has one state owner; each subtask must belong to the actual corresponding project and be assigned to the routine owner. Synced GitHub issues created by the sync plugin are already linked and do not need this extra subtask. Use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`. If a subtask creates or updates a PR, leave the child issue or subtask in `in_review` and do not close it or mark it `DONE` just because the PR was created. If the runtime cannot create the durable PR-to-Paperclip issue link through the GitHub Sync agent tool, record that tooling blocker in the subtask and routine report instead of presenting the PR as fully tracked.

## CEO PR Follow-Up Without Heartbeats

Because CEO heartbeats may be disabled, the monthly CEO self-improvement routine is the follow-up mechanism for PRs opened by the CEO. Each run should rediscover open CEO-opened PRs from the prior routine report, linked board approvals, recorded PR URLs, and open PR searches, then either update the PR, answer review threads with a decision before resolving them, or record the blocker. Do not treat a CEO-opened PR as finished until CI is green and no unresolved review threads remain.

## When The Repo Or PR Path Is Unavailable

If you do not have a working copy of the package repo or cannot send a PR from the current environment:

- do not mutate an imported company instance's core files in place
- create a linked board approval request for the exact next action when human authorization or repo access is what is missing
- create a Paperclip issue-thread interaction when the missing input is a bounded choice, suggested task selection, or non-governance confirmation rather than authorization
- record a maintainer-ready package proposal in the current Paperclip report only as support for that linked approval or clearly documented blocker
- use additive extension instructions or `.company-runtime/` overlays only for the local guidance that cannot wait for a published package update

## Reporting

When you propose or send a package-core change, explain:

- why the learning should become a default
- what future imports gain from the change
- what local-only guidance still stays additive
- what verification you ran
- any compatibility or migration risk
- the CI/check status and unresolved review-thread status for any CEO-opened PR
- whether `.company-runtime/` is relevant here; when you mention it, explain plainly that it is an optional local sidecar folder outside the published package

When you send a managed Micronaut repository `AGENTS.md` PR, explain:

- why the guidance belongs to that managed repository instead of this company package
- which PR carries the repo-local `AGENTS.md` change
- which Paperclip child issue or subtask scopes the out-of-pipeline PR, and whether the PR is linked to that Paperclip issue
- what verification or readability check you ran
- the CI/check status and unresolved review-thread status for the CEO-opened PR
- whether any companion package-core change is still needed for future imports

When the monthly routine only opens or routes follow-up work for managed repository `AGENTS.md` guidance, still include the audit section in the package report so the next pass can rediscover the repository, status, and follow-up issue or PR.

When you send an upstream dependency fix from the CEO routine, explain:

- why the root cause belongs in that upstream project instead of this package
- whether the package still needed any companion guidance change
- which Paperclip child issue or subtask scopes the out-of-pipeline PR, and whether the PR is linked to that Paperclip issue
- what verification you ran in the upstream repository
- the CI/check status and unresolved review-thread status for the CEO-opened PR
