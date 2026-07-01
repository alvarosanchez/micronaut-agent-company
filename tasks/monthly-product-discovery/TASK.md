---
name: Monthly Product Discovery
assignee: product-manager
project: company-operations
recurring: true
---

Coordinate project-specific product-discovery sub-issues for the managed Micronaut-related Paperclip projects. The routine issue is a coordinator only: do not perform deep review, market research, candidate selection, feature request creation, or top-level product development issue creation from the routine issue itself.

During each run:

- list active Micronaut-related Paperclip projects in the company
- exclude internal company-operating projects such as `company-operations`
- exclude `micronaut-projects/micronaut-project-template`; it is a repository template and file sync source, not an actual Micronaut project, so skip it for product discovery, product development issues, and feature requests
- map each eligible project to its GitHub repository from project metadata, synced issues, GitHub sync context, or clear repository naming evidence
- before creating a project child issue, search for an existing open or already-created product-discovery child issue or subtask for the same routine issue and project; also search for orphan or top-level product-discovery issues for the same project from recent routine attempts; reuse, update, or reparent the existing issue when possible, and if it cannot be safely reparented, record a blocker instead of creating another duplicate
- create at most one Paperclip product-discovery sub-issue, child issue, or subtask per eligible Micronaut-related project; set the subtask's project to the actual corresponding Paperclip project, link it to the routine issue with `parentId` when supported, and set assignee to Product Manager (`product-manager`)
- make each child issue description self-contained and complete: tell the assignee to use the product-discovery skill, name the project repository, include the discovery checklist, duplicate-check expectations, output sections, and allowed outcomes
- do not create top-level project-specific Paperclip issues for Weekly Product Discovery follow-up; use the child issue or subtask as the project-owned work item
- do not create top-level product development issues or feature requests from the routine issue; any product development issue decision and creation must happen only inside the project-specific child issue or subtask
- inside each project-specific subtask, use the product-discovery skill, perform the deep review, read the repository README, docs, examples, recent releases, open issues, closed feature requests, previous product-discovery reports, prior project subtask reports, prior run created issue or no-create decisions, and current known capabilities, research market and competitors, deduplicate candidate gaps, avoid proposing or creating the same previously proposed feature candidate unless new evidence materially changes the decision, and record either a top-level Paperclip product development issue with explicit `status: backlog`, `workMode: standard`, and assignee QA (`qa-engineer`) or a no-create decision

Inside a project-specific subtask, each comprehensive Paperclip feature request must be detailed enough to become implementation input for another agent after human review. Include:

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
- previous product-discovery reports, prior project subtask reports, and prior run created issue, duplicate, rejected candidate, or no-create decisions checked before proposing the feature

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- product-discovery sub-issues or subtasks reused or created in the actual corresponding projects and assigned to Product Manager
- parent link status for each child issue or subtask
- confirmation that no duplicate child issue was created for a project that already had a product-discovery subtask for this routine
- orphan or top-level product-discovery issues found, whether they were reused, updated, reparented, or blocked because they could not be safely corrected
- previous product-discovery reports inspected and any repeated candidate decisions, including earlier created product issues, duplicate findings, rejected candidates, or no-create decisions
- blockers such as missing repository mapping, missing Paperclip project access, missing Paperclip issue-creation access, or unavailable project context

Finish the routine issue with a real coordination outcome: project-specific discovery subtasks reused or created and assigned to Product Manager, no eligible project found, or clearly blocked with the blocking fact recorded. The project child issue or subtask later finishes with the project outcome: top-level Paperclip product development issue created in backlog with standard work mode and assigned to QA, no non-duplicative implementation-ready feature justified, or clearly blocked with the blocking fact and issue draft recorded. Do not end with a proposal-only list when Paperclip issue creation is available.
