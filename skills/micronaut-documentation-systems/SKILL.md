---
name: micronaut-documentation-systems
description: Documentation standards for Micronaut repositories, including Asciidoctor-based docs, guides, upgrade notes, READMEs, and example-driven validation.
---

# Micronaut Documentation Systems

Use this skill whenever work changes the user-visible behavior of a Micronaut repository or exposes a documentation gap.

## Docs Are Part Of The Fix

- If a public API, annotation, configuration property, default, behavior, guide, or setup path changes, evaluate documentation impact immediately.
- If migration pain is even slightly plausible, write the migration note while the change context is fresh.
- `type: docs` issues are documentation-only issues routed directly from QA to Technical Writer.
- When docs changes are attached to a non-docs issue, keep the original issue type label instead of relabeling the work as `type: docs`.

## Learn The Local Docs Layout First

Across Micronaut repositories, documentation may live in different places and use different conventions. Before editing, identify:

- where the user guide or reference docs live
- whether the repo uses Asciidoctor, generated config reference material, or guide-style content
- how snippets and examples are sourced or validated
- where release notes, changelog entries, and upgrade notes belong

## Quality Bar

- Prefer runnable or verifiable examples over pseudo-code.
- Keep docs version-aware and branch-aware.
- Explain both the "what changed" and the "how do I use it now."
- Keep terminology consistent with existing Micronaut docs in the same repository cluster.
- Do not leave screenshots, command output, or code snippets unverified when the repo offers a way to validate them.
- Docs-only implementations still follow `Writing -> QA -> Core Reviewer` before a PR exists.

## Cross-Repo Consistency

When a change spans multiple Micronaut repositories:

- align terminology and configuration names
- cross-link related guides where appropriate
- make sure user-facing behavior is explained in the repository where users will actually look first
