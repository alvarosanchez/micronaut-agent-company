---
name: ceo-issue-history
description: Build deterministic, complete 30-day issue-level evidence and rank recurring operating-system improvements for the CEO routine.
---

# CEO Issue History

Use this CEO-only skill before interpreting monthly self-improvement history. Do not replace the collector with an ad hoc issue sample or raw run-log review.

## Collect

Choose an explicit UTC `asOf` from the routine's scheduled boundary. Load the assigned issue-history evidence skill, locate its imported runtime directory, and execute the bundled collector:

```bash
node <ceo-issue-history-skill-directory>/scripts/issue-history-evidence.mjs --as-of <ISO-8601-UTC>
```

The script uses `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, and `PAPERCLIP_COMPANY_ID`. It enumerates the canonical company issue and agent inventories, reads durable issue resources with bounded concurrency, and reads company-wide heartbeat activity from `GET /api/companies/:companyId/activity?entityType=heartbeat_run&limit=500`. Run-entity events are deduplicated by event ID against issue resources.

Evidence uses exactly `[asOf-30d,asOf)`. `asOf` is mandatory: never infer it from the model clock. Exit code `2` and outcome `blocked_incomplete_evidence` mean coverage was not provably complete. In that state, create no proposal, approval, PR, or other discovery mutation; report the sorted missing-resource ledger.

## Interpret Compact JSON

The output is canonical compact JSON capped at 32,000 UTF-8 bytes, with controlled reason codes, stable `sha256:` fingerprints, bounded/redacted identifiers and issue/event references, capped rejected details, aggregate canonical-agent coverage plus an inventory fingerprint, coverage metadata, and no raw evidence text, secrets, or logs. Only schema-valid prior decisions with a controlled status and valid timestamp can suppress or defer a candidate.

Eligibility is objective:

- `cross_issue_recurrence`: at least two distinct issues and three events;
- `concentrated_loop`: at least three failed, blocked, or changes-requested events on one issue across at least two run IDs, three GitHub Sync churn events on one issue, or two stale-recovery-recursion refusals on one issue;
- `duplicate_incident`: at least two liveness escalations on one issue;
- `recovery_fanout`: at least three recovery actions on one issue;
- `critical_one_off`: one concrete governance, security, data-loss, unapproved external-write control failure, or one issue where a structured GitHub Sync regression is followed by a harness liveness escalation.

GitHub Sync attribution uses exact allowlisted structured provenance namespaces (`paperclip-github-plugin` or `github-sync` in `pluginKey`, source plugin fields, or `contextSource`) as well as exact plugin-origin namespaces. Unrelated strings that merely contain `github` do not qualify, and caller-supplied `github_sync_churn` labels cannot bypass the provenance check. Duplicate event IDs count once. Prior active fingerprints are suppressed. Implemented, rejected, or no-change decisions need a fresh post-decision threshold. Ranking is severity, distinct issue count, event count, recency, then fingerprint; the cap of three is applied after deduplication.

`no_change` with complete coverage is a successful verified no-op. Do not manufacture routine work. For `ranked_candidates`, inspect only the cited issue evidence, verify the owner/target and exact change, then follow `company-package-evolution` for governance and implementation.

## Interpret Cited Evidence

The collector says *where* a candidate recurs; this step says *what the agent did wrong*. Read the cited issues, comments, status transitions, reviewer verdicts, approvals, and human corrections, and name each candidate's cluster from this taxonomy:

- `verifier-miss`: the agent claimed done or ready and a reviewer, QA, Security, or the board rejected it;
- `avoidable-rework`: the same issue bounced or reopened more than once for the same reason;
- `stale-context`: the agent acted on an assumption already falsified earlier in the thread, in a document, or in the PR;
- `instruction-miss`: the agent violated a rule that already exists in its `AGENTS.md` or an assigned skill;
- `late-escalation`: the agent stayed blocked or waiting without escalating or naming an unblock owner;
- `human-correction`: a board user or maintainer explicitly said to do something differently (treat these comments as first-class evidence even when no threshold event fired);
- `tool-misuse`: the same tool error, wrong tool, or missing tool call repeated;
- `scope-creep`: changes beyond the issue's scope or stage authority.

Keep, per cluster, at least two evidence tuples of issue id, comment or run reference, and a short verbatim fragment; a cluster with one tuple is an observation, not a candidate. Write a one-sentence quotable pattern and a root-cause hypothesis before choosing a change.

`instruction-miss` is a different finding from a missing rule: when the pattern happened despite an existing rule, the proposal is to make that rule stick (move it into the role's own always-loaded surface: the `micronaut-repo-operations` entrypoint for the delivery roles that load it, or the role's `AGENTS.md` or `ceo-issue-history` for CEO, which does not load that entrypoint; add a negative example next to it; or strengthen its trigger), never to restate the rule elsewhere. Restated rules are how the agent instruction budget fills up without changing behaviour. Keep direct queue corrections and active productivity-review decisions separate from new package proposals.

Terminal run token and USD-cost fields are parsed independently. Missing metrics and affected totals remain `unknown`, never zero, while known subtotals are labeled. Never patch Paperclip source, core, or imported-package files.

## Maintenance Lanes

The evidence pass is the discovery lane. Broad runtime-skill reconciliation and managed-repository instruction audit are separate bounded maintenance lanes; durable PR follow-through belongs to Writer or Engineer, never CEO. Load [references/maintenance-lanes.md](references/maintenance-lanes.md) only when running this routine. Do not count maintenance outcomes as new ranked candidates.
