# Technical Writer Routines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add weekly Technical Writer guide routines, move all recurring routines to overnight Madrid schedules, make PM discovery weekly, and add docs-only CI-skip guidance.

**Architecture:** This is a package contract update. The implementation changes routine task files, `.paperclip.yaml`, agent/skill guidance, docs, and focused Node tests so Paperclip import/export verification catches drift.

**Tech Stack:** Markdown frontmatter, `.paperclip.yaml`, Node.js built-in test runner, `yaml`, Paperclip import verification.

---

## Task 1: Contract Tests

**Files:**
- Modify: `scripts/product-manager-routine.test.mjs`
- Modify: `scripts/ceo-training-routine.test.mjs`
- Modify: `scripts/ceo-self-improvement-policy.test.mjs`
- Create: `scripts/technical-writer-routines.test.mjs`
- Modify: `package.json`

- [ ] Update PM tests to expect `weekly-product-discovery`, label `Weekly Product Discovery`, and cron `0 1 * * 1`.
- [ ] Update CEO tests to expect Training cron `0 2 */2 * *` and CEO self-improvement cron `0 3 * * *`.
- [ ] Add Technical Writer routine tests covering `weekly-user-guide-review`, `weekly-guide-topic-discovery`, Technical Writer `guides` skill assignment, `skills/guides` source metadata, routine bodies, and CI-skip guidance.
- [ ] Add the new test to `test:unit` and `test:node22`.
- [ ] Run `node --test scripts/product-manager-routine.test.mjs scripts/ceo-training-routine.test.mjs scripts/ceo-self-improvement-policy.test.mjs scripts/technical-writer-routines.test.mjs`; expect failure before implementation.

## Task 2: Routines And Skills

**Files:**
- Rename: `tasks/daily-product-discovery/TASK.md` to `tasks/weekly-product-discovery/TASK.md`
- Create: `tasks/weekly-user-guide-review/TASK.md`
- Create: `tasks/weekly-guide-topic-discovery/TASK.md`
- Create: `skills/guides/SKILL.md`
- Modify: `.paperclip.yaml`
- Modify: `agents/product-manager/AGENTS.md`
- Modify: `agents/technical-writer/AGENTS.md`

- [ ] Rename Product Discovery task and body from daily to weekly.
- [ ] Add active overnight schedule entries for all routines:
  - `weekly-product-discovery`: `0 1 * * 1`
  - `weekly-security-deep-scan`: `0 1 * * 2`
  - `weekly-user-guide-review`: `0 1 * * 3`
  - `weekly-guide-topic-discovery`: `0 1 * * 4`
  - `training`: `0 2 */2 * *`
  - `daily-ceo-self-improvement`: `0 3 * * *`
- [ ] Add Technical Writer guide review routine instructions for `./gradlew publishGuide`, end-to-end guide reading, fact-checking with throwaway apps, fact-checking proposed fixes, delta-only review after the first run, and direct PR creation for validated fixes.
- [ ] Add Technical Writer guide topic discovery routine instructions for using the upstream `guides` skill, missing topic discovery, deduplication, and PR creation.
- [ ] Add `guides` to Technical Writer skills and create a referenced `skills/guides/SKILL.md`.
- [ ] Add docs-only CI-skip guidance to Technical Writer instructions.

## Task 3: Docs And Shared Guidance

**Files:**
- Modify: `README.md`
- Modify: `COMPANY.md`
- Modify: `skills/micronaut-repo-operations/SKILL.md`
- Modify: `tasks/verify-imported-company-instance/TASK.md`
- Modify: `tasks/training/TASK.md`

- [ ] Update routine tables and summaries to list six routines and the overnight schedules.
- [ ] Update bootstrap verification to check Weekly Product Discovery, Weekly User Guide Review, Weekly Guide Topic Discovery, and `guides`.
- [ ] Update Training to inspect guide-routine executions as part of Technical Writer evidence.
- [ ] Add shared docs-only CI-skip guidance for unexercised documentation changes, while preserving validation for build-exercised docs.

## Task 4: Verification And PR Follow-Up

**Files:**
- Read/verify all changed files.

- [ ] Run focused tests from Task 1 and fix failures.
- [ ] Run `npm run test:unit`.
- [ ] Run `node scripts/verify-paperclip-import.mjs`.
- [ ] Run `npm test`.
- [ ] Commit the implementation.
- [ ] Push the branch, check PR #56 CI and review threads, reply/resolve any addressed comments.

## Self-Review Notes

- Spec coverage: the tasks cover schedules, two new Technical Writer routines, PM weekly rename, guides skill, CI-skip guidance, docs, bootstrap/training coverage, and verification.
- Placeholder scan: no unresolved placeholders.
- Type consistency: routine slugs are `weekly-product-discovery`, `weekly-user-guide-review`, and `weekly-guide-topic-discovery`; Technical Writer skill slug is `guides`.
