# Pr Delivery Evidence

Detailed reference extracted from `micronaut-repo-operations` so the primary skill can stay a compact router. These rules remain runtime guidance when this reference is loaded for the matching work mode.

## PR Rules

- The delivery loop combines normal owner assignment for intake, planning, implementation, and PR follow-through with execution-policy stages for the enforced review chain.
- Once the target branch is identified for any PR, fetch and update the work branch from the target branch before starting work, editing, committing, opening, creating, or updating the PR. If that target branch rebase or merge produces conflicts, record the conflict as a blocker and do not open, create, or update a conflicting PR.
- `code-reviewer` creates the GitHub PR only after QA and Security Engineer stages are approved.
- `code-reviewer` must not resolve PR-based delivery work as `approved` unless, by the end of that run, a non-draft GitHub PR exists in the correct repository and branch, is readable through the synced GitHub context, and carries the correct issue linkage, closing keyword, and `type:` label. All selected organization projects should be linked when the chosen projects exist and GitHub tooling can apply them, but missing linkage due to no matching project or tooling gaps alone does not block `approved`.
- Normal delivery PRs created from synced GitHub issues already have a Paperclip issue from the sync plugin. The affected-project child issue or subtask requirement applies to routine PRs, package-evolution PRs, managed repository `AGENTS.md` PRs, upstream dependency PRs, and any other PR created outside that normal delivery pipeline.
- A source-changing implementation branch with no acceptable linked PR is unfinished delivery work, even when tests and docs pass. Do not mark the Paperclip issue `DONE`; route it to the active QA/Security Engineer/Code Reviewer path, or to the next owner who can create or verify the PR.
- Every PR must include a closing keyword such as `Fixes #123`.
- Every PR must carry exactly one `type:` label.
- Every PR should be linked to all selected Micronaut organization projects chosen during QA intake, representing the best-fit Micronaut Platform release boards that can first consume the repository's next module release.
- When the selected projects exist and GitHub tooling can apply them, agents should create every live PR-to-project association with `paperclip-github-plugin:add_pull_request_to_project` or its MCP-bridged runtime name instead of only restating the intended boards in prose.
- If the selected organization-project set carried ambiguity, repeat the ambiguity in the PR description instead of dropping the project links. For a GA release target with both milestone or release candidate boards and a GA release board, keep both links, such as `5.0.0-M3` and `5.0.0 Release`.
- If a human maintainer changes, reschedules, or retargets the PR organization project after PR creation, that maintainer project change is authoritative and must remain. Agents must not restore, reapply, re-add, or reset the original QA-selected organization project set over the maintainer's choice.
- `code-reviewer` applies the project named earlier by QA intake unless an upstream artifact explicitly revised it.
- After PR creation, `micronaut-engineer` keeps CI green, addresses Sonar Quality Gate issues, replies to every review thread with a decision explanation, and only then resolves settled threads.
- PR-based delivery work stays open in Paperclip until GitHub merge sync completes. Agents do not manually move those items to `DONE`.
- Any material post-PR change re-enters the same execution-policy-controlled review loop after the owner has resumed the work.

## Maintainer-Friendly Evidence

Every non-trivial stage artifact should include:

- linked issue or PR context
- current state and next action
- affected repositories and branches
- tests run or still required
- documentation impact
- security impact
- compatibility or migration risk
- the exact outcome you recorded for the current stage

## Communication Style

- Keep explanations concise and respectful.
- Favor reversible decisions and small diffs.
- Close or decline work with reasons, not silence.
- Maintain a clean audit trail so a human Micronaut maintainer can understand the state of the queue quickly.
