---
name: Daily Product Discovery
assignee: product-manager
project: company-operations
recurring: true
---

Research the managed Micronaut-related Paperclip projects and create direct GitHub feature requests for the strongest implementation-ready product gaps.

During each run:

- list active Micronaut-related Paperclip projects in the company
- exclude internal company-operating projects such as `company-operations`
- map each eligible project to its GitHub repository from project metadata, synced issues, GitHub sync context, or clear repository naming evidence
- read the repository README, docs, examples, recent releases, open issues, closed feature requests, and current known capabilities
- research the market, competitor frameworks, adjacent technologies, and developer workflows on the internet
- compare the research against the repository's existing capabilities
- deduplicate candidate gaps against open and closed GitHub issues in the same repository
- pick at most one high-value non-duplicative feature request per project
- create the GitHub issue directly when GitHub write access is available
- apply `type: enhancement` when the label exists or the available tooling can apply labels

Each GitHub feature request must be comprehensive and detailed enough to become implementation input for another agent. Include:

- problem statement and affected user persona
- market, competitor framework, or technology evidence
- current Micronaut project capability summary
- identified gap and why it matters now
- proposed behavior, configuration shape, API shape, documentation shape, or workflow shape when the research supports a concrete proposal
- implementation considerations and likely affected surfaces
- compatibility, migration, release-targeting, and security considerations
- acceptance criteria that QA can verify
- documentation and test expectations
- related issues, pull requests, docs, releases, and prior art checked during deduplication

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- repository capability summary per inspected project
- research sources and competitor technologies considered
- candidate feature gaps considered
- duplicate checks performed
- selected feature for each project
- created GitHub issue URLs
- projects where no issue was opened and the reason
- blockers such as missing repository mapping, missing GitHub read access, missing GitHub write access, or unavailable direct GitHub issue creation tooling
- complete issue drafts for any feature request that could not be opened because of a blocker

Finish with a real outcome: GitHub issue created directly, no non-duplicative implementation-ready feature justified, or clearly blocked with the blocking fact and issue draft recorded. Do not end with a proposal-only list when GitHub write access is available.
