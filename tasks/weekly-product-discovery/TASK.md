---
name: Weekly Product Discovery
assignee: product-manager
project: company-operations
recurring: true
---

Research the managed Micronaut-related Paperclip projects each week by creating project-specific discovery sub-issues first. Each discovery subtask belongs to the actual Micronaut-related project and is assigned to Product Manager for deep review; only then should it create a top-level Paperclip product development issue in that project's backlog, assigned to QA, when the strongest implementation-ready product gap justifies one.

During each run:

- list active Micronaut-related Paperclip projects in the company
- exclude internal company-operating projects such as `company-operations`
- exclude `micronaut-projects/micronaut-project-template`; it is a repository template and file sync source, not an actual Micronaut project, so skip it for product discovery, product development issues, and feature requests
- map each eligible project to its GitHub repository from project metadata, synced issues, GitHub sync context, or clear repository naming evidence
- create one Paperclip product-discovery sub-issue, child issue, or subtask per eligible Micronaut-related project; set the subtask's project to the actual corresponding Paperclip project, link it to the routine issue with `parentId` when supported, and set assignee to Product Manager (`product-manager`)
- perform the deep review inside each project-specific discovery subtask
- read the repository README, docs, examples, recent releases, open issues, closed feature requests, and current known capabilities inside that subtask
- research the market, competitor frameworks, adjacent technologies, and developer workflows on the internet inside that subtask
- compare the research against the repository's existing capabilities
- deduplicate candidate gaps against open and closed GitHub issues in the same repository
- pick at most one high-value non-duplicative feature request per project
- when a subtask justifies a new product request, create a top-level Paperclip product development issue in the corresponding project with status `backlog`, no parent issue, and assignee QA (`qa-engineer`)
- do not publish issues to GitHub from this routine; include `Intended GitHub label: type: enhancement` in the Paperclip issue body unless an equivalent Paperclip label can be applied safely
- leave created Paperclip product development issues in backlog for human review; keep them assigned to QA so that when a board user moves one to `TODO`, QA can begin intake triage

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
- product-discovery sub-issues or subtasks created in the actual corresponding projects and assigned to Product Manager
- repository capability summary per inspected project
- research sources and competitor technologies considered
- candidate feature gaps considered
- duplicate checks performed
- selected feature for each project
- created top-level Paperclip product development issue URLs and confirmation that each is in backlog, assigned to QA, and not parented under the discovery subtask
- projects where no issue was opened and the reason
- blockers such as missing repository mapping, missing GitHub read access, missing Paperclip project access, missing Paperclip issue-creation access, or unavailable project context
- complete issue drafts for any feature request that could not be opened because of a blocker

Finish with a real outcome: project-specific discovery subtasks created and assigned to Product Manager, top-level Paperclip product development issue created in backlog and assigned to QA, no non-duplicative implementation-ready feature justified in the project subtask, or clearly blocked with the blocking fact and issue draft recorded. Do not end with a proposal-only list when Paperclip issue creation is available.
