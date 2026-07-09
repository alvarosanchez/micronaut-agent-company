# CEO self-improvement maintenance lanes

These bounded lanes remain separate from 30-day discovery. CEO records and routes findings; delivery owners change repositories and follow PRs.

## Hermes Runtime Skill Sync

Inspect Paperclip-managed skills for all company agents using `/api/companies/{companyId}/agents`, `/api/agents/{agentId}/skills`, runtime storage, and `__catalog__/`. Verify visibility with `skills_list`/`skill_view`. Report source, target, present/missing/blocked, and verification. If executable reconciliation is needed, create a scoped QA-assigned Micronaut Engineer child; CEO does not mutate Hermes skill storage.

## Managed Repository AGENTS.md Audit

For every active managed Micronaut repository, classify root `AGENTS.md` as durable/current, stale/generated, or missing. Record no action or create a project-specific QA-assigned child. Mechanical/stale/missing text routes to Technical Writer. Workflow/authority semantics add Architect before Writer; authority/tool/security changes add Security. Writer owns target-branch update, branch, PR, linking, and follow-through. CEO does not edit or create/update/rediscover the PR.

## Routing Correction

CEO may align safe Paperclip-only state: status, assignee, execution participant/return owner, blocker/next action, and wake state. Do not mutate repository or PR state.

## PR Ownership Check

GitHub Sync routes actionable events to durable `followThroughOwner`: Engineer for source/test/dependency/build/package/plugin work and Writer for docs/`AGENTS.md`/instructions. Healthy green PRs without actionable feedback remain unassigned `in_review`. Re-entry reruns effect-based gates documented in workflow control plane.

Use `company-package-evolution` for target-surface selection, child scope, ownership, branch, PR-linking, and report details.
