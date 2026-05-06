# Technical Writer Routines And Night Scheduling Design

Date: 2026-05-06
Status: Approved for implementation

## Goal

Extend the Product Manager PR with two proactive weekly Technical Writer routines, move the Product Manager routine from daily to weekly, and schedule every company routine at night in `Europe/Madrid` so humans can review outcomes during work hours.

The change also adds guidance that documentation commits and PRs may use GitHub CI-skip keywords when the changed documentation is not exercised by the build.

## Context

The company package currently includes:

- `Weekly Security Deep Scan`, assigned to Security Engineer
- `Daily Product Discovery`, assigned to Product Manager
- `Daily CEO Self-Improvement`, assigned to CEO
- `Training`, assigned to CEO every other day

The package also has one Technical Writer agent that handles normal `type: docs` delivery work. The new routines are not replacements for normal synced GitHub issue work. They are proactive maintenance routines that inspect managed Micronaut-related projects and open repository PRs when there is a concrete documentation improvement.

## Night Schedule

All recurring routines should run at night in `Europe/Madrid`, avoiding same-agent concurrency:

| Routine | Assignee | Schedule |
| --- | --- | --- |
| `Weekly Product Discovery` | Product Manager | Mondays at 01:00 |
| `Weekly Security Deep Scan` | Security Engineer | Tuesdays at 01:00 |
| `Weekly User Guide Review` | Technical Writer | Wednesdays at 01:00 |
| `Weekly Guide Topic Discovery` | Technical Writer | Thursdays at 01:00 |
| `Training` | CEO | Every other day at 02:00 |
| `Daily CEO Self-Improvement` | CEO | Every day at 03:00 |

The CEO routines are intentionally separated by one hour. The two Technical Writer routines run on different nights.

## Project Selection

The Technical Writer routines should use the same project boundary as Product Manager:

- inspect active Paperclip projects
- include active Micronaut-related projects that map to managed GitHub repositories
- exclude internal company-operating projects such as `company-operations`
- record skip reasons for projects that cannot be mapped to a managed GitHub repository or fall outside the managed Micronaut-related boundary

## Weekly User Guide Review

Add a recurring task named `Weekly User Guide Review`, assigned to `technical-writer`.

For each eligible project, the Technical Writer should:

1. Identify the repository and read the relevant repo-local instructions.
2. Assemble the user guide with `./gradlew publishGuide`.
3. Read the assembled guide end to end from the point of view of a developer using the framework.
4. Fact-check claims in the guide by creating throwaway applications or projects and exercising the documented framework behavior.
5. Verify setup flows, links, commands, snippets, configuration examples, conceptual claims, migration notes, and cross-references.
6. Fact-check any proposed guide changes before opening a PR.
7. Open or update a PR in the project repository with only evidence-backed fixes.
8. Record the validation evidence and PR URL in the routine report.

The first run should perform a full guide review for each eligible project. Later runs should use the prior routine report plus repository diffs, recent commits, and guide file changes since the last run to focus on the guide delta. A later run should still perform a full reread when there is no prior report, the guide structure changed substantially, the previous report is unreliable, generated guide output changed unexpectedly, or recent evidence suggests a broader documentation drift.

If `./gradlew publishGuide` fails, the repository lacks an assembled guide, or required validation is blocked, the routine records the blocker and does not open speculative documentation PRs.

## Weekly Guide Topic Discovery

Add a recurring task named `Weekly Guide Topic Discovery`, assigned to `technical-writer`.

For each eligible project, the Technical Writer should:

1. Inspect project capabilities, docs, examples, recent changes, issues, and common user workflows.
2. Use the Micronaut Guides skill synced from `micronaut-project-template` when evaluating standalone tutorial-guide opportunities.
3. Identify missing guide topics that would help users learn the project.
4. Deduplicate against existing guide topics and any repository or `micronaut-guides` work already in progress.
5. Create or update a PR in the appropriate guides repository when a concrete guide topic is warranted.
6. Record skipped projects, rejected topics, deduplication evidence, created PRs, and blockers.

The Guides skill is for standalone Micronaut Guides work, not ordinary module user-guide edits. Ordinary module guide fixes stay in the project repository and belong to the Weekly User Guide Review routine or normal synced `type: docs` work.

## Technical Writer Agent Updates

The Technical Writer instructions should explicitly support three modes:

- normal issue-stage documentation work
- Weekly User Guide Review routine
- Weekly Guide Topic Discovery routine

The agent should be allowed to create PRs directly during the two routines, but only for documentation work that has been validated and fact-checked. It must not merge PRs or bypass the normal human merge authority.

The Technical Writer should also be assigned the referenced `guides` skill in this package. The local skill should reference:

`https://github.com/micronaut-projects/micronaut-project-template/blob/master/.agents/skills/guides/SKILL.md`

## Documentation CI Skip Guidance

Add package guidance for documentation-only changes:

- If a commit or PR changes documentation that the build does not exercise, include a GitHub CI-skip keyword such as `[skip ci]` in the commit message or PR title/body where appropriate.
- Do not skip CI for documentation tied to build-validated snippets, executable examples, generated guides, `publishGuide`, or other docs checks.
- Routine reports and PR bodies should state which validation ran and why CI was skipped or not skipped.

This guidance belongs in Technical Writer instructions, shared repo operations guidance, and README/COMPANY user-facing docs.

## Tests And Verification

Implementation should add or extend focused tests that verify:

- Product Manager routine is weekly and scheduled Mondays at 01:00 `Europe/Madrid`
- Security, CEO self-improvement, and Training routines moved to the night schedule
- `Weekly User Guide Review` and `Weekly Guide Topic Discovery` exist as active routines owned by Technical Writer
- Technical Writer frontmatter includes the `guides` skill
- the local `skills/guides/SKILL.md` file references the upstream Micronaut Guides skill
- Technical Writer instructions mention `./gradlew publishGuide`, throwaway app fact-checking, proposed-change fact-checking, delta-only review after the first run, and direct PR creation for validated documentation fixes
- Guide topic discovery instructions mention the Guides skill, missing-topic discovery, deduplication, and PR creation
- docs-only CI skip guidance is present in Technical Writer, shared operations guidance, README, and COMPANY

After implementation, run the Product Manager/Technical Writer routine tests, the full unit suite, Paperclip import verification, and `npm test`.
