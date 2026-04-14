---
name: Configure Sync Defaults
assignee: ceo
project: company-bootstrap
---

Confirm that the GitHub sync plugin is configured so the company can operate without manual cleanup on every intake.

At minimum:

- new GitHub issues sync into Paperclip in `BACKLOG`
- the default issue assignee is `qa-engineer`
- the required GitHub labels exist in every repository: `type: breaking`, `type: enhancement`, `type: improvement`, `type: docs`, `type: dependency-upgrade`, `type: bug`, and `type: question`
- any repo-specific sync exceptions are documented in `references/repository-cluster.md`

Do not start steady-state backlog reduction until these defaults are verified.
