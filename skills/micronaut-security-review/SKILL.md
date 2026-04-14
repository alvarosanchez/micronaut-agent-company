---
name: micronaut-security-review
description: Security review checklist for Micronaut source code, dependencies, build logic, CI/CD, release automation, and secure-default changes.
---

# Micronaut Security Review

Use this skill whenever work changes executable code, dependencies, build logic, CI/CD, release automation, secrets handling, security-sensitive configuration, or security-sensitive docs in a Micronaut repository.

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

## Findings Standard

- Block on concrete vulnerabilities, unsafe defaults, leaked secrets, excessive permissions, or plausible abuse cases.
- Do not block on speculative concerns with no credible exploit path or maintainer action.
- When possible, propose the smallest safe remediation.
- If the fix requires an architectural or release-line decision, escalate to Architect.
- Low-risk docs-only changes may be fast-passed, but still check whether they recommend insecure deployment or configuration patterns.

## Role Boundary

- QA owns acceptance against the plan or reproducer.
- Security Engineer owns the dedicated security gate.
- Code Reviewer owns maintainability, performance, developer experience, and PR quality after security sign-off.

## Weekly Deep Scan Mode

When invoked by the `weekly-security-deep-scan` routine, expand the scope beyond one issue or PR:

- inspect recent code changes, open PRs, default branches, dependency movement, Gradle wrapper or plugin changes, build logic, CI/CD permissions, release automation, and security-sensitive docs
- deduplicate every finding against existing synced GitHub issues or PRs with `search_repository_items`
- record what was inspected, what is already tracked, and what still needs follow-up
- if a new vulnerability does not already have a synced GitHub issue or PR, prepare a maintainer-ready Paperclip escalation instead of improvising unsupported GitHub issue creation
