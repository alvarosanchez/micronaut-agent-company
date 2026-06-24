# Internal Routines Overlays

Detailed reference extracted from `micronaut-repo-operations` so the primary skill can stay a compact router. These rules remain runtime guidance when this reference is loaded for the matching work mode.

## Internal Operating Routines

This package intentionally keeps internal automation small. It includes one lightweight project, `company-operations`, with six recurring Paperclip routines:

- `weekly-product-discovery`, assigned to `product-manager`
- `weekly-security-deep-scan`, assigned to `security-engineer`
- `weekly-user-guide-review`, assigned to `technical-writer`
- `weekly-guide-topic-discovery`, assigned to `technical-writer`
- `daily-ceo-self-improvement`, assigned to `ceo`
- `training`, assigned to `ceo`

These routines are company-operating work, not substitutes for the synced GitHub backlog. They exist to keep the maintenance system healthy, product-aware, and guide-aware even when the GitHub queue is quiet.

They import active by default.

When routine instructions say to include active Micronaut-related projects, exclude `micronaut-projects/micronaut-project-template`. It is a repository template and file sync source, not an actual Micronaut project, so skip it for Product Manager discovery, product development issues, feature requests, user guide review, guide topic creation, standalone guide PRs, and other normal project routines. For guide routines, also exclude `micronaut-projects/micronaut-build`; it contains internal Gradle plugins for Micronaut committers and is not intended for end-user projects, so skip it for user guide review, guide topic creation, standalone guide PRs, and other normal project documentation routines. Inspect these repositories only when the task is explicitly about template maintenance, shared file synchronization, referenced skills, repository-template infrastructure, or internal build tooling.

When a routine surfaces a new problem:

- reuse or update an existing synced GitHub issue or PR when one already covers the work
- for any routine that needs to work across more than one project, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip; put each subtask in the actual corresponding project, set assignee to the routine owner, and perform the project-specific work inside that subtask instead of only on the routine issue
- when a routine discovers implementation-ready managed-repository source work that is not already represented by a synced GitHub item, create the delivery issue in the affected project with `workMode: standard` and assignee QA (`qa-engineer`) for intake; do not assign it directly to Micronaut Engineer or Technical Writer, because QA owns deduplication, labeling, release targeting, execution-policy setup, and the first routing decision
- routine-created managed-repository source work follows the normal delivery path after QA intake when a repository diff exists: planning when needed, implementation, QA verification, security review, code review, PR creation, and PR follow-through; the issue is not complete until a linked PR exists or the project child/subtask records a no-diff/no-PR decision or named blocker
- a verified no-diff/no-PR decision for an internal routine-created project issue is a terminal no-op path, not a governance exception; when the owner documents the exact target branch, comparison evidence, and empty-diff reason, close the child/subtask directly without board approval instead of sending an empty diff through QA verification, Security Engineer, or Code Reviewer
- for Product Manager discovery, use the `product-discovery` skill; keep the parent routine issue as a coordinator only, search for an existing open or already-created product-discovery child issue or subtask for the same routine issue and project, also search for orphan or top-level product-discovery issues for the same project from recent routine attempts, reuse, update, or reparent the existing issue when possible, record a blocker instead of creating another duplicate if it cannot be safely reparented, and write a child issue description that is self-contained and complete and tells Product Manager to use the product-discovery skill
- for Product Manager discovery, do not perform deep review, market research, candidate selection, feature request creation, or top-level product development issue creation from the routine issue itself; from each project subtask, inspect previous product-discovery reports, prior routine run notes, and project subtask reports, including created product issues, no-create decisions, rejected candidates, and duplicate decisions, then create a top-level Paperclip product development issue in the corresponding project with `status: backlog`, `workMode: standard`, no `parentId`, and assignee QA (`qa-engineer`) only when the Weekly Product Discovery instructions authorize it and duplicate checks are complete; do not propose or create the same previously proposed feature candidate unless new evidence materially changes the decision, and do not publish issues to GitHub
- for Technical Writer guide routines, keep the parent routine issue as a coordinator only: it creates one Paperclip child issue or subtask per affected project when the project exists in Paperclip, puts each child in the actual corresponding project, sets `parentId` to the routine issue when supported, sets assignee to Technical Writer, and then stops instead of opening or updating PRs
- for Technical Writer guide routines, do not create top-level project-specific Paperclip issues for routine follow-up; the child issue or subtask is the project-owned work item
- for Technical Writer guide routines, perform the project-specific validation and the PR/no-PR decision only inside the project child issue or subtask, and create direct documentation PRs only there when the relevant guide assembly, fact-checking, deduplication, or validation evidence is recorded; label guide-related PRs `type: docs`, link any resulting PR to the child issue or subtask through GitHub Sync, leave that child issue or subtask in `in_review`, and do not close it or mark it `DONE` just because the PR was created
- for CEO package-core, managed repository `AGENTS.md`, upstream dependency, or other out-of-pipeline PRs, create one Paperclip child issue or subtask per affected project when the project exists in Paperclip before deciding whether a PR is needed; put each subtask in the actual corresponding project, set assignee to CEO, and if a routine may affect more than one project, create multiple subtasks so each project has a clear Paperclip state owner
- otherwise, prepare a maintainer-ready Paperclip escalation instead of inventing unsupported GitHub issue-creation workflows

## Reimport-Safe Runtime Overlays

This company package is meant to be reimported over time. Treat the package-owned files as immutable defaults inside imported company instances. Local runtime learnings stay additive; reusable defaults for future imports belong in a PR to `https://github.com/alvarosanchez/micronaut-agent-company`.

Normal Micronaut repository work should not self-edit this package:

- `COMPANY.md`
- `README.md`
- `.paperclip.yaml`
- `agents/`
- `skills/`
- `projects/`
- `tasks/`
- `teams/`

Instead, read and optionally maintain additive local overlays in `.company-runtime/` at the workspace root:

- `.company-runtime/shared.md`
- `.company-runtime/agents/<agent-slug>.md`
- `.company-runtime/projects/<project-slug>.md`

These files are optional and additive. If they do not exist, continue with the package defaults. If they grow unwieldy, refactor them with `agent-md-refactor`.

When a reusable company improvement should become a new package default, route it through the CEO and `company-package-evolution` so the change lands as a PR to the source repository instead of a local runtime mutation.

This immutability rule applies only to this company package. In managed Micronaut repositories, repo-level `AGENTS.md` files are product artifacts and may be updated when an explicit task or routine calls for it.
