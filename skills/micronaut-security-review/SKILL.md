---
name: micronaut-security-review
description: Security review checklist for Micronaut source code, dependencies, build logic, CI/CD, release automation, and secure-default changes.
---

# Micronaut Security Review

Use this skill whenever work changes executable code, dependencies, build logic, CI/CD, release automation, secrets handling, security-sensitive configuration, or security-sensitive docs in a Micronaut repository.

## Session Start

Before you review:

1. Open the Paperclip issue, current execution stage, latest linked GitHub context, and any prior QA or Architect artifact.
2. Continue only if you are the current stage participant for security review, the issue returned `changes_requested` to security review, or the weekly deep-scan routine invoked you.
3. If another stage participant or a human approval is active, stop and leave routing unchanged.
4. Read `executionState.returnAssignee` before you decide whether a finding should return to the executor as `changes_requested`.
5. Decide whether you are in issue-review mode or weekly deep-scan mode before you inspect anything.

## Review Scope

- Java, Groovy, or Kotlin code paths that process untrusted input
- HTTP, serialization, deserialization, reflection, dynamic loading, filesystem, process, and outbound-network surfaces
- authentication, authorization, token or session, and secret handling
- Gradle wrapper, version catalogs, plugins, build scripts, generated code, annotation processors, and publishing or release workflows
- GitHub Actions or other CI/CD automation, especially permissions, secret exposure, and supply-chain pinning
- docs or examples that could encourage insecure defaults

## Threat Questions

- Can untrusted input reach a dangerous sink without validation, escaping, or authorization?
- Could the change leak secrets, tokens, sensitive config, or user data through logs, errors, metrics, or docs?
- Does it introduce unsafe defaults or widen exposure that users will inherit silently?
- Does the dependency, build, or CI change increase supply-chain risk or grant more privilege than necessary?
- Is there a smaller hardening change that preserves compatibility while reducing risk?

## Possible Outcomes

- `approved`: the stage artifact explains why the work is safe enough for the next review stage to proceed.
- `changes_requested`: the stage artifact identifies a concrete vulnerability, insecure default, leaked secret, excessive permission, or other plausible exploit path that must be fixed before the work can advance.

## Role Boundary

- QA owns acceptance against the plan or reproducer.
- Security Engineer owns the dedicated security gate.
- Code Reviewer owns maintainability, performance, developer experience, and PR quality after security sign-off.

## Finish Verification

Before you stop:

1. Re-open the issue and confirm the current execution state matches your chosen outcome.
2. If you approved the stage, confirm the current stage participant is no longer you.
3. If another execution-policy stage remains, confirm the issue is still in `in_review` and the next `currentParticipant` is correct.
4. If you requested changes, confirm the issue execution state shows `changes_requested` and your artifact names the exact remediation or compensating control.
5. If the next stage or next owner should start immediately, explicitly invoke the next heartbeat only after the stage or assignment is already correct instead of assuming the new reviewer was woken automatically.
6. If you touched GitHub review threads, confirm the replies or thread state changes exist.

## Weekly Deep Scan Mode

When invoked by the `weekly-security-deep-scan` routine:

- inspect recent code changes, open PRs, default branches, dependency movement, Gradle wrapper or plugin changes, build logic, CI/CD permissions, release automation, and security-sensitive docs
- deduplicate every finding against existing synced GitHub issues or PRs with `paperclip-github-plugin:search_repository_items`
- record what was inspected, what is already tracked, and what still needs follow-up
- if a new vulnerability does not already have a synced GitHub issue or PR, prepare a maintainer-ready Paperclip escalation instead of improvising unsupported GitHub issue creation
