---
name: Weekly Product Discovery
assignee: product-manager
project: company-operations
recurring: true
---

Research the managed Micronaut-related Paperclip projects each week and create top-level Paperclip backlog issues for the strongest implementation-ready product gaps so a human can review them before they enter the normal delivery pipeline.

During each run:

- list active Micronaut-related Paperclip projects in the company
- exclude internal company-operating projects such as `company-operations`
- map each eligible project to its GitHub repository from project metadata, synced issues, GitHub sync context, or clear repository naming evidence
- read the repository README, docs, examples, recent releases, open issues, closed feature requests, and current known capabilities
- research the market, competitor frameworks, adjacent technologies, and developer workflows on the internet
- compare the research against the repository's existing capabilities
- deduplicate candidate gaps against open and closed GitHub issues in the same repository
- pick at most one high-value non-duplicative feature request per project
- create a top-level Paperclip issue in the corresponding project with status `backlog` when the project exists in Paperclip
- do not publish issues to GitHub from this routine; include `Intended GitHub label: type: enhancement` in the Paperclip issue body unless an equivalent Paperclip label can be applied safely
- leave created Paperclip issues in backlog for human review instead of assigning or actioning them directly

Each comprehensive Paperclip feature request must be detailed enough to become implementation input for another agent after human review. Include:

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
- created top-level Paperclip issue URLs and confirmation that each is in backlog
- projects where no issue was opened and the reason
- blockers such as missing repository mapping, missing GitHub read access, missing Paperclip project access, missing Paperclip issue-creation access, or unavailable project context
- complete issue drafts for any feature request that could not be opened because of a blocker

Finish with a real outcome: top-level Paperclip issue created in backlog, no non-duplicative implementation-ready feature justified, or clearly blocked with the blocking fact and issue draft recorded. Do not end with a proposal-only list when Paperclip issue creation is available.
