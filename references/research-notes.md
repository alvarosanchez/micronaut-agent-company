# Research Notes

This package was designed from a focused review of the following sources:

- [Agent Companies specification](https://agentcompanies.io/specification)
- [aronprins/paperclip-company-playbook](https://github.com/aronprins/paperclip-company-playbook)
- [pawbytes/paperclip-orgs-builder](https://github.com/pawbytes/paperclip-orgs-builder)
- [yesterday-ai/paperclip-plugin-company-wizard](https://github.com/yesterday-ai/paperclip-plugin-company-wizard)
- [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- [paperclipai/companies](https://github.com/paperclipai/companies)
- [Clipmart](https://www.clipmart.ai/)
- Official Micronaut contribution and documentation surfaces, especially repo-level contributor guidance and the `micronaut-guides` contributor workflow

## Design Principles Taken From The Research

### 1. Keep The Company Lean And Explicit

The Paperclip playbook and Company Wizard both push toward small teams with clear responsibilities rather than sprawling org charts from day one. This package stays at six agents so every role has a distinct purpose and every handoff is visible.

### 2. Use A Pipeline For Maintenance Work

The strongest importable Paperclip companies, especially the more structured engineering examples, use explicit stages rather than a loose swarm. That pattern maps well to Micronaut maintenance because triage, architecture, review, and QA solve different problems and should not be blended together.

### 3. Separate Acceptance From Structural Review

The user intent already distinguished QA from code review. The research reinforced that this is a good split: QA checks whether the change solved the planned problem, while the reviewer checks for broader code-quality, security, performance, and maintainer-cost issues.

### 4. Make Repo Maintenance A First-Class Workflow

Company Wizard's `repo-maintenance` preset was directly relevant. This company therefore includes:

- bootstrap tasks for repository-cluster discovery
- triage-first operating rules
- PR backlog review as a distinct workstream
- recurring queue review for preventing stale work accumulation

### 5. Treat Agent Instructions As Workflow Contracts

The best examples in `paperclipai/companies` and `agency-agents` do not stop at persona text. They state what triggers each role, what artifact it must produce, and who it hands work to next. Every agent in this package follows that structure.

### 6. Preserve Importability And Portability

The package uses the standard Agent Companies directory structure, a minimal `.paperclip.yaml`, and custom local skills instead of relying on machine-local skills. That keeps the company importable into a Paperclip instance without hidden workspace dependencies.

### 7. Stay Micronaut-Specific Without Hardcoding The Wrong Repos

Micronaut work happens across many repositories with different branching, release, and documentation patterns. Instead of baking in a guessed subset, this package ships with a bootstrap file and tasks that define the company instance's actual repository cluster after import.

### 8. Keep Governance Human Where It Matters

The researched examples were strongest when agent workflows were explicit about external approval boundaries. This package therefore keeps the board and Micronaut maintainers outside the agent roster: humans move issues from `BACKLOG` to `TODO`, leave approval comments in Paperclip, merge PRs, and cut releases.

## How The Research Changed The Package

- The **CEO** is queue-health focused, not a generic strategist.
- **QA** is both the intake gate and the final sign-off gate.
- The **Architect** is instructed to think across release lines, compatibility, and docs impact, not only code structure.
- The **Technical Writer** is treated as a production role, not as optional cleanup after engineering.
- The **Code Reviewer** explicitly owns hidden risk outside the acceptance criteria and creates the GitHub PR after QA sign-off.
- Shared skills hold the operating system for Micronaut maintenance so the role prompts stay clear and reusable.
- The board is intentionally not represented as an agent role because the requested workflow keeps approval, merge, and release authority human.
