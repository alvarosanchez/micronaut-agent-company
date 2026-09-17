# CEO self-improvement maintenance lanes

These bounded lanes remain separate from 30-day discovery. CEO records and routes findings; delivery owners change repositories and follow PRs.

## Runtime Skill Sync

Since Paperclip 2026.831 every run receives the company skill library as a deterministic manifest and the run output reports any skill that failed to materialize, so this lane no longer inventories skills by hand. Read the manifest and materialization notes of your own run and of the recent runs in the evidence window; only when a run reports a failed or missing materialization, or a package-declared grant is absent from an agent's configured skills (`/api/companies/{companyId}/agents`, `/api/companies/{companyId}/skills`), record source, target, present/missing/blocked, and verification. Catalog grants stay `missing` until the Skills Store entry is installed. The lane is a no-op only when both hold: no run reported a materialization failure and every package-declared grant is present in the agents' configured skills; a clean manifest alone does not prove the grants are configured. Skill sync and package reimport preserve operator selections unless an explicit replace merge mode is requested, so name the intended mode. If executable reconciliation is needed, create a scoped QA-assigned Micronaut Engineer child that receives an Architect lightweight plan before Engineer implements; CEO does not mutate runtime skill storage or adapter skill directories.

## Managed Repository AGENTS.md Audit

For every active managed Micronaut repository, classify root `AGENTS.md` as durable/current, stale/generated, or missing. Record no action or create a project-specific QA-assigned child. Mechanical/stale/missing text routes to Technical Writer. Workflow/authority semantics add Architect before Writer; authority/tool/security changes add Security. Writer owns target-branch update, branch, PR, linking, and follow-through. CEO does not edit or create/update/rediscover the PR.

## Routing Correction

CEO may align safe Paperclip-only state: status, assignee, execution participant/return owner, blocker/next action, and wake state. Do not mutate repository or PR state.

## PR Ownership Check

GitHub Sync routes actionable events to durable `followThroughOwner`: Engineer for source/test/dependency/build/package/plugin work and Writer for docs/`AGENTS.md`/instructions. Healthy green PRs without actionable feedback remain `in_review` parked on the human owner. Re-entry reruns effect-based gates documented in workflow control plane.

Use `company-package-evolution` for target-surface selection, child scope, ownership, branch, PR-linking, and report details.
