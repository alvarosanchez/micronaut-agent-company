# CEO self-improvement maintenance lanes

The monthly CEO self-improvement routine uses this reference to run the following bounded lanes separately from 30-day improvement discovery. Their findings do not satisfy evidence thresholds and must not be presented as new ranked proposals.

## Hermes Runtime Skill Sync

Inspect Paperclip-managed company skills across all company agents, not only the CEO. Build the checked set from `/api/companies/{companyId}/agents` and `/api/agents/{agentId}/skills`, then include catalog-only skills from `${PAPERCLIP_HOME:-~/.paperclip}/instances/${PAPERCLIP_INSTANCE_ID:-default}/skills/${PAPERCLIP_COMPANY_ID}/__catalog__/`. This maps each Paperclip runtime skill into Hermes local skill storage when visibility is missing.

Prefer each skill's `__runtime__/` materialization. When there is no runtime materialization, fall back to `__catalog__/`. Copy or update `SKILL.md` and referenced `references/`, `templates/`, `scripts/`, and `assets/` into the dedicated Hermes `paperclip` profile, normally under `skills/micronaut/<skillName>/`. Preserve source metadata. Never overwrite an unrelated user-authored skill. Bundled Paperclip system skills are immutable no-ops. Verify visibility with `skills_list` and `skill_view` (or `hermes -p paperclip skills list/show`). Report source, target, copied/updated/no-op/blocked, and verification.

## Managed Repository AGENTS.md Audit

For every active managed Micronaut repository, perform a bounded metadata/readability check unless the ranked evidence cites a deeper problem. Record whether root `AGENTS.md` exists and whether it is durable/current, stale/generated, or missing. Record exactly one outcome: no action needed, repo-local PR opened or updated, linked follow-up issue created, linked approval requested, or named blocker.

Use `agent-md-refactor` when work is needed. Treat the guidance as a repository product change: create the project-specific Paperclip subtask first, update the work branch from its target branch, and use a managed-repository PR path. Link the resulting PR to the Paperclip issue. Do not edit the imported package as a substitute.

## CEO-opened PR follow-up

Rediscover open CEO-created PRs from the prior report, linked approvals, recorded URLs, and bounded open-PR searches. Follow each until reported CI/checks are green and no unresolved review thread remains. Reply with the decision before resolving a thread. Keep each out-of-pipeline PR's project subtask in `in_review`; PR creation alone is not completion.

Use `company-package-evolution` for target-surface selection, approval, branch, subtask, PR-linking, and report details rather than copying those mechanics into the routine prompt.
