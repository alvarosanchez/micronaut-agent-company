# Micronaut Inbox Zero Engineering

Micronaut Inbox Zero Engineering is an importable Agent Companies package for Paperclip. It is built for a subset of related repositories in the `micronaut-projects` GitHub organization and is optimized for the long-running maintenance problem: keep the issue and PR inbox empty without sacrificing code quality, compatibility, or documentation quality.

The company uses a deliberate maintenance pipeline instead of a generic "everyone codes" setup:

1. New GitHub issues and PRs are synced into Paperclip.
2. The CEO keeps the queue healthy and assigns first-pass triage.
3. QA decides whether an item is actionable, blocked on clarification, duplicate, stale, or out of scope.
4. The Architect writes the implementation strategy and acceptance criteria.
5. The Micronaut Engineer and Technical Writer execute the change.
6. The Code Reviewer checks structural quality and hidden risk.
7. QA signs off against the original plan.
8. The Micronaut Engineer opens or updates the final PR and closes the loop.

## Org Chart

| Agent | Title | Reports To | Primary Responsibility |
| --- | --- | --- | --- |
| CEO | Chief Executive Officer | `null` | Queue health, prioritization, repo-cluster scope, escalation |
| Architect | Micronaut Architect | `ceo` | Technical strategy, implementation plans, branch/test/docs guidance |
| QA Engineer | QA Engineer | `ceo` | Initial triage and final acceptance gate |
| Code Reviewer | Code Reviewer | `ceo` | Code quality, security, performance, maintainability, DX review |
| Micronaut Engineer | Micronaut Engineer | `architect` | Autonomous implementation, test coverage, PR preparation |
| Technical Writer | Technical Writer | `architect` | User-facing docs, migration guides, guide/doc system quality |

## Shared Skills

| Skill | Purpose |
| --- | --- |
| `micronaut-repo-operations` | Shared operating rules for inbox-zero maintenance across a Micronaut repository cluster |
| `micronaut-quality-gates` | Common definition of done across planning, implementation, review, QA, and PR handoff |
| `micronaut-documentation-systems` | Micronaut-specific documentation expectations across Asciidoctor, guides, READMEs, and upgrade notes |

## Included Projects And Tasks

- `company-bootstrap`: first-run setup for defining the repository cluster, mapping branches and test/doc constraints, and building the initial operational backlog.
- `inbox-zero-program`: starter tasks for issue classification, PR review backlog, documentation debt, and the first implemented fix.
- `weekly-inbox-zero-review`: a recurring CEO task for queue health, WIP control, and stale-work cleanup.

## First Run

1. Import the company into Paperclip.
2. Complete the `company-bootstrap` project before picking implementation work.
3. Update `references/repository-cluster.md` with the exact Micronaut repositories, branches, CI commands, and maintainer conventions for the company instance.
4. Let the CEO start routing synced issues and PRs through the pipeline.

## Import

```bash
npx paperclipai company import --from /Users/alvaro/Dev/alvarosanchez/micronaut-agent-company
```

## References

- [Agent Companies specification](https://agentcompanies.io/specification)
- [Paperclip](https://github.com/paperclipai/paperclip)
- [paperclipai/companies](https://github.com/paperclipai/companies)
- [Research notes for this package](./references/research-notes.md)
