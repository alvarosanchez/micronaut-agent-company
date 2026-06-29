# Repository Instructions

This repository is an importable Paperclip Agent Company package for Micronaut maintenance. Treat it as source-package defaults for future imports/syncs, not as a live Paperclip instance.

## What this repo owns

Package-owned, portable defaults live in:

- `COMPANY.md` — Agent Company manifest and top-level operating model.
- `.paperclip.yaml` — Paperclip import/export extension defaults: agents, adapter config, runtime defaults, routines, settings, catalog-skill grants, and import behavior.
- `agents/` — package agent instruction files and frontmatter.
- `skills/` — company-local portable skills and references.
- `projects/`, `tasks/`, and `teams/` — package project, routine, and team defaults.
- `README.md` — public package/operator documentation.
- `scripts/` — verification and local setup helpers.

Keep changes portable across Paperclip installations. Machine-local paths, tokens, live service names, one-off checkout paths, and production-only operational facts generally do not belong in this package unless they are documented as deployment-provided interfaces.

## Live deployment vs package source

Do not repair a live Paperclip company by only editing DB rows, generated imported files, or live profile drift when the durable owner is this package. If a runtime behavior should survive Agent Companies reimport/sync, update the package source and tests here.

Deployment-specific wiring belongs outside the portable package. For example, `.paperclip.yaml` may point agents at a stable command such as `/usr/local/bin/hermes-paperclip`, while the deployment provides that wrapper and sets environment such as `HERMES_HOME` or `HERMES_CODEX_BASE_URL`.

Before adding adapter config fields, verify that Paperclip import and export round-trip them. If a field is stripped during export, do not rely on it for durable sync behavior.

## Version and release handling

Do not manually bump package or company versions in normal pull requests. In particular, do not edit `COMPANY.md`, `package.json`, or `package-lock.json` just to advance the release version. Version updates are handled automatically by the release workflow after PRs merge to `main`.

Only change release-version fields when a human explicitly asks for a release-policy change, such as changing the next automatic major/minor target.

## Editing guidelines

- Make the smallest package-owned diff that fixes the durable behavior.
- Keep source defaults reimport-safe: imported company instances may have local overlays or live runtime settings that are intentionally outside this repo.
- Prefer updating tests when changing instructions, adapter config, routines, skills, roles, icons, catalog grants, runtime defaults, or release behavior.
- Keep catalog skill grants as keys/references; do not vendor upstream Paperclip Skills Store bodies into this repo.
- Do not store secrets, live tokens, private local paths, or machine-specific credentials.
- Do not use this repo as a place to store benchmark artifacts, generated reports, or temporary evaluation outputs unless a human explicitly asks for a tracked artifact.

## Validation commands

For normal changes, run:

```bash
npm run test:unit
node scripts/verify-paperclip-import.mjs
git diff --check
```

For Node 22 compatibility or before release-sensitive changes, run:

```bash
npm run test:node22
```

`node scripts/verify-paperclip-import.mjs` boots an isolated Paperclip instance, imports the package through the Paperclip API, checks created entities, exports the company, and verifies round-trip behavior. Use it for any change that affects `.paperclip.yaml`, agent metadata, routines, skills, projects, teams, or import/export assumptions.

## Git and PR hygiene

- Work on a topic branch based on current `origin/main`.
- Inspect `git status --short` and `git diff --stat` before committing.
- Do not include unrelated local changes.
- If a PR receives Copilot or human review threads, address valid feedback with a commit, reply on the thread with the decision, and resolve the thread only after verifying the fix.
- After force-pushing, re-check CI and review threads before reporting completion.

## Runtime defaults to preserve

The package currently uses Paperclip `hermes_local` agents that invoke the deployment Hermes CLI wrapper `/usr/local/bin/hermes-paperclip`. Keep README, `.paperclip.yaml`, and tests in sync when changing this contract.

The package intentionally caps package-owned agent heartbeat concurrency at one active run per agent via `.paperclip.yaml` while the workflow is tuned for one owned work item per role. Do not raise this casually.

Normal delivery issues use standard work mode. Do not set `workMode: planning` for the regular Architect planning stage; planning mode is only for explicit planning-only precursor issues.
