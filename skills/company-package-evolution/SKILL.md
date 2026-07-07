---
name: company-package-evolution
description: Decide when CEO self-improvement should stay in additive runtime guidance versus becoming a PR against the Micronaut Agent Company source repository.
---

# Company Package Evolution

Use this skill whenever the company learns something about its own operating system instead of a managed Micronaut repository.

CEO classifies, governs, prioritizes, and creates/assigns scoped QA intake children with evidence and acceptance criteria, then stops. Technical Writer owns prose docs, guides, repository `AGENTS.md`, company role instructions, and textual control-plane delivery. Executable package scripts/tests/config behavior and plugin/adapter code route to Engineer. Architect plans workflow/authority semantics. Security pre-triages security-sensitive work and performs final review. The implementation owner owns branch, commits, PR creation/update, CI repair, review replies, and PR follow-through; CEO owns none of those actions. For out-of-pipeline delivery, before opening the PR create one Paperclip child issue per affected project, place each child issue in the actual corresponding Paperclip project, assign it to the actual implementation owner, and ensure that child links any resulting PR. When a Paperclip child issue owns a PR, leave it `in_review` and do not close or mark it `DONE` until merge.

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

- create a QA-assigned child scoped to `alvarosanchez/micronaut-agent-company` and record the delivery owner
- Technical Writer delivers textual package instructions; Micronaut Engineer delivers executable package scripts/tests/config behavior; QA adds Architect and/or Security from the intake classification
- the delivery owner works only in a clone of `alvarosanchez/micronaut-agent-company`
- once the target branch is identified, the delivery owner fetches and updates the work branch from the target branch before editing or PR work; conflicts become a named blocker
- make the smallest portable diff across package-owned files such as `COMPANY.md`, `README.md`, `.paperclip.yaml`, `agents/`, `skills/`, `projects/`, `tasks/`, or `teams/`
- keep runtime-only learnings out of the diff; those still belong in additive extension instructions or `.company-runtime/`
- keep skills compatible with the Agent Skills model and prefer portable shortname references instead of machine-local skill wiring
- update both behavioral instructions and human-facing docs when policy changes
- run `npm test` or `npm run test:node22` when supported
- the delivery owner creates/updates the PR and owns follow-through until healthy maintainer wait
- when the change needs non-governance confirmation, use a Paperclip `request_confirmation`; keep linked approvals for governance-sensitive action
- before an out-of-pipeline PR, create one Paperclip child per affected project when that project exists, place it in the actual project, assign the implementation owner, and link the PR through GitHub Sync
- leave merge and release decisions to humans

## Managed Repository AGENTS.md PR Path

When the change belongs in a managed Micronaut repository's `AGENTS.md`:

- Technical Writer works in a clone of that managed repository and makes the smallest repo-local guidance change
- mechanical/stale/missing text uses QA -> Writer -> QA -> Reviewer; workflow/authority semantics add Architect before Writer; authority/tool/security changes also add Security
- Technical Writer creates/updates the PR and owns follow-through until healthy maintainer wait
- keep package-core files unchanged unless future imports also need a reusable default
- unavailable access or required governance approval becomes a linked approval or named blocker
- before an out-of-pipeline PR, create a child in the actual project, assign Technical Writer, and link the PR through GitHub Sync

The monthly CEO self-improvement report must include a `Managed Repository AGENTS.md Audit` section. For each active managed Micronaut repository considered, record whether root `AGENTS.md` exists, whether it is durable/current or stale/generated/missing, and the exact outcome: no action needed, repo-local PR opened or updated, linked follow-up issue created, linked approval requested, or blocker named. A bounded metadata/readability check is enough unless recent execution evidence points to a deeper repository-specific guidance problem.

When the change belongs in a company-owned upstream dependency:

- Micronaut Engineer works in a clone of the upstream repository and makes the smallest root-cause fix
- update this package only when future imports also need durable instruction/routing changes
- run the relevant upstream tests
- Engineer creates/updates the upstream PR and owns follow-through
- before an out-of-pipeline PR, create a child in the actual project, assign Engineer, and link the PR through GitHub Sync

For all package-core, managed repository, upstream dependency, or other PRs created outside the normal synced GitHub issue delivery pipeline, create the Paperclip child first. If one routine can affect more than one project, create one child per affected project; each child belongs to the actual corresponding project and is assigned to the implementation owner. Synced GitHub issues are already linked. Use `paperclip-github-plugin:link_github_item` with `kind: "pull_request"`, `paperclipIssueId`, and `pullRequestUrl` or `reference`. PR children remain `in_review` until merge; healthy maintainer wait is unassigned. If durable linking is unavailable, record the blocker.

## PR Follow-Through Contract

The implementation owner owns follow-through: Engineer for code/build/dependency/plugin work and Writer for docs/AGENTS/instructions. No repository change returns to that owner only for a required response, then healthy maintainer wait. Routine source/test/dependency/build changes rerun Engineer -> QA -> Reviewer, and routine prose or executable docs rerun Writer -> QA -> Reviewer. Defined Security triggers add pre-triage before the owner and final Security review after QA. Design-changing requests add Architect before the owner and gates. A clean rebase with green CI returns to maintainer wait; conflicts or semantic changes rerun applicable gates. Escalate unresolved behavior, compatibility, or security. GitHub Sync should persist a company-validated `followThroughAssigneeAgentId`; this package documents but does not implement that plugin contract.

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
- the implementation owner's CI/check and unresolved review-thread status for any PR
- whether `.company-runtime/` is relevant here; when you mention it, explain plainly that it is an optional local sidecar folder outside the published package

When you send a managed Micronaut repository `AGENTS.md` PR, explain:

- why the guidance belongs to that managed repository instead of this company package
- which PR carries the repo-local `AGENTS.md` change
- which Paperclip child issue or subtask scopes the out-of-pipeline PR, and whether the PR is linked to that Paperclip issue
- what verification or readability check you ran
- the Technical Writer-owned PR's CI/check and unresolved review-thread status
- whether any companion package-core change is still needed for future imports

When the monthly routine only opens or routes follow-up work for managed repository `AGENTS.md` guidance, still include the audit section in the package report so the next pass can rediscover the repository, status, and follow-up issue or PR.

When you send an upstream dependency fix from the CEO routine, explain:

- why the root cause belongs in that upstream project instead of this package
- whether the package still needed any companion guidance change
- which Paperclip child issue or subtask scopes the out-of-pipeline PR, and whether the PR is linked to that Paperclip issue
- what verification you ran in the upstream repository
- the Micronaut Engineer-owned PR's CI/check and unresolved review-thread status
