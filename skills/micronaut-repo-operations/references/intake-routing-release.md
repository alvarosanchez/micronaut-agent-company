# Intake Routing Release

Detailed reference extracted from `micronaut-repo-operations` so the primary skill can stay a compact router. These rules remain runtime guidance when this reference is loaded for the matching work mode.

## Authoritative QA Intake Artifact

The GitHub issue type is only the surface label. QA is the authoritative risk classifier and writes a stable `qa-intake` issue document before selecting a route. Keep these exact headings and fields so policies and later agents do not infer risk from the label alone. `planningRequired`, `securityPrecheckRequired`, and `securityFinalReviewRequired` are composable booleans. `planningRequired` is the sole authority for whether Architect appears: `true` requires Architect in `stageSequence`, while `false` forbids Architect. Security-sensitive work sets both Security booleans to `true`. `stageSequence` is the authoritative ordered route and must agree with all three booleans and the matrix below.

<!-- qa-intake-schema -->
```yaml
deliveryClass: routine | architectural | security-sensitive | documentation
planningRequired: true | false
planningReason: <bounded evidence-based reason or "not required">
securityPrecheckRequired: true | false
securityFinalReviewRequired: true | false
deliveryOwner: micronaut-engineer | technical-writer
followThroughOwner: micronaut-engineer | technical-writer
verificationProfile: source | dependency | docs-prose | docs-executable
stageSequence:
  - <ordered agent slug, including qa-engineer for intake and verification>
evidenceReproduction: <reproducer, prior art, or documentation evidence>
acceptanceCriteria: <observable pass conditions>
```

Also retain repository, release, target-branch, compatibility, project-board, linked-PR, and closure facts required elsewhere in this reference. `deliveryOwner` and `followThroughOwner` must be identical and agree with the artifact being changed: Engineer owns source, tests, dependencies, builds, package scripts, adapters, and plugins; Writer owns prose docs, guides, repository `AGENTS.md`, company role instructions, and textual control-plane changes. The delivery owner creates or updates the PR before QA verification and remains its follow-through owner.

## Risk-Classified Stage Layouts

The following YAML is the canonical semantic route matrix. Repeated `qa-engineer` entries mean intake and post-implementation verification respectively. Security is conditional: only security-sensitive routes use its pre-triage and final-review gates. Routine non-security executable work and prose-only docs omit Security.

<!-- workflow-routing-matrix -->
```yaml
routine-bug: [qa-engineer, micronaut-engineer, qa-engineer, code-reviewer]
architecture-sensitive-bug: [qa-engineer, architect, micronaut-engineer, qa-engineer, code-reviewer]
routine-dependency-upgrade: [qa-engineer, micronaut-engineer, qa-engineer, code-reviewer]
migration-dependency-upgrade: [qa-engineer, architect, micronaut-engineer, qa-engineer, code-reviewer]
security-sensitive-source: [qa-engineer, security-engineer, micronaut-engineer, qa-engineer, security-engineer, code-reviewer]
security-sensitive-architectural-source: [qa-engineer, security-engineer, architect, micronaut-engineer, qa-engineer, security-engineer, code-reviewer]
prose-docs: [qa-engineer, technical-writer, qa-engineer, code-reviewer]
executable-docs: [qa-engineer, technical-writer, qa-engineer, code-reviewer]
security-sensitive-docs: [qa-engineer, security-engineer, technical-writer, qa-engineer, security-engineer, code-reviewer]
workflow-authority-docs: [qa-engineer, architect, technical-writer, qa-engineer, code-reviewer]
security-sensitive-workflow-authority-docs: [qa-engineer, security-engineer, architect, technical-writer, qa-engineer, security-engineer, code-reviewer]
feature: [qa-engineer, architect, micronaut-engineer, qa-engineer, code-reviewer]
```

Security-sensitive means the change affects authentication, authorization, secrets, cryptography, untrusted input, serialization boundaries, filesystem access, process execution, network trust, a known or suspected dependency vulnerability, dependency provenance, CI permissions, release credentials, or secure defaults and security guidance. Merely changing executable code, build logic, dependencies, or examples is not by itself a Security trigger.

- Routine localized bug: QA intake -> Micronaut Engineer -> QA verification -> Code Reviewer. It skips Architect and Security.
- Architecture-sensitive bug: QA intake -> Architect -> Micronaut Engineer -> QA verification -> Code Reviewer. Require Architect for cross-module or cross-repository impact; public API, serialization, or protocol compatibility; concurrency, lifecycle, or transaction semantics; structural performance tradeoffs; build or native-image interactions; multiple materially different fixes; contradictory intended behavior; or a failed implementation that exposes a design gap. Add both Security stages only when a Security trigger also applies.
- Routine compatible dependency upgrade: QA intake -> Micronaut Engineer -> QA verification -> Code Reviewer. It skips Architect and Security.
- Architectural or migration dependency upgrade: QA intake -> Architect -> Micronaut Engineer -> QA verification -> Code Reviewer. Require Architect for a major upgrade; public API or configuration migration; BOM, platform, language, or build baseline movement; lifecycle, threading, native-image, or annotation-processing effects; multi-module impact; broad transitive replacement; a compatibility matrix; or disputed strategy. Add both Security stages only when a Security trigger also applies.
- Security-sensitive bug or dependency upgrade: QA intake -> Security Engineer pre-triage -> Architect only when architecture or compatibility planning is needed -> Micronaut Engineer -> QA verification -> Security Engineer final review -> Code Reviewer. Security pre-triage never replaces final security review.
- Prose-only docs: QA intake -> Technical Writer -> QA verification -> Code Reviewer. This reduced route has no Security stage.
- Routine executable docs: QA intake -> Technical Writer -> QA verification -> Code Reviewer. Executability selects `docs-executable` verification but does not itself trigger Security, so routine non-security examples omit Security.
- Security-sensitive docs: QA intake -> Security Engineer pre-triage -> Technical Writer -> QA verification -> Security Engineer final review -> Code Reviewer. Add Architect after pre-triage only when `planningRequired` is true.
- Mechanical or stale repository `AGENTS.md`: CEO finding -> QA intake -> Technical Writer -> QA verification -> Code Reviewer. Workflow or authority semantics set `planningRequired: true` and add Architect before Writer; security-triggering authority or tool changes add both Security stages.
- Features and breaking changes: QA intake -> Architect -> implementation owner -> QA verification -> Code Reviewer. Add both Security stages only when a Security trigger applies.
- `type: question`, clarification wait paths, unreproducible bug closures, duplicate closures, and already-implemented closures: QA intake, with QA publishing the evidence-backed disposition and waiting for sync.

QA encodes the selected sequence in the issue execution policy and records why optional Architect and Security stages are present or absent. Implementation may escalate an exposed design gap back to Architect; unresolved behavior, compatibility, or security questions are escalations, never permission to improvise.

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

Issue type identifies the surface; the stable `qa-intake` classification selects the route.

- `type: bug`: QA reproduces first. Routine localized bugs skip Architect; architecture-sensitive bugs use the Architect triggers in **Risk-Classified Stage Layouts**. Unreproducible bugs may use the evidence-backed direct closure path.
- `type: dependency-upgrade`: routine compatible upgrades skip Architect; architectural, migration-bearing, or security-sensitive upgrades use the corresponding route and triggers above.
- `type: improvement`, `type: enhancement`, and `type: breaking`: QA routes through Architect before the selected implementation owner.
- `type: docs`: QA selects `docs-prose` or `docs-executable`; both routine non-security routes use Writer -> QA -> Reviewer, while security-sensitive docs add Security pre-triage before Writer and final Security review before Reviewer.
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
