---
name: company-package-evolution
description: Decide when CEO self-improvement should stay in additive runtime guidance versus becoming a PR against the Micronaut Agent Company source repository.
---

# Company Package Evolution

Use this skill whenever the company learns something about its own operating system instead of a managed Micronaut repository.

## Choose The Right Surface

Pick the smallest surface that solves the problem:

- If the learning is local to one Paperclip company instance, one maintainer group, or one temporary operating condition, keep it additive in extension instructions or `.company-runtime/` overlays.
- If the learning belongs to a managed Micronaut repository as a product artifact, update that repository's `AGENTS.md` guidance and keep this company package unchanged.
- If the gap is about how to use a bundled Paperclip system skill such as `paperclip`, `paperclip-create-agent`, `paperclip-create-plugin`, or `para-memory-files`, do not propose editing that bundled skill from this package. Add company-owned guidance, examples, or a companion skill here instead.
- If the gap is best solved by a reusable external skill or a live company-skill installation, prefer the company skill library and agent skill assignment model over copying ad hoc instructions into package core.
- If the learning should improve the default behavior of future imports of this company, promote it into the package core with a PR to `https://github.com/alvarosanchez/micronaut-agent-company`.

Portable package defaults should help most future imports, not just the current local runtime.

## Package-Core PR Path

When the change belongs in the package core:

- work only in a clone of `alvarosanchez/micronaut-agent-company`
- make the smallest portable diff across package-owned files such as `COMPANY.md`, `README.md`, `.paperclip.yaml`, `agents/`, `skills/`, `projects/`, `tasks/`, or `teams/`
- keep runtime-only learnings out of the diff; those still belong in additive extension instructions or `.company-runtime/`
- keep skills compatible with the Agent Skills model and prefer portable shortname references instead of machine-local skill wiring
- update both the behavioral instructions and the human-facing docs when policy changes
- run `npm test` or `npm run test:node22` when the environment supports it
- create or update a PR to `https://github.com/alvarosanchez/micronaut-agent-company`
- if the required linked board approval already exists and is approved, implement the change in the same run instead of stopping at a proposal
- leave merge and release decisions to humans

## When The Repo Or PR Path Is Unavailable

If you do not have a working copy of the package repo or cannot send a PR from the current environment:

- do not mutate an imported company instance's core files in place
- create a linked board approval request for the exact next action when human authorization or repo access is what is missing
- record a maintainer-ready package proposal in the current Paperclip report only as support for that linked approval or clearly documented blocker
- use additive extension instructions or `.company-runtime/` overlays only for the local guidance that cannot wait for a published package update

## Reporting

When you propose or send a package-core change, explain:

- why the learning should become a default
- what future imports gain from the change
- what local-only guidance still stays additive
- what verification you ran
- any compatibility or migration risk
- whether `.company-runtime/` is relevant here; when you mention it, explain plainly that it is an optional local sidecar folder outside the published package
