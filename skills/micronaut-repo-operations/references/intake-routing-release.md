# Intake Routing Release

Detailed reference extracted from `micronaut-repo-operations` so the primary skill can stay a compact router. These rules remain runtime guidance when this reference is loaded for the matching work mode.

## Recommended Stage Layouts

- `type: bug`: QA intake review -> Micronaut Engineer review stage -> QA verification review -> Security Engineer review -> Code Reviewer review.
- `type: docs`: QA intake review -> Technical Writer review stage -> QA verification review -> Security Engineer review -> Code Reviewer review.
- `type: improvement`, `type: enhancement`, `type: breaking`, `type: dependency-upgrade`: QA intake review -> Architect review -> Micronaut Engineer or Technical Writer review stage -> QA verification review -> Security Engineer review -> Code Reviewer review.
- `type: question`, clarification wait paths, unreproducible bug closures, duplicate closures, and already-implemented closures: QA intake review, with QA publishing the GitHub answer, clarification request, or closure directly and waiting for sync.
- Recurring internal routines stay as Paperclip company-operating work and may use a shorter stage sequence when no downstream review is required.

## Imported Issues With Existing PRs

- QA intake owns the first decision on any linked PR that arrived with the synced issue, including PRs opened by external contributors before import.
- If the linked contributor PR is good enough to salvage, keep it on the normal stage layout and treat it like an agent-created PR that still has to clear every configured gate.
- If the linked contributor PR needs substantial replacement work, QA should leave that contributor PR open, document that it is not the implementation vehicle, and continue routing the issue itself through the normal engineering pipeline toward a separate maintainer-owned PR.
- An inadequate linked contributor PR does not become a closure path. Leave it open and keep the underlying issue moving through the normal implementation stages.

## Required GitHub Type Labels

Actionable issues and PRs should carry exactly one `type:` label:

- `type: breaking` for changes that would require a major module version and explicit Architect approval
- `type: enhancement` for new non-breaking feature work that normally implies a minor module version
- `type: improvement` for small non-breaking product changes that should fit patch, minor, or major release targets when the approved target branch allows improvements
- `type: docs` for documentation-only changes
- `type: dependency-upgrade` for squad-originated version bumps that are not Dependabot work; route it by actual compatibility impact, not by label alone
- `type: bug` for bug fixes that should fit patch, minor, or major release targets when the approved target branch allows bugfixes
- `type: question` for questions QA can answer directly or route into a clarification request

Duplicate, stale, superseded, out-of-scope, and already-implemented issues are immediate-closure dispositions that may be closed without forcing a `type:` label if the closure path is well documented.

## Type Routing

- `type: bug`: QA reproduces first. Reproduced bugs move into the Micronaut Engineer stage sequence. Unreproducible bugs may be closed directly by QA with `closed: cannot reproduce`, GitHub's native `Close as not planned` reason instead of `Close as completed`, and a detailed, evidence-rich closure comment with the exact non-reproducer steps, versions, and observed results.
- `type: improvement`, `type: enhancement`, `type: breaking`, and `type: dependency-upgrade`: QA moves the item into the Architect planning stage.
- `type: docs`: QA moves the item into the Technical Writer stage.
- `type: question`: QA answers directly on GitHub with `type: question` and `closed: question` when confident, or posts a request-for-comments message with `status: awaiting feedback`; issues that remain awaiting feedback for more than 30 days may be closed with `closed: question` and GitHub's native `Close as not planned` reason instead of `Close as completed`.

## Closure Dispositions

- Deduplicate against open and closed GitHub issues in the same repository. For closed candidates, inspect why they were closed, including closure disposition, duplicate links, closure comments, and already-implemented evidence, before deciding whether they supersede the current report.
- `already-implemented` (closure disposition, not a GitHub `type:` label): QA may close the issue directly once it documents the exact version, PR, release, or documentation evidence in a detailed, evidence-rich closure comment and uses GitHub's native `Close as not planned` reason instead of `Close as completed`.
- `duplicate` (closure disposition, not a GitHub `type:` label): QA may close the issue directly with `closed: duplicate`, GitHub's native `Close as duplicate` reason, a detailed, evidence-rich closure comment that explains why the superseding issue fully covers the report, and a link to the superseding GitHub issue for traceability.
- `linked contributor PR needs replacement` (operating situation, not a GitHub `type:` label): QA documents why the imported PR is not salvageable, leaves that contributor PR open, and still routes the issue through the normal implementation stages toward a separate maintainer-owned PR.

## Documentation Policy

- Documentation is part of the fix whenever public API, annotations, configuration properties, defaults, behavior, guides, or setup paths change.
- If migration pain is even slightly plausible, write the migration note while change context is still fresh.
- For code issues with documentation impact, keep the original non-docs `type:` label instead of relabeling the work as `type: docs`.
- Before editing docs in a Micronaut repository, identify where guides, reference docs, release notes, and upgrade notes live and how examples or snippets are validated there.
- When a guide, docs, or documentation PR's CI is not needed because the changed documentation is not exercised by the build, include a GitHub CI-skip keyword in the commit message, such as `[skip ci]` for that PR.
- Before opening or updating a guide, docs, or documentation PR, update the work branch from the target branch; if the rebase or merge produces conflicts, record the merge conflict as a blocker and do not open or update a conflicting PR.
- Do not skip CI for documentation tied to build-validated snippets, executable examples, generated guides, `./gradlew publishGuide`, or other docs checks. Record the validation or skip rationale in the PR body or routine report.

## Release Targeting And Branch Rules

- Confirm the correct target repository, approved target branch, and release line before planning or coding.
- QA intake owns release targeting, target-branch selection, and Micronaut organization-project selection. Later stages consume and verify those facts instead of reinventing them from scratch.
- Trust the repository's actual current default branch as the signal for the next intended repository release instead of assuming a generic Micronaut branch strategy, but do not treat the PR target branch as automatically the default branch.
- Determine the next release from the repository's default branch plus the latest stable non-pre-release GitHub release, then compute the SemVer delta from that latest stable release to the next release. That SemVer delta is what decides whether the default branch can be the PR target branch for the issue's `type:` label.
- GitHub prereleases, including milestones such as `4.0.0-M1` and release candidates such as `4.0.0-RC1`, are early-testing releases and do not count as the default branch having already shipped.
- If the latest stable release is `1.2.3`, the default branch is `2.0.x`, and the next release is `2.0.0`, the SemVer delta is major. That default branch may accept `type: bug`, `type: improvement`, `type: enhancement`, docs, CI, build-only changes, and `type: breaking` work with the required Architect and human approvals.
- If the latest stable release is `1.2.3`, the default branch is `1.2.x`, and the next release is `1.2.4`, the SemVer delta is patch. That default branch may accept `type: bug`, `type: improvement`, docs, CI, or build-only changes. `type: enhancement` and `type: breaking` do not fit that patch target branch unless a human-approved release-policy exception identifies a different target.
- If the latest stable release is `1.2.3`, the default branch is `1.3.x`, and the next release is `1.3.0`, the SemVer delta is minor. That default branch may accept `type: bug`, `type: improvement`, `type: enhancement`, docs, CI, or build-only changes. `type: breaking` does not fit that minor target branch unless a human-approved release-policy exception identifies a different target.
- If the current default branch has never been released, it may accept `type: bug`, `type: improvement`, `type: enhancement`, and docs, CI, or build-only changes when the SemVer delta is minor or major. If that unreleased default branch is a new major line such as `5.0.x`, it may also accept `type: breaking` work with the required approvals.
- If the current default branch has already been released and the next release is only a patch, it may accept `type: bug`, `type: improvement`, and docs, CI, or build-only changes. `type: enhancement` and `type: breaking` do not target that branch unless a human-approved release-policy exception exists.
- `type: dependency-upgrade` follows the actual compatibility impact of the resulting repository release, not the label alone.
- If the issue's SemVer impact does not fit the default branch's next release target, QA records that mismatch and routes the issue into planning or governance. Agents may target an alternative branch only when a maintainer, Architect-approved plan, or linked human approval names that alternative target branch and release-policy reason; do not invent or create another target branch during triage just to fit SemVer.
- Micronaut organization projects under `https://github.com/orgs/micronaut-projects/projects` act as release boards for future Micronaut Platform BOM versions, not repository module or project versions.
- QA should choose the best-fit Micronaut organization project set during intake from the open, public Micronaut organization projects (`is:open is:public`) by asking which Micronaut Platform BOM release can first consume the repository release produced by the approved target branch.
- If the approved target branch or release target changes after QA intake, re-check the organization-project set because the earliest Micronaut Platform BOM release that can consume the repository release may also change.
- If a GA release target has both matching milestone or release candidate projects and a GA release board open, select all matching projects so the PR can appear on both prerelease and GA boards; for example, a `5.0.0` target with open `5.0.0-M3` and `5.0.0 Release` projects should select both.
- If the best-fit organization-project choice is somewhat ambiguous, including major-version upgrades that may or may not fit the next Platform minor board cleanly, still choose the best-fit project set and record the ambiguity in the QA artifact so the eventual PR description can repeat it.
- `type: breaking` requires explicit Architect approval and, when necessary, a linked human approval before work proceeds.
- If no matching organization project exists yet, or if the runtime cannot apply the project link, record that gap and continue. Missing organization-project linkage alone does not block PR creation or approval.
- After PR creation, human maintainer project changes win over earlier agent-selected projects. If a maintainer changes, reschedules, or retargets the PR organization project, preserve that live maintainer choice and do not restore, reapply, re-add, or reset the original QA-selected organization project links unless a later maintainer or board decision explicitly asks for it.

## Approval Boundaries

- Board approval always means a real Paperclip approval linked to the relevant issue or proposal, not a free-form comment.
- Paperclip's generic approvals API is the package's source of truth for board approvals. Treat execution-policy `approval` stages as optional live-instance sugar unless their semantics are explicitly verified in that instance.
- QA may publish direct GitHub answers and issue closures for `type: question`, `status: awaiting feedback`, `closed: question`, `closed: cannot reproduce`, `closed: duplicate`, and evidence-backed `already-implemented` closures without separate board approval when the policy conditions are satisfied and the public comment is detailed, evidence-rich, and not short on details.
- Internal routine-created project issues or subtasks with no linked GitHub issue and no public GitHub action may close as verified no-op work without board approval when the owner records the target branch, comparison command or evidence, and why the diff is empty. Do not route that empty-diff no-PR decision through QA verification, Security Engineer, or Code Reviewer solely to prove that no PR should exist.
- Any direct GitHub closure comment must cite the exact facts that justify the closure, such as the clarification request and timeout date, non-reproducer steps and observed results, duplicate overlap with the superseding issue, or the exact version, PR, release, documentation, or policy evidence. Do not post a short generic close note.
- QA does not publish other policy-exception proposals on GitHub until the linked approval exists.
- Do not create a board approval whose only purpose is to close an inadequate contributor PR. Leave contributor PRs open and continue with a separate maintainer-owned PR when replacement work is necessary.
- Only the board or other Micronaut maintainers merge PRs or cut releases.
- Agents may prepare, label, comment, close, and create PRs when their role allows it, but they do not merge or release.
- For PR-based delivery work, agents do not transition the synced Paperclip issue to `DONE` themselves. The GitHub sync plugin transitions it to `DONE` after the linked PR merges.
- When QA closes a synced GitHub issue directly, agents still do not close the Paperclip issue manually. The GitHub sync plugin transitions it after the closure sync arrives.
- Paperclip issue blockers and execution policies for synced GitHub delivery items are runtime controls. Configure them in the live Paperclip instance or sync layer rather than trying to encode them in this package.
