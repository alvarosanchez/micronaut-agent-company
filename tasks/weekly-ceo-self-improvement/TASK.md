---
name: Weekly CEO Self-Improvement
assignee: ceo
project: company-operations
recurring: true
---

Review the company's recent execution history and improve the operating system without creating instruction drift or silent package forks.

Focus on:

- repeated blockers, stalled handoffs, and noisy queue patterns
- QA, security, or review churn that suggests missing guidance or the wrong quality gate
- missing or outdated repo-level `AGENTS.md` guidance in managed Micronaut repositories
- gaps or upgrade opportunities in the company's imported skill inventory that would materially improve delivery
- whether local extension instructions or `.company-runtime/` overlays should be added, simplified, or pruned
- whether any reusable company learning should be promoted into the package core with a PR to `alvarosanchez/micronaut-agent-company`

Produce one Paperclip report that includes:

- the most important operational frictions from the last week
- one to three concrete skill proposals and why they are worth adding now
- any repo-level `AGENTS.md` updates to make using `agent-md-refactor`
- any proposed additive extension-instruction or `.company-runtime/` changes
- any package-core PR you opened or any maintainer-ready proposal for `alvarosanchez/micronaut-agent-company`

When you touch repo-level `AGENTS.md` files in managed Micronaut repositories, keep the root file short and use linked topic files when appropriate. Do not mutate an imported company instance's core instruction files in place. If a default should change for future imports, make the change in a clone of `alvarosanchez/micronaut-agent-company` and send a PR; otherwise keep it additive.
