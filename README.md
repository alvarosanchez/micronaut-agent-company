# Micronaut Inbox Zero Engineering

Micronaut Inbox Zero Engineering is an importable Agent Companies package for Paperclip. It is built for a subset of related repositories in the `micronaut-projects` GitHub organization and is optimized for the long-running maintenance problem: keep the issue and PR inbox empty without sacrificing code quality, compatibility, or documentation quality.

This package assumes the [paperclip-github-plugin](https://github.com/alvarosanchez/paperclip-github-plugin) is installed in the target Paperclip instance and is responsible for syncing GitHub issues and PRs into Paperclip and exposing GitHub operations as agent tools.

## Quick Start

Install the bundled skills from this repository into your local agent workspace:

```bash
npx skills add alvarosanchez/micronaut-agent-company
```

## Workflow

The company uses a deliberate maintenance pipeline instead of a generic "everyone codes" setup:

1. The sync plugin creates new GitHub issues in Paperclip in `BACKLOG`, assigned to **QA Engineer**.
2. A human reviews backlog items and moves actionable ones to `TODO`.
3. **QA Engineer** performs a deduplication search, applies the correct GitHub `type:` label, and routes the issue.
4. **Architect** plans `type: improvement`, `type: enhancement`, `type: breaking`, and `type: dependency-upgrade` work. Any breaking change requires explicit Architect approval.
5. **Micronaut Engineer** or **Technical Writer** implements the work using local git CLI only.
6. **QA Engineer** verifies the implementation against the reproducer or plan and either sends it back or signs it off.
7. **Code Reviewer** reviews from a quality, security, best-practices, and developer-experience perspective and creates the GitHub PR directly when the work is approved.
8. **Micronaut Engineer** owns the PR cycle after PR creation: keep CI green, address Sonar Quality Gate issues, and resolve all review threads.
9. The board or other Micronaut maintainers merge the PR or cut the release. The sync plugin eventually marks the Paperclip item `DONE`.

## Issue Types

| Label | Meaning | Default Route |
| --- | --- | --- |
| `type: breaking` | Breaking change that requires a new major line and explicit Architect approval | Architect |
| `type: enhancement` | New feature that belongs on the next minor line | Architect |
| `type: improvement` | Small non-breaking product change that fits a patch release | Architect |
| `type: docs` | Documentation-only change | Technical Writer |
| `type: dependency-upgrade` | Squad-originated version bump, excluding Dependabot | Architect |
| `type: bug` | Reproducible bug fix | Micronaut Engineer |
| `type: question` | Question that needs a board-approved answer proposal | QA Engineer |

## Governance

- The board is intentionally not modeled as an agent role. It remains an external human governance layer.
- Board approval always means a human comment in Paperclip.
- Git operations must use the local git CLI.
- GitHub operations must use the GitHub agent tools provided by the sync plugin.
- The implementation loop is always `Engineering or Writing -> QA -> Code Reviewer`.
- `Code Reviewer` creates the PR after QA sign-off, but only the board or other Micronaut maintainers may merge or cut releases.
- Every PR must include a closing keyword such as `Fixes #123` and must carry one of the `type:` labels above.

## Org Chart

| Agent | Title | Reports To | Primary Responsibility |
| --- | --- | --- | --- |
| CEO | Chief Executive Officer | `null` | Queue health, board-approval visibility, repo-cluster scope, escalation |
| Architect | Micronaut Architect | `ceo` | Release targeting, implementation plans, branch strategy, breaking-change approval |
| QA Engineer | QA Engineer | `ceo` | Intake gate, deduplication, label classification, reproducer validation, final QA sign-off |
| Code Reviewer | Code Reviewer | `ceo` | Structural review, PR creation, maintainer-facing quality gate |
| Micronaut Engineer | Micronaut Engineer | `architect` | Code implementation, reproducer fixes, PR-cycle execution |
| Technical Writer | Technical Writer | `architect` | Docs-only implementation, migration notes, guide and reference quality |

## Shared Skills

| Skill | Purpose |
| --- | --- |
| `micronaut-repo-operations` | Shared operating rules for lifecycle state, labels, SemVer targeting, PR rules, and tool boundaries |
| `micronaut-quality-gates` | Common definition of done across triage, planning, implementation, QA, core review, and PR follow-through |
| `micronaut-documentation-systems` | Micronaut-specific documentation expectations across Asciidoctor, guides, READMEs, upgrade notes, and docs-only issues |

## Included Projects And Tasks

- `company-bootstrap`: first-run setup for defining the repository cluster, configuring sync defaults, mapping release facts, and building the initial operational backlog.
- `inbox-zero-program`: starter tasks for issue classification, question answering, closure proposals, PR backlog review, documentation debt, and implementation.
- `weekly-inbox-zero-review`: a recurring CEO task for queue health, board-approval visibility, and stale-work cleanup.

## First Run

1. Import the company into Paperclip.
2. Configure the GitHub sync plugin mappings so new issues land in `BACKLOG`, default assignee is `QA Engineer`, and the required `type:` labels exist in GitHub.
3. Complete the `company-bootstrap` project before picking implementation work.
4. Update `references/repository-cluster.md` with the exact Micronaut repositories, default branches, latest production releases, CI commands, Sonar facts, and maintainer conventions for the company instance.
5. Use `references/issue-lifecycle.md` as the operational source of truth when adjusting local company policy.

## Import

Install the repository's bundled skills locally:

```bash
npx skills add alvarosanchez/micronaut-agent-company
```

Import the company package into Paperclip:

```bash
npx paperclipai company import --from /Users/alvaro/Dev/alvarosanchez/micronaut-agent-company
```

## Validation

Run the end-to-end import verifier locally with Node 22:

```bash
npm run test:node22
```

This boots an isolated Paperclip instance, imports the company, verifies the created company, agents, projects, issues, skills, and exported extension through the Paperclip API, then tears the instance down.

## References

- [Agent Companies specification](https://agentcompanies.io/specification)
- [Paperclip](https://github.com/paperclipai/paperclip)
- [paperclipai/companies](https://github.com/paperclipai/companies)
- [GitHub issue lifecycle reference](./references/issue-lifecycle.md)
- [Research notes for this package](./references/research-notes.md)
