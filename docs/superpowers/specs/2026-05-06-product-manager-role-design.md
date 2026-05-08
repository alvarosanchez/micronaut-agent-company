# Product Manager Role Design

Date: 2026-05-06
Status: Approved for specification

## Goal

Add a first-class Product Manager agent to Micronaut Agent Company. The Product Manager researches the market, competing frameworks, adjacent technologies, and active ecosystem expectations, then turns the highest-value gaps for each managed Micronaut project into detailed GitHub feature requests that implementation agents can pick up later.

The Product Manager is proactive product discovery, not an implementation or governance gate. It creates public GitHub issues directly during its weekly routine.

## Context

The company package is a portable Paperclip company template. It currently contains dedicated agents for CEO, architecture, QA, security, code review, engineering, and technical writing. It also ships internal recurring routines under `company-operations` for weekly security scanning, daily CEO self-improvement, and every-other-day training.

The new Product Manager should follow the same package shape:

- one agent instruction file under `agents/product-manager/AGENTS.md`
- one recurring task under `tasks/weekly-product-discovery/TASK.md`
- adapter and routine defaults in `.paperclip.yaml`
- docs updates in `README.md` and `COMPANY.md`
- team membership in `teams/engineering/TEAM.md`
- focused tests that verify the new role, routine, and required guidance

## Product Manager Agent

The Product Manager will be a first-class agent with:

- `name: Product Manager`
- `role: pm`
- `title: Product Manager`
- `reportsTo: ceo`
- icon hint `radar`
- skills `micronaut-repo-operations`, `docs`, and `gh-cli`
- `codex_local`, `gpt-5.5-pro`, `high` reasoning, live web search enabled

The high reasoning setting is appropriate because each run depends on source interpretation, internet research, duplicate detection, prioritization, and writing a feature request that is detailed enough for later implementation.

## Daily Routine

Add an active weekly routine named `Weekly Product Discovery`, owned by `product-manager`, scheduled at 11:00 Europe/Madrid.

This schedule was later superseded by the package-wide overnight routine schedule in `2026-05-06-technical-writer-routines-design.md`.

## Project Selection

During each routine run, the Product Manager iterates over active Micronaut-related Paperclip projects in the company.

The routine should include synced GitHub projects for repositories in the managed Micronaut cluster and exclude internal company projects such as `company-operations`. If a project cannot be mapped to a GitHub repository or appears outside the Micronaut-related boundary, the Product Manager records the skip reason in the routine report instead of guessing.

## Discovery Workflow

For each eligible project, the Product Manager:

1. Identifies the linked GitHub repository from project metadata, synced issues, plugin context, or repository naming evidence.
2. Reads the repository README, relevant docs, recent issues, recent releases, and existing feature requests to understand current capabilities.
3. Searches for competitor and market context across Micronaut-adjacent frameworks and technologies, including Spring Boot, Quarkus, Helidon, GraalVM-native Java tooling, cloud deployment platforms, observability tooling, build tooling, and developer-experience trends when relevant to that repository.
4. Compares the project capabilities against the research and lists candidate feature gaps.
5. Deduplicates each candidate against existing open and closed GitHub issues in the same repository.
6. Picks exactly one high-value, non-duplicative feature per project for that routine run.
7. Creates a GitHub issue directly in the target repository.
8. Records the created issue URL and supporting research in the Paperclip routine report.

If no feature is worth opening for a project, the Product Manager records `no issue opened` with the evidence that led to that decision.

## GitHub Issue Requirements

Each Product Manager-created GitHub issue must be comprehensive enough for another agent to implement later. The issue body should include:

- concise title that names the user-visible feature
- problem statement and affected user persona
- market or competitor evidence, with links or named references
- current Micronaut project capability summary
- identified gap and why it matters now
- proposed behavior, configuration shape, API shape, docs shape, or workflow shape when the research supports a concrete proposal
- implementation considerations and likely affected surfaces
- compatibility, migration, release-targeting, and security considerations
- acceptance criteria that QA can verify
- documentation and test expectations
- related issues or prior art checked during deduplication

The Product Manager should apply `type: enhancement` when the label exists or when the available GitHub tooling supports labels. If label application is unavailable, the issue body should still identify the intended type so QA can preserve the normal downstream route.

When using `gh` or any direct GitHub client with `GITHUB_TOKEN`, the Product Manager must follow the package's existing GitHub footer policy for maintainer-visible AI-generated text. When using `paperclip-github-plugin` tools, the plugin owns footer behavior.

## Reporting

Each routine run produces one Paperclip report with:

- every eligible project considered
- projects skipped and why
- repository capability summary per inspected project
- research sources and competitor technologies considered
- candidate feature gaps considered
- duplicate checks performed
- the selected feature for each project
- created GitHub issue URLs
- projects where no issue was opened and the reason
- blockers such as missing repository mapping, missing GitHub write access, or unavailable GitHub tooling

The routine should not end with a proposal-only list when GitHub write access is available. It should either create the selected issue, record that no issue is justified, or name the concrete blocker.

## Error Handling

If GitHub write access is unavailable, the Product Manager records a blocker in the routine report and includes the complete issue draft that would have been opened.

If research results conflict or the project capability is unclear, the Product Manager chooses the smallest defensible feature request or skips that project with an evidence-backed reason. It should not create vague roadmap issues.

If a duplicate exists, the Product Manager does not create another issue. It records the duplicate link and may add a Paperclip report note explaining why the existing issue already covers the gap.

## Boundaries

The Product Manager does not:

- implement code
- create PRs
- route the resulting issue through the delivery pipeline manually
- merge PRs or cut releases
- create board approvals before opening the feature issue
- file issues outside the managed Micronaut-related repository cluster

The GitHub sync plugin is expected to import the new issue later, at which point the normal company workflow applies.

## Tests And Verification

Implementation should add a focused unit test for the new PM role and routine. The test should verify:

- `agents/product-manager/AGENTS.md` frontmatter has role `pm`, reports to CEO, and uses the expected skills and icon
- `.paperclip.yaml` includes the Product Manager adapter with `gpt-5.5-pro`, high reasoning, and live search
- `.paperclip.yaml` includes the active `weekly-product-discovery` routine at 11:00 Europe/Madrid
- `tasks/weekly-product-discovery/TASK.md` is recurring, assigned to `product-manager`, and describes direct GitHub issue creation
- the task requires comprehensive feature request contents and duplicate checks
- README and COMPANY docs mention the Product Manager in agent tables and internal routine tables

Run the unit tests and the package import verification after implementation.
