# Research Notes

This package was designed from a focused review of the following sources:

- [Agent Companies specification](https://agentcompanies.io/specification)
- [aronprins/paperclip-company-playbook](https://github.com/aronprins/paperclip-company-playbook)
- [pawbytes/paperclip-orgs-builder](https://github.com/pawbytes/paperclip-orgs-builder)
- [yesterday-ai/paperclip-plugin-company-wizard](https://github.com/yesterday-ai/paperclip-plugin-company-wizard)
- [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
- [paperclipai/companies](https://github.com/paperclipai/companies)
- [Clipmart](https://www.clipmart.ai/)
- [micronaut-project-template skills](https://github.com/micronaut-projects/micronaut-project-template/tree/master/.agents/skills)
- Official Micronaut contribution and documentation surfaces, especially repo-level contributor guidance and the `micronaut-guides` contributor workflow

## Design Principles Taken From The Research

### 1. Keep The Company Lean And Explicit

The Paperclip playbook and Company Wizard both push toward small teams with clear responsibilities rather than sprawling org charts from day one. This package stays at seven agents so every role has a distinct purpose and every handoff is visible.

### 2. Use A Pipeline For Maintenance Work

The strongest importable Paperclip companies, especially the more structured engineering examples, use explicit stages rather than a loose swarm. That pattern maps well to Micronaut maintenance because triage, architecture, review, and QA solve different problems and should not be blended together.

### 3. Separate Acceptance, Security, And Structural Review

The user intent already distinguished QA from code review. The research reinforced that this is a good split, and the later addition of a dedicated Security Engineer sharpened it further: QA checks whether the change solved the planned problem, Security Engineer checks whether the change expands attack surface or supply-chain risk, and Code Reviewer checks broader code-quality, performance, and maintainer-cost issues.

### 4. Make Repo Maintenance A First-Class Workflow

Company Wizard's `repo-maintenance` preset was directly relevant. This company therefore includes:

- triage-first operating rules
- synced GitHub issues and PRs as the only normal work surface
- repository-scoped Paperclip projects created by the GitHub sync plugin
- explicit PR backlog review and queue-health ownership in role instructions

### 5. Treat Agent Instructions As Workflow Contracts

The best examples in `paperclipai/companies` and `agency-agents` do not stop at persona text. They state what triggers each role, what artifact it must produce, and who it hands work to next. Every agent in this package follows that structure.

### 6. Preserve Importability And Portability

The package uses the standard Agent Companies directory structure, an explicit `.paperclip.yaml` that pins every role to `codex_local` and `gpt-5.4` with role-appropriate reasoning effort, and a mix of local company skills plus upstream referenced skills pinned by commit and hash. That keeps the company importable into a Paperclip instance without hidden workspace dependencies while still reusing Micronaut-maintained skill content.

### 7. Stay Micronaut-Specific Without Hardcoding The Wrong Repos

Micronaut work happens across many repositories with different branching, release, and documentation patterns. Instead of baking in a guessed subset, this package lets the GitHub sync plugin define the actual repository cluster and uses `references/repository-cluster.md` only for supplemental repo facts that agents need while executing.

### 8. Keep Governance Human Where It Matters

The researched examples were strongest when agent workflows were explicit about external approval boundaries. This package therefore keeps the board and Micronaut maintainers outside the agent roster: humans move issues from `BACKLOG` to `TODO`, leave approval comments in Paperclip, merge PRs, and cut releases.

## How The Research Changed The Package

- The **CEO** is queue-health focused, not a generic strategist.
- **QA** is both the intake gate and the final sign-off gate.
- The **Architect** is instructed to think across release lines, compatibility, and docs impact, not only code structure.
- The **Technical Writer** is treated as a production role, not as optional cleanup after engineering.
- The **Security Engineer** explicitly owns source, dependency, build, CI/CD, and secure-default risk before work reaches final review.
- The **Code Reviewer** explicitly owns non-security hidden risk outside the acceptance criteria and creates the GitHub PR after QA and Security Engineer sign-off.
- Shared skills hold the operating system for Micronaut maintenance so the role prompts stay clear and reusable, with upstream Micronaut maintainer skills referenced directly from `micronaut-project-template`.
- The board is intentionally not represented as an agent role because the requested workflow keeps approval, merge, and release authority human.
