---
name: product-discovery
description: Run Product Manager discovery as either a coordinator routine that creates self-contained project subtasks or a project-specific subtask that performs deep review and may create one QA-assigned backlog product issue.
---

# Product Discovery

Use this skill whenever Product Manager is handling Weekly Product Discovery or a project-specific product-discovery child issue.

## Modes

First decide which mode you are in:

- Coordinator mode: the parent Weekly Product Discovery routine issue asks you to create or reuse project-specific product-discovery child issues or subtasks.
- Project subtask mode: a project-owned product-discovery child issue or subtask asks you to do the deep review for one repository.

The parent routine issue is coordination only. Do not perform deep repository review, market research, competitor research, candidate selection, or product development issue creation from the routine issue itself.

## Coordinator Mode

In the parent routine issue:

- Inspect active Paperclip projects and include only active Micronaut-related projects that map to managed GitHub repositories.
- Exclude internal company-operating projects such as `company-operations`.
- Exclude `micronaut-projects/micronaut-project-template`; it is a repository template and file sync source, not an actual Micronaut project.
- Before creating a child issue or subtask, search for an existing open or already-created product-discovery child issue or subtask for the same routine issue and project. Also search for orphan or top-level product-discovery issues for the same project from recent routine attempts. Reuse, update, or reparent the existing issue when possible; if it cannot be safely reparented, record a blocker instead of creating another duplicate.
- Create at most one product-discovery child issue or subtask per eligible project for a routine run.
- Put each child issue or subtask in the actual corresponding Paperclip project, set `parentId` to the routine issue when supported, and set assignee to Product Manager (`product-manager`).
- Give each child issue a stable title such as `Product discovery: <project name> (<YYYY-MM-DD>)` unless an existing project-specific product-discovery subtask already exists.
- The child issue description must be self-contained and complete. It must say to use the product-discovery skill and include the project repository, the discovery checklist, duplicate-check expectations, output sections, and the allowed outcomes. Do not rely on the child agent reading the parent routine description.
- Do not create top-level product development issues from the parent routine issue.

The routine report should list every eligible project, every skipped project and skip reason, every reused or created child issue URL, and blockers that prevented child issue creation.

## Project Subtask Mode

In a project-specific product-discovery child issue or subtask:

- Read the child issue body and use this `product-discovery` skill as the source of truth.
- Inspect the repository README, docs, examples, recent releases, current open issues, recently closed feature requests, and synced Paperclip project notes before researching outside the project.
- Research market, competitor frameworks, adjacent technologies, and developer workflows with live web search when useful.
- Summarize the repository's current capabilities before naming a gap.
- Identify candidate feature gaps that are concrete enough for engineering and valuable enough for maintainers to consider.
- Deduplicate candidates against open and closed GitHub issues in the same repository and against existing Paperclip product development issues in the project.
- Pick at most one high-value non-duplicative feature request for the project in a routine run.
- When justified, create one top-level Paperclip product development issue in the same Paperclip project with status `backlog`, no `parentId`, and assignee QA (`qa-engineer`).
- Include `Intended GitHub label: type: enhancement` in the product development issue body unless an equivalent Paperclip label can be applied safely.
- Do not publish issues to GitHub from Product Manager discovery.

The project subtask report must record the capability summary, research sources, candidate gaps, duplicate checks, selected feature or no-create decision, created product development issue URL when one exists, and blockers.

## Product Development Issue Body

When a project subtask creates a product development issue, include:

```md
## Problem

Describe the user-visible problem and the affected user persona.

## Market and competitor evidence

- Name the competitor framework, tool, platform, or ecosystem signal.
- Link or cite the source you used.
- Explain the specific capability or workflow users can already get elsewhere.

## Current Micronaut capability

Summarize what this repository already supports, including docs, APIs, configuration, or known issues inspected during discovery.

## Gap

Explain the missing capability and why it matters now.

## Proposed feature

Describe the expected behavior, configuration shape, API shape, documentation shape, or user workflow in enough detail for architecture and engineering to refine it.

## Implementation considerations

Name likely affected modules, docs, tests, compatibility boundaries, release-targeting implications, and security considerations.

## Acceptance criteria

- A user can complete the target workflow without custom glue code.
- The feature has tests or documented verification steps that cover the main success path and at least one failure or compatibility case.
- The user-facing docs explain how to enable, configure, and verify the feature.
- Existing behavior remains backward-compatible unless the issue explicitly asks for a breaking change.

## Prior art and duplicate check

List the GitHub searches, issues, pull requests, docs, releases, and existing Paperclip issues checked before opening this request.

Intended GitHub label: type: enhancement
```
