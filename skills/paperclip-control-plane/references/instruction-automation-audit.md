# Instruction Automation Audit

Reviewed scope: all 8 `agents/*/AGENTS.md` files and all 25 package-owned Markdown files under `skills/` in PR #110 (33 instruction/skill Markdown files total, including linked references). The goal is to replace deterministic control-plane interpretation with executable, fail-closed evidence while preserving human/agent judgment where context matters. `scripts/paperclip-catalog-skills.test.mjs` derives and checks this corpus rather than trusting a hand-maintained role list.

## Automated now

The bundled `scripts/paperclip-workflow.mjs` provides three read-only commands for repeated control-plane operations:

| Former prose operation | Command | Safety property |
| --- | --- | --- |
| Fetch issue, heartbeat context, and selected durable documents | `snapshot` | One normalized JSON result; 404 documents are explicit `null` |
| Re-open and verify status, assignee, current participant, last outcome, and required documents | `verify` | Exits 2 with field-level mismatches |
| Verify approval-to-issue linkage | `approval-link` | Reads the authoritative approval issue list rather than trusting cached issue fields |


The script requires the normal agent bearer token. It accepts only a bare HTTP(S) origin, rejects embedded credentials/query/fragment/path components, and permits plaintext HTTP only on loopback. It deliberately has **no document-mutation, stage-transition, or cross-agent wake command**: the installed Paperclip build exposes no atomic client precondition for keyed-document replacement or same-agent stage re-entry, and an agent-authenticated heartbeat caller may invoke only itself. Native Paperclip tools own permitted document and stage operations; correct stage advancement or assignment is the routing mechanism.

## Already executable; do not wrap again

These instruction classes already use deterministic package scripts or typed plugin tools:

- repository state, branch, release, SemVer, and diff evidence: `repo-evidence.mjs`
- CEO run-history evidence: `issue-history-evidence.mjs`
- marketplace search-only evidence: the assigned `marketplace-skill-discovery` skill
- GitHub issue/PR reads and mutations: typed `paperclip-github-plugin` tools
- atomic branch publication and PR creation: `paperclip-github-plugin:create_pull_request`
- review threads, project links, PR assets, and GitHub Sync linkage: typed plugin tools

Wrapping typed plugin tools in shell or raw REST would duplicate schemas, weaken attribution, and create more token-bearing instructions, so the agent instructions should name the tool and decision criteria rather than inline HTTP.

## Next deterministic candidates

These are suitable for later script/plugin commands, but were not added to the first shared CLI because their live schemas and idempotency rules need dedicated contract tests:

1. **Issue interaction helper** — create `request_confirmation`, `ask_user_questions`, or `suggest_tasks` with a stable idempotency key and document revision target; verify the stored interaction.
2. **Accepted-plan decomposition helper** — validate an accepted `plan` revision, create standard-mode child drafts, and return their IDs without duplicate creation.
3. **Idempotent project-child coordinator** — list projects and existing children, reuse/reparent matching work, and create only missing project-scoped routine children.
4. **Productivity-review recovery helper** — gather source/review state and compute a no-mutation report; a manager must still choose resume, reroute, block, or stop.
5. **Publication-manifest validator** — compare local full SHA, target base, PR body file, labels, projects, reviewer eligibility, and asset hashes before the typed atomic PR tool runs.
6. **Route-artifact validator** — validate `qa-intake` and `training-route` enums, booleans, owner equality, board-approval linkage, and canonical ordered `stageSequence` without deciding the risk classification itself.
7. **Atomic stage decision helper** — add only after Paperclip exposes a server-enforced execution-stage/revision precondition. A client-side GET followed by PATCH is not sufficient and must not be wrapped as if it were atomic.

## Must remain judgment, not scripts

The audit intentionally keeps these as concise prose:

- whether evidence establishes a real bug, duplicate, already-implemented state, or skill gap
- whether a change is architecture-sensitive, security-sensitive, breaking, or compatible
- whether an external skill's provenance and requested authority are acceptable
- target-branch exceptions and ambiguous release/project-board choices
- plan quality, implementation correctness, test sufficiency, security findings, and final code review
- whether documentation is accurate and useful to a Micronaut user
- whether review feedback is valid, not applicable, or should be disputed

Scripts may gather and validate facts for these decisions, but must not silently encode the decision.

## Agent-instruction embedding decision

Do not inline script source into `AGENTS.md`. Every role is granted the narrow `paperclip-control-plane` catalog skill directly. Agent instructions resolve that imported skill's directory from the runtime inventory, then name only the command and role-specific decision criteria. This avoids eight copies of executable text, works outside the package checkout, reduces prompt tokens, and gives tests one implementation surface.
