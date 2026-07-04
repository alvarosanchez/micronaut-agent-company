---
name: ceo-issue-history
description: Build deterministic, complete 30-day issue-level evidence and rank recurring operating-system improvements for the CEO routine.
---

# CEO Issue History

Use this CEO-only skill before interpreting monthly self-improvement history. Do not replace the collector with an ad hoc issue sample or raw run-log review.

## Collect

Choose an explicit UTC `asOf` from the routine's scheduled boundary and run:

```bash
node skills/ceo-issue-history/scripts/issue-history-evidence.mjs --as-of <ISO-8601-UTC>
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

`no_change` with complete coverage is a successful verified no-op. Do not manufacture routine work. For `ranked_candidates`, inspect only the cited issue evidence, verify the owner/target and exact change, then follow `company-package-evolution` for governance and implementation. Keep direct queue corrections and active productivity-review decisions separate from new package proposals.

Terminal run token and USD-cost fields are parsed independently. Missing metrics and affected totals remain `unknown`, never zero, while known subtotals are labeled. Never patch Paperclip source, core, or imported-package files.

## Maintenance Lanes

The evidence pass is the discovery lane. Broad runtime-skill reconciliation, managed-repository instruction audit, and prior CEO PR follow-up are separate bounded maintenance lanes; load [references/maintenance-lanes.md](references/maintenance-lanes.md) only when running this routine. Do not count those maintenance outcomes as new ranked candidates.
