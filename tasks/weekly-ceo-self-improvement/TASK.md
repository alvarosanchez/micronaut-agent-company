---
name: Weekly CEO Self-Improvement
assignee: ceo
project: company-operations
recurring: true
---

Review the company's recent execution history and improve the operating system without creating instruction drift.

Focus on:

- repeated blockers, stalled handoffs, and noisy queue patterns
- QA, security, or review churn that suggests missing guidance or the wrong quality gate
- missing or outdated repo-level `AGENTS.md` guidance in managed Micronaut repositories
- high-signal skills from `skills.sh` that would materially improve delivery
- whether local `.company-runtime/` overlays should be added, simplified, or pruned

Produce one Paperclip report that includes:

- the most important operational frictions from the last week
- one to three concrete skill proposals and why they are worth adding now
- any repo-level `AGENTS.md` updates to make using `agent-md-refactor`
- any proposed additive `.company-runtime/` changes
- any package-core changes that require a human-maintained repo update instead of agent self-editing

When you touch repo-level `AGENTS.md` files in managed Micronaut repositories, keep the root file short and use linked topic files when appropriate. Do not mutate this package's core instruction files unless a human explicitly asks for a package update.
