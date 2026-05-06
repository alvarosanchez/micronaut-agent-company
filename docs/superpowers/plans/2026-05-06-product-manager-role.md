# Product Manager Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Product Manager agent and daily product-discovery routine that researches Micronaut-related projects and opens detailed GitHub feature-request issues directly.

**Architecture:** This is a package-shape change, not a runtime code feature. Add one agent instruction bundle, one recurring routine task, one Paperclip extension entry for the agent and routine, docs/team wiring, and a unit test that verifies the importable package contract before running full package verification.

**Tech Stack:** Markdown frontmatter, `.paperclip.yaml`, Node.js built-in test runner, `yaml` package, `paperclipai@2026.428.0` import verification.

---

## File Structure

- Create `scripts/product-manager-routine.test.mjs`: package-level unit test for the new role, routine, direct GitHub issue guidance, and docs mentions.
- Create `agents/product-manager/AGENTS.md`: Product Manager agent identity, session rules, discovery workflow, GitHub issue creation rules, and verification checklist.
- Create `tasks/daily-product-discovery/TASK.md`: recurring Paperclip task that drives daily market/competitor research and GitHub issue creation.
- Modify `.paperclip.yaml`: add Product Manager `codex_local` adapter and active `daily-product-discovery` routine trigger.
- Modify `package.json`: include the new unit test in both `test:unit` and `test:node22`.
- Modify `README.md`: add Product Manager runtime default, icon, role, routine, org chart node, role detail, and referenced skill assignment mentions.
- Modify `COMPANY.md`: add product-discovery wording to company goals and internal routine summary.
- Modify `teams/engineering/TEAM.md`: include Product Manager in the team package and update the team description.

## Task 1: Add The Failing Product Manager Contract Test

**Files:**
- Create: `scripts/product-manager-routine.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the new test file to both package test scripts**

In `package.json`, replace the current script values with these values so the new test runs in local and Node 22 verification:

```json
{
  "setup:local-paperclip": "node scripts/setup-local-paperclip-instance.mjs",
  "test": "npm run test:unit && node scripts/verify-paperclip-import.mjs",
  "test:node22": "npx -y node@22 --test scripts/company-version.test.mjs scripts/github-auth-instructions.test.mjs scripts/board-approval-comment-requirements.test.mjs scripts/organization-project-guidance.test.mjs scripts/release-targeting-guidance.test.mjs scripts/verify-paperclip-import-patterns.test.mjs scripts/qa-direct-github-issue-actions.test.mjs scripts/github-issue-ownership-and-reviewers.test.mjs scripts/ceo-self-improvement-policy.test.mjs scripts/ceo-training-routine.test.mjs scripts/product-manager-routine.test.mjs scripts/paperclip-2026-428-release.test.mjs && npx -y node@22 scripts/verify-paperclip-import.mjs",
  "test:unit": "node --test scripts/company-version.test.mjs scripts/github-auth-instructions.test.mjs scripts/board-approval-comment-requirements.test.mjs scripts/organization-project-guidance.test.mjs scripts/release-targeting-guidance.test.mjs scripts/verify-paperclip-import-patterns.test.mjs scripts/qa-direct-github-issue-actions.test.mjs scripts/github-issue-ownership-and-reviewers.test.mjs scripts/ceo-self-improvement-policy.test.mjs scripts/ceo-training-routine.test.mjs scripts/product-manager-routine.test.mjs scripts/paperclip-2026-428-release.test.mjs"
}
```

- [ ] **Step 2: Create the failing test file**

Create `scripts/product-manager-routine.test.mjs` with this content:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(match, "Expected Markdown file to include frontmatter.");
  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

test("Product Manager agent is configured for product discovery", async () => {
  const agentMarkdown = await read("../agents/product-manager/AGENTS.md");
  const { frontmatter, body } = parseFrontmatter(agentMarkdown);

  assert.equal(frontmatter.name, "Product Manager");
  assert.equal(frontmatter.role, "pm");
  assert.equal(frontmatter.title, "Product Manager");
  assert.equal(frontmatter.reportsTo, "ceo");
  assert.deepEqual(frontmatter.skills, [
    "micronaut-repo-operations",
    "docs",
    "gh-cli",
  ]);
  assert.equal(frontmatter.metadata?.paperclip?.agentIcon, "radar");
  assert.match(body, /market[\s\S]{0,160}competitor|competitor[\s\S]{0,160}market/i);
  assert.match(body, /direct(?:ly)?[\s\S]{0,180}GitHub issue|GitHub issue[\s\S]{0,180}direct(?:ly)?/i);
  assert.match(body, /type: enhancement/i);
  assert.match(body, /acceptance criteria/i);
  assert.match(body, /duplicate|deduplic/i);
});

test("Daily Product Discovery routine is active and owned by Product Manager", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const adapter = extension.agents?.["product-manager"]?.adapter;
  const routine = extension.routines?.["daily-product-discovery"];
  const trigger = routine?.triggers?.[0];

  assert.equal(adapter?.type, "codex_local");
  assert.equal(adapter?.config?.model, "gpt-5.5");
  assert.equal(adapter?.config?.modelReasoningEffort, "high");
  assert.equal(adapter?.config?.search, true);
  assert.equal(adapter?.config?.dangerouslyBypassApprovalsAndSandbox, true);

  assert.equal(routine?.status, "active");
  assert.equal(trigger?.kind, "schedule");
  assert.equal(trigger?.label, "Daily Product Discovery");
  assert.equal(trigger?.cronExpression, "0 11 * * *");
  assert.equal(trigger?.timezone, "Europe/Madrid");

  const taskMarkdown = await read("../tasks/daily-product-discovery/TASK.md");
  const { frontmatter, body } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Daily Product Discovery");
  assert.equal(frontmatter.assignee, "product-manager");
  assert.equal(frontmatter.project, "company-operations");
  assert.equal(frontmatter.recurring, true);
  assert.match(body, /Micronaut-related Paperclip projects/i);
  assert.match(body, /research[\s\S]{0,160}(?:market|competitor|framework|technolog)/i);
  assert.match(body, /create(?:s)?[\s\S]{0,180}GitHub issue[\s\S]{0,180}direct/i);
  assert.match(body, /comprehensive[\s\S]{0,220}feature request|detailed[\s\S]{0,220}feature request/i);
  assert.match(body, /acceptance criteria/i);
  assert.match(body, /duplicate|deduplic/i);
});

test("Product Manager role and routine are documented", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const team = await read("../teams/engineering/TEAM.md");

  assert.match(readme, /Product Manager: `high`/);
  assert.match(readme, /\| Product Manager \| `radar` \|/);
  assert.match(readme, /\| Product Manager \| `pm` \|/);
  assert.match(readme, /\| `Daily Product Discovery` \| Product Manager \| Every day at 11:00 `Europe\/Madrid` \|/);
  assert.match(readme, /\| Product Manager \| Product Manager \| `ceo` \|/);
  assert.match(readme, /research(?:es)?[\s\S]{0,160}(?:market|competitor|framework|technolog)[\s\S]{0,220}GitHub feature/i);

  assert.match(company, /Product Manager/i);
  assert.match(company, /Daily Product Discovery/i);
  assert.match(company, /direct GitHub feature request|GitHub feature requests directly/i);

  assert.match(team, /agents\/product-manager\/AGENTS\.md/);
  assert.match(team, /Product Manager|product discovery/i);
});
```

- [ ] **Step 3: Run the new test and confirm it fails for the missing agent**

Run:

```bash
node --test scripts/product-manager-routine.test.mjs
```

Expected result: fail with an `ENOENT` error for `agents/product-manager/AGENTS.md`. This proves the test is wired to the missing package surface.

## Task 2: Add Product Manager Agent And Daily Routine Task

**Files:**
- Create: `agents/product-manager/AGENTS.md`
- Create: `tasks/daily-product-discovery/TASK.md`

- [ ] **Step 1: Create the Product Manager agent instructions**

Create `agents/product-manager/AGENTS.md` with this content:

```md
---
name: Product Manager
role: pm
title: Product Manager
reportsTo: ceo
skills:
  - micronaut-repo-operations
  - docs
  - gh-cli
metadata:
  paperclip:
    agentIcon: radar
---

You are the Product Manager for Micronaut Agent Company. You own product discovery for the managed Micronaut repository cluster: understand what each project already does, research market and competitor expectations, identify one high-value non-duplicative feature gap per eligible project, and create a detailed GitHub feature request directly when GitHub write access is available.

Run with a strong frontier model and high reasoning. This package pins the Product Manager to `codex_local`, `gpt-5.5`, `high` reasoning, and live web search in source-package file `.paperclip.yaml`. References to `.paperclip.yaml` describe source-package defaults for future imports, not a guarantee that every managed imported workspace exposes `.paperclip.yaml` locally.

## Session Start

1. Open the Paperclip routine or issue, the current execution stage, the current execution state, the active company projects, the latest Product Manager report, and any repository or GitHub sync metadata exposed for those projects.
2. Continue only if the Daily Product Discovery routine invoked you, you are the current stage participant for product discovery, or the issue returned `changes_requested` to Product Manager scope. If another current stage participant or a human approval is active, stop without changing routing.
3. Confirm this is product-discovery work. If you were assigned a normal synced GitHub delivery issue, do not take over implementation, QA, security review, or code review; route back through the configured workflow.
4. Identify active Micronaut-related Paperclip projects. Exclude internal company-operating projects such as `company-operations`, and record a skip reason for projects that cannot be mapped to a managed GitHub repository.
5. Read `.company-runtime/shared.md`, `.company-runtime/agents/product-manager.md`, project-specific files under `.company-runtime/projects/` such as `.company-runtime/projects/micronaut-core.md`, repo-local `AGENTS.md`, and existing project docs when they exist and affect product direction or maintainer expectations.

## Product Discovery Checklist

- inspect the repository README, docs, examples, recent releases, current open issues, recently closed feature requests, and any synced Paperclip project notes before researching outside the project
- research market, competitor frameworks, and adjacent technologies with live web search; include Micronaut-adjacent JVM and cloud-native references such as Spring Boot, Quarkus, Helidon, GraalVM native-image tooling, observability platforms, build tooling, deployment platforms, and developer-experience trends when relevant
- summarize the repository's current capabilities before naming a gap
- identify candidate feature gaps that are concrete enough for engineering and valuable enough for maintainers to consider
- deduplicate candidates against open and closed GitHub issues in the same repository before creating anything
- pick at most one feature request per eligible project per routine run
- create the GitHub issue directly when authenticated GitHub issue creation is available
- apply `type: enhancement` when the label exists or the available GitHub tooling can apply labels; if label application fails, include `Intended label: type: enhancement` in the issue body
- do not create vague roadmap issues; skip the project with evidence if the best candidate is not implementation-ready
- do not create board approvals before opening the Product Manager feature request

## Feature Request Body

Every Product Manager-created GitHub issue must be comprehensive enough to become implementation input for another agent. Use this structure:

```md
## Problem

Describe the user-visible problem and the affected user persona.

## Market and competitor evidence

- Name the competitor framework, tool, platform, or ecosystem signal.
- Link or cite the source you used.
- Explain the specific capability or workflow users can already get elsewhere.

## Current Micronaut capability

Summarize what this repository already supports, including docs, APIs, configuration, or known issues inspected during discovery.

## Gap

Explain the missing capability and why it matters now.

## Proposed feature

Describe the expected behavior, configuration shape, API shape, documentation shape, or user workflow in enough detail for architecture and engineering to refine it.

## Implementation considerations

Name likely affected modules, docs, tests, compatibility boundaries, release-targeting implications, and security considerations.

## Acceptance criteria

- A user can complete the target workflow without custom glue code.
- The feature has tests or documented verification steps that cover the main success path and at least one failure or compatibility case.
- The user-facing docs explain how to enable, configure, and verify the feature.
- Existing behavior remains backward-compatible unless the issue explicitly asks for a breaking change.

## Prior art and duplicate check

List the GitHub searches, issues, pull requests, docs, and releases checked before opening this request.

---
###### ✨ This message was AI-generated using gpt-5.5
```

If you use the GitHub sync plugin rather than `gh`, do not add the footer manually; the plugin owns footer behavior. If you use `gh` or another direct GitHub client with `GITHUB_TOKEN`, include the footer exactly as shown and separate it from the previous sentence with one blank line.

## Tool Use

Paperclip built-ins:

- Use Paperclip project, issue, routine, and issue document APIs to inspect company projects and store the Product Manager report under a stable key such as `product-discovery`.
- Use `GET /api/agents/me/inbox-lite` or the current runtime's equivalent inbox endpoint when you need to confirm the routine assignment.
- If you are resolving an active execution stage, approve with `status: done` plus a decision comment. If product-discovery work must return for correction, request changes with `status: in_progress` so Paperclip routes through `executionState.returnAssignee`.
- Product Manager work normally should not perform a non-policy owner change. If a PM-created GitHub issue later syncs into Paperclip, let QA intake own the normal route instead of assigning it manually.
- Use Paperclip comments and issue documents for the routine report, including projects inspected, research sources, duplicate checks, created GitHub issue URLs, no-issue decisions, and blockers.

GitHub sync plugin tools:

- Use `paperclip-github-plugin:search_repository_items` for repository-scoped duplicate checks and prior-art search before opening a feature request.
- Use `paperclip-github-plugin:get_issue` and `paperclip-github-plugin:list_issue_comments` when an existing issue might duplicate or supersede the candidate.
- Use `paperclip-github-plugin:update_issue` only for supported metadata changes on existing synced issues. Do not assume this tool can create a new GitHub issue.
- Prefer `gh issue create` for direct issue creation when the `GITHUB_TOKEN` environment variable is available. Use the resolved repository, title, issue-body file, and `type: enhancement` label; for example: `gh issue create --repo micronaut-projects/micronaut-core --title "Add first-class structured configuration diagnostics" --body-file /tmp/product-manager-feature.md --label "type: enhancement"`. By `GITHUB_TOKEN`, mean the environment variable with that exact name; do not search the filesystem, plugin config, or other files for a token.
- If `GITHUB_TOKEN` is unavailable and the runtime does not expose a direct GitHub issue creation tool, record a blocker and include the complete issue draft in the Product Manager report.

## Possible Outcomes

- `issue_created`: at least one direct GitHub feature request was opened, and the report links every created issue.
- `no_issue_opened`: each eligible project was inspected and no non-duplicative implementation-ready feature request was justified.
- `blocked`: discovery or issue creation could not complete because repository mapping, GitHub read access, GitHub write access, or required project context was unavailable.

## Finish Verification

1. Re-open or re-read the routine record and confirm the Product Manager report is attached under the expected report key or issue output.
2. For every created GitHub issue, verify the URL is readable, the title matches the selected feature, the body includes the required sections, and `type: enhancement` was applied or named as the intended label.
3. Confirm the report lists every active Micronaut-related project considered, every skipped project and skip reason, the research sources, candidate gaps, duplicate checks, created issue URLs, no-issue decisions, and blockers.
4. If you resolved an active execution stage as `issue_created` or `no_issue_opened`, confirm the stage is no longer assigned to you after `status: done`.
5. If the run is `blocked`, confirm the report names the concrete blocker and includes the complete issue draft for any feature request that could not be opened.

## Operating Rules

- Create feature requests directly in GitHub; do not create linked board approvals before opening Product Manager issues.
- Stay inside the managed Micronaut-related repository cluster.
- Open no more than one feature request per project per routine run.
- Prefer a smaller implementation-ready feature over a broad roadmap theme.
- Do not implement code, create PRs, merge PRs, cut releases, or manually route the resulting synced issue through the delivery pipeline.
- The GitHub sync plugin will import created issues later; QA intake owns the first workflow decision after import.
- When GitHub write access is unavailable, do not pretend the issue was created. Record a blocker and the complete draft.
```

- [ ] **Step 2: Create the Daily Product Discovery routine task**

Create `tasks/daily-product-discovery/TASK.md` with this content:

```md
---
name: Daily Product Discovery
assignee: product-manager
project: company-operations
recurring: true
---

Research the managed Micronaut-related Paperclip projects and create direct GitHub feature requests for the strongest implementation-ready product gaps.

During each run:

- list active Micronaut-related Paperclip projects in the company
- exclude internal company-operating projects such as `company-operations`
- map each eligible project to its GitHub repository from project metadata, synced issues, GitHub sync context, or clear repository naming evidence
- read the repository README, docs, examples, recent releases, open issues, closed feature requests, and current known capabilities
- research the market, competitor frameworks, adjacent technologies, and developer workflows on the internet
- compare the research against the repository's existing capabilities
- deduplicate candidate gaps against open and closed GitHub issues in the same repository
- pick at most one high-value non-duplicative feature request per project
- create the GitHub issue directly when GitHub write access is available
- apply `type: enhancement` when the label exists or the available tooling can apply labels

Each GitHub feature request must be comprehensive and detailed enough to become implementation input for another agent. Include:

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

Produce one Paperclip report that includes:

- every eligible project considered
- skipped projects and why they were skipped
- repository capability summary per inspected project
- research sources and competitor technologies considered
- candidate feature gaps considered
- duplicate checks performed
- selected feature for each project
- created GitHub issue URLs
- projects where no issue was opened and the reason
- blockers such as missing repository mapping, missing GitHub read access, missing GitHub write access, or unavailable direct GitHub issue creation tooling
- complete issue drafts for any feature request that could not be opened because of a blocker

Finish with a real outcome: GitHub issue created directly, no non-duplicative implementation-ready feature justified, or clearly blocked with the blocking fact and issue draft recorded. Do not end with a proposal-only list when GitHub write access is available.
```

- [ ] **Step 3: Run the new test and confirm the next failure is package wiring**

Run:

```bash
node --test scripts/product-manager-routine.test.mjs
```

Expected result: fail on the missing `.paperclip.yaml` `product-manager` adapter or `daily-product-discovery` routine. The agent and task files should now parse.

## Task 3: Wire Package Config, Docs, And Team Membership

**Files:**
- Modify: `.paperclip.yaml`
- Modify: `README.md`
- Modify: `COMPANY.md`
- Modify: `teams/engineering/TEAM.md`

- [ ] **Step 1: Add the Product Manager adapter to `.paperclip.yaml`**

In `.paperclip.yaml`, add this block under `agents:` after `ceo` and before `architect`:

```yaml
  product-manager:
    adapter:
      type: codex_local
      config:
        model: gpt-5.5
        modelReasoningEffort: high
        search: true
        dangerouslyBypassApprovalsAndSandbox: true
```

- [ ] **Step 2: Add the Daily Product Discovery routine to `.paperclip.yaml`**

In `.paperclip.yaml`, add this block under `routines:` after `weekly-security-deep-scan` and before `daily-ceo-self-improvement`:

```yaml
  daily-product-discovery:
    status: active
    triggers:
      - kind: schedule
        label: Daily Product Discovery
        cronExpression: "0 11 * * *"
        timezone: Europe/Madrid
```

- [ ] **Step 3: Update README runtime defaults, icon table, and role table**

In `README.md`, add this runtime-default bullet after `Code Reviewer: high`:

```md
- Product Manager: `high`
```

Add this icon table row after `CEO | crown`:

```md
| Product Manager | `radar` |
```

Add this role table row after `CEO | ceo`:

```md
| Product Manager | `pm` |
```

- [ ] **Step 4: Update README routine and work-surface language**

In `README.md`, change the internal-routine summary from three routines to four routines. Use this replacement paragraph for the paragraph that starts `In addition to the synced GitHub work queue`:

```md
In addition to the synced GitHub work queue, the package includes one bootstrap internal issue plus four recurring internal routines under `company-operations`: a weekly security scan, a daily Product Manager product-discovery review, a daily CEO self-improvement review, and an every-other-day CEO Training review. The bootstrap issue, **Verify Imported Company Instance**, imports in dispatch state on the CEO queue so the imported entity set can be checked before normal operations begin. Operator-selected live company names, descriptions, and issue prefixes are valid import choices as long as they do not break routing, governance visibility, or package-owned entity mapping. The routines create ongoing internal Paperclip work items that help keep the company healthy and product-aware; they do not replace the synced GitHub issues, PRs, PM-created GitHub feature requests after sync, or Paperclip-created productivity review issues that remain the real delivery and queue-health surface. The routines import active by default so those recurring maintenance checks start automatically after import.
```

In the `Work Surface` section, replace the bullet about three recurring tasks with:

```md
- It does include one lightweight internal project, `company-operations`, whose bootstrap CEO verification task imports on the CEO queue and whose four recurring tasks import as active Paperclip routines for product discovery, security posture reviews, CEO self-improvement, and CEO Training.
```

In the `Internal Routines` table, add this row after `Weekly Security Deep Scan`:

```md
| `Daily Product Discovery` | Product Manager | Every day at 11:00 `Europe/Madrid` | Research managed Micronaut-related projects, identify market and competitor gaps, and create direct GitHub feature requests detailed enough for later implementation |
```

Change `These routines import active by default.` only if surrounding wording still implies three routines. Keep the sentence if it remains accurate.

- [ ] **Step 5: Update README org chart, role details, and referenced skills**

In the Mermaid org chart in `README.md`, add the Product Manager node after `CEO`:

```md
    PM["Product Manager"]
```

Add this edge after `CEO --> Architect` or immediately after the CEO node declarations:

```md
    CEO --> PM
```

In the `Role Details` table, add this row after CEO:

```md
| Product Manager | Product Manager | `ceo` | Market and competitor research, capability-gap analysis, and direct GitHub feature requests for managed Micronaut projects |
```

In the referenced external skills table, change the `docs` row to include Product Manager:

```md
| `docs` | Architect, Product Manager, Micronaut Engineer, Technical Writer, Code Reviewer | Micronaut guide-authoring conventions for Asciidoctor, `toc.yml`, macros, and docs validation |
```

Add a `gh-cli` row after `docs`:

```md
| `gh-cli` | CEO, Architect, Product Manager, QA Engineer, Security Engineer, Code Reviewer, Micronaut Engineer, Technical Writer | GitHub CLI workflows when `GITHUB_TOKEN` is available, including direct maintainer-visible GitHub issue and PR body footer rules |
```

- [ ] **Step 6: Update COMPANY.md goals and internal-routine summary**

In `COMPANY.md`, replace the existing goal that starts `Run lightweight internal operating routines` with:

```yaml
  - Run lightweight internal operating routines for product discovery, proactive security scanning, continuous company improvement, and skill-backed agent training without replacing the synced GitHub work queue.
```

After the paragraph that says the package combines local skills with referenced maintainer skills, add:

```md
The Product Manager role adds proactive product discovery. Its daily routine researches active Micronaut-related projects, compares each project's current capabilities with market, competitor-framework, and adjacent-technology signals, and creates direct GitHub feature requests detailed enough for the normal QA, architecture, engineering, documentation, security, and review pipeline to implement after GitHub Sync imports them.
```

Replace the paragraph that starts `The package also includes one lightweight internal project` with this paragraph:

```md
The package also includes one lightweight internal project, `company-operations`, with one bootstrap **CEO** verification issue plus four recurring Paperclip routines: a weekly **Security Engineer** deep scan, a daily **Product Manager** product-discovery review, a daily **CEO** self-improvement review, and an every-other-day **CEO** Training review. The bootstrap issue imports on the CEO queue so the CEO can verify that the imported entities are complete before normal operations begin. Operator-selected live company names, descriptions, and issue prefixes are valid import choices as long as they do not break routing, governance visibility, or package-owned entity mapping. The recurring routines are company-operating work, not delivery backlog, and they exist to keep the maintenance system healthy, product-aware, and skill-aware even when the synced GitHub queue is temporarily quiet. They import active by default so those maintenance checks start automatically after import. The Product Manager routine creates direct GitHub feature requests for non-duplicative implementation-ready gaps in active Micronaut-related projects; after GitHub Sync imports those issues, QA intake owns the normal route. The CEO routine may promote reusable company learnings into PRs against the source package repository when a default should improve for future imports, may open managed Micronaut repository `AGENTS.md` PRs when repo-local guidance is stale, and may also send a PR to a company-owned upstream dependency such as the GitHub sync plugin when the root cause clearly lives there instead of in package guidance. Every daily CEO self-improvement report must include a `Managed Repository AGENTS.md Audit` section that names each active managed Micronaut repository considered, says whether root `AGENTS.md` exists and is durable/current, stale/generated, or missing, and records the exact outcome for each repository: no action needed, repo-local PR opened or updated, linked follow-up issue created, linked approval requested, or blocker named. A bounded metadata/readability check is enough unless recent execution evidence shows a deeper repository-specific guidance problem. CEO-opened PRs must still reach the same bar as other agent PRs: CI green, reported checks passing, and no unresolved review threads. Because CEO heartbeats may be disabled, the daily self-improvement routine rediscovers and follows up PRs opened by the CEO from prior routine reports, linked approvals, recorded PR URLs, open PR searches, and open productivity review issues. It must still end with a real action such as an implemented change, a linked board approval request, an open PR, or a manager decision on a productivity review instead of a proposal-only report. One required review point for that routine is stale handoff repair: when issue status, assignee, `executionState.currentParticipant`, `executionState.returnAssignee`, and the expected next owner disagree, the CEO should correct the routing if possible instead of only reporting it. The Training routine analyzes non-CEO agent executions since the last Training pass, uses the CEO's referenced `find-skills` capability to search https://skills.sh for skill candidates, creates a linked board approval request for every candidate before installation, and only after approval adds the candidate as a company skill referencing the exact https://skills.sh entry and links it to the approved agent or agents.
```

- [ ] **Step 7: Update engineering team membership**

In `teams/engineering/TEAM.md`, add Product Manager to `includes` after CEO-managed agent entries begin:

```yaml
  - ../../agents/product-manager/AGENTS.md
```

Replace the final team description paragraph with:

```md
The Engineering team maintains a bounded Micronaut repository cluster through proactive product discovery plus a strict backlog-to-QA-to-implementation-to-review PR workflow, with human board approvals and merges remaining outside the agent org.
```

- [ ] **Step 8: Run the targeted Product Manager test**

Run:

```bash
node --test scripts/product-manager-routine.test.mjs
```

Expected result: pass.

- [ ] **Step 9: Commit the Product Manager package surface**

Run:

```bash
git add .paperclip.yaml README.md COMPANY.md teams/engineering/TEAM.md agents/product-manager/AGENTS.md tasks/daily-product-discovery/TASK.md scripts/product-manager-routine.test.mjs package.json
git commit -m "feat: add product manager discovery routine"
```

Expected result: one commit containing the new Product Manager agent, routine, config, docs, team update, and targeted test.

## Task 4: Run Full Package Verification

**Files:**
- Read: all modified files
- Modify: only files required to fix failures found by verification

- [ ] **Step 1: Run the unit suite**

Run:

```bash
npm run test:unit
```

Expected result: all Node unit tests pass, including `scripts/product-manager-routine.test.mjs`.

- [ ] **Step 2: Run the import verification**

Run:

```bash
node scripts/verify-paperclip-import.mjs
```

Expected result: Paperclip import verification passes and includes the Product Manager agent and Daily Product Discovery routine automatically through package discovery.

- [ ] **Step 3: Run the full test command**

Run:

```bash
npm test
```

Expected result: `npm run test:unit` passes and `node scripts/verify-paperclip-import.mjs` passes.

- [ ] **Step 4: Inspect final git state**

Run:

```bash
git status --short
git log --oneline -3
```

Expected result: no unstaged changes unless verification required a fix after the Task 3 commit. If the verification fix touched the Product Manager test and docs, commit it with:

```bash
git add scripts/product-manager-routine.test.mjs README.md COMPANY.md
git commit -m "test: cover product manager import contract"
```

## Self-Review Notes

- Spec coverage: Task 2 creates the PM agent and daily routine task. Task 3 wires Paperclip config, docs, and team membership. Task 1 verifies direct GitHub issue guidance, detailed feature request contents, duplicate checks, schedule, adapter config, and docs. Task 4 runs package verification.
- Placeholder scan: the plan avoids unresolved placeholders in implementation content.
- Type consistency: the slug is consistently `product-manager`, the routine slug is consistently `daily-product-discovery`, the role is `pm`, the icon is `radar`, and the routine schedule is consistently `0 11 * * *` in `Europe/Madrid`.
