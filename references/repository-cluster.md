# Repository Cluster Charter

Update this file first after importing the company. It is the source of truth for what this Paperclip company is allowed to touch. It complements `references/issue-lifecycle.md`, which defines the company-wide workflow.

## Cluster Mission

Describe the repository subset this company owns and why these repositories belong together.

Example prompts:

- "Core framework maintenance for the repositories that define the main Micronaut runtime and its public programming model."
- "Data and persistence maintenance for the Micronaut modules that support database access, repository APIs, and common integrations."
- "Security and auth maintenance for the repositories that shape authentication, authorization, and security-related docs."

## Inbox Zero Definition For This Cluster

Write the concrete definition here. Suggested baseline:

- every synced issue or PR has an owner and next action
- no untriaged item remains after the active sweep
- stale, duplicate, superseded, or out-of-scope work is closed with an explanation
- actionable items are routed through the company pipeline without bypassing QA or architecture
- new synced issues land in `BACKLOG` assigned to `qa-engineer`
- only humans move items from `BACKLOG` to `TODO`

## Repository Inventory

| Repository | Purpose | Default Branch | Latest Stable Release | Supported Release Lines | Docs Surface | Main Verification Commands | Sonar / CI Notes | Sync Mapping Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fill-me | fill-me | fill-me | fill-me | fill-me | fill-me | fill-me | fill-me | fill-me |

## Shared Constraints

- Sync plugin defaults:
- Required `type:` labels present in GitHub:
- JDK versions:
- Gradle expectations:
- Release or backport policy:
- How to compute the next release from default branch plus latest stable release:
- Compatibility promises:
- Docs system notes:
- Sonar quality gate expectations:
- CI or flaky-test hotspots:
- Human maintainer preferences or escalation paths:
- Board approval conventions:

## Current Risks Or Watch Items

- Fill in current pain points that should influence prioritization.
