---
name: company-package-evolution
description: Decide when CEO self-improvement should stay in additive runtime guidance versus becoming a PR against the Micronaut Agent Company source repository.
---

> [!IMPORTANT]
> This file belongs to the company package. Do not override it in imported company instances. Modify the source-of-truth repo instead, then reimport.

# Company Package Evolution

Use this skill whenever the company learns something about its own operating system instead of a managed Micronaut repository.

## Choose The Right Surface

Pick the smallest surface that solves the problem:

- If the learning is local to one Paperclip company instance, one maintainer group, or one temporary operating condition, keep it additive in extension instructions or `.company-runtime/` overlays.
- If the learning belongs to a managed Micronaut repository as a product artifact, update that repository's `AGENTS.md` guidance and keep this company package unchanged.
- If the learning should improve the default behavior of future imports of this company, promote it into the package core with a PR to `https://github.com/alvarosanchez/micronaut-agent-company`.

Portable package defaults should help most future imports, not just the current local runtime.

## Package-Core PR Path

When the change belongs in the package core:

- work only in a clone of `alvarosanchez/micronaut-agent-company`
- make the smallest portable diff across package-owned files such as `COMPANY.md`, `README.md`, `.paperclip.yaml`, `agents/`, `skills/`, `projects/`, `tasks/`, `teams/`, or `references/`
- keep runtime-only learnings out of the diff; those still belong in additive extension instructions or `.company-runtime/`
- update both the behavioral instructions and the human-facing docs when policy changes
- run `npm test` or `npm run test:node22` when the environment supports it
- create or update a PR to `https://github.com/alvarosanchez/micronaut-agent-company`
- leave merge and release decisions to humans

## When The Repo Or PR Path Is Unavailable

If you do not have a working copy of the package repo or cannot send a PR from the current environment:

- do not mutate an imported company instance's core files in place
- record a maintainer-ready package proposal in the current Paperclip report
- use additive extension instructions or `.company-runtime/` overlays only for the local guidance that cannot wait for a published package update

## Reporting

When you propose or send a package-core change, explain:

- why the learning should become a default
- what future imports gain from the change
- what local-only guidance still stays additive
- what verification you ran
- any compatibility or migration risk
