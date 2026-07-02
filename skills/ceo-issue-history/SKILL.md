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

The script uses `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, and `PAPERCLIP_COMPANY_ID`. It enumerates the canonical company issue inventory with plugin-operation issues included and the canonical agent inventory, then reads each issue's comments, documents, runs, activity, cost summary, approvals, interactions, recovery actions, and work products with bounded concurrency. This avoids truncated company-wide activity/run endpoints and proves coverage for agents with zero evidence. It never reads raw heartbeat logs. GitHub Sync plugin-operation churn is recognized from real Paperclip `issue.updated` activity, structured status/reopen details, and the issue's `plugin:*github*` origin; use `paperclip-github-plugin:get_issue_interaction_summary` as supplementary GitHub-specific evidence for a ranked issue, and keep its ledger coverage separate from Paperclip core coverage.

The evidence interval is exactly `[asOf-30d,asOf)`. `asOf` is mandatory: never infer it from the model clock. Exit code `2` and outcome `blocked_incomplete_evidence` mean coverage was not provably complete. In that state, create no proposal, approval, PR, or other discovery mutation; report the sorted missing-resource ledger.

## Interpret Compact JSON

The output is canonical compact JSON capped at 32,000 UTF-8 bytes, with controlled reason codes, stable `sha256:` fingerprints, bounded/redacted identifiers and issue/event references, capped rejected details, aggregate canonical-agent coverage plus an inventory fingerprint, coverage metadata, and no raw evidence text, secrets, or logs. Only schema-valid prior decisions with a controlled status and valid timestamp can suppress or defer a candidate.

Eligibility is objective:

- `cross_issue_recurrence`: at least two distinct issues and three events;
- `concentrated_loop`: at least three failed, blocked, or changes-requested events on one issue across at least two run IDs;
- `critical_one_off`: one concrete governance, security, data-loss, or unapproved external-write control failure.

Duplicate event IDs count once. Prior active fingerprints are suppressed. Implemented, rejected, or no-change decisions need a fresh post-decision threshold. Ranking is severity, distinct issue count, event count, recency, then fingerprint; the cap of three is applied after deduplication.

`no_change` with complete coverage is a successful verified no-op. Do not manufacture routine work. For `ranked_candidates`, inspect only the cited issue evidence, verify the owner/target and exact change, then follow `company-package-evolution` for governance and implementation. Keep direct queue corrections and active productivity-review decisions separate from new package proposals.

## Maintenance Lanes

The evidence pass is the discovery lane. Broad runtime-skill reconciliation, managed-repository instruction audit, and prior CEO PR follow-up are separate bounded maintenance lanes; load [references/maintenance-lanes.md](references/maintenance-lanes.md) only when running this routine. Do not count those maintenance outcomes as new ranked candidates.
