---
name: Weekly Guide Topic Discovery
assignee: technical-writer
project: company-operations
recurring: true
---

Identify missing standalone Micronaut Guide topics for the managed Micronaut-related Paperclip projects and prepare guide PRs when a concrete user-learning gap exists.

During each run:

- inspect active Paperclip projects and include active Micronaut-related Paperclip projects that map to managed GitHub repositories
- exclude internal company-operating projects such as `company-operations`
- record skip reasons for projects that cannot be mapped to a managed GitHub repository or fall outside the managed Micronaut-related boundary
- inspect project capabilities, docs, examples, recent changes, issues, and common user workflows
- use the Micronaut `guides` skill when evaluating standalone tutorial-guide opportunities
- identify missing guide topics that would help users learn the project
- deduplicate candidate topics against existing `micronaut-guides` content, nearby guide topics, repository docs, open issues, and open PRs
- create or update a PR in `micronaut-projects/micronaut-guides` when a concrete standalone guide topic is warranted

Use the `guides` skill for standalone Micronaut Guides work in `micronaut-projects/micronaut-guides`. Do not use it for ordinary module documentation under `src/main/docs/guide`; those fixes belong to Weekly User Guide Review or normal synced `type: docs` work.

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- candidate missing guide topics considered
- deduplication searches and rejected duplicate or near-duplicate topics
- selected guide topic and why it matters
- source facts from the local project that prove the guide content
- PR URLs opened or updated in `micronaut-guides`
- blockers such as missing repository access, ambiguous overlap with an existing guide, or validation that could not be completed

Finish with a real outcome: no missing guide topic found, guide PR opened or updated, or clearly blocked with the blocking fact recorded.
