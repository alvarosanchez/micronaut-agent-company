---
name: Frequent CEO Incident Containment
assignee: ceo
project: company-operations
recurring: true
---

Run the CEO-only `ceo-issue-history` collector with the trigger's explicit scheduled UTC boundary as `--as-of` and `--mode containment`. This two-hourly, containment-only lane examines the rolling half-open six-hour interval `[asOf-6h,asOf)`, giving consecutive runs four hours of overlap, and handles `incidents` independently of monthly improvement discovery: incidents are not subject to the top-three proposal cap. The scheduled routine itself starts the CEO even when the deterministic collector finds no incident, so treat the twelve-runs-per-day ceiling as real overhead rather than claiming a zero-model fast path.

The mode performs exactly three bounded, newest-first company reads: `GET /api/companies/:companyId/activity?entityType=heartbeat_run&limit=500`, `GET /api/companies/:companyId/activity?entityType=issue&limit=500`, and `GET /api/companies/:companyId/heartbeat-runs?limit=1000`. A response below its host cap proves the surface is complete. A response exactly at the cap is complete only when every timestamp is valid, no record is newer than `asOf`, the response is newest-first, and the oldest record is strictly before `asOf-6h`; otherwise fail closed rather than claim `no_change`. Stable incident fingerprints and persisted CEO decisions suppress duplicate action across the overlap. If there are no incidents, exit immediately as a verified no-op without enumerating company issue inventory or continuing into monthly maintenance. Exact LLM cost remains unknown because runtime/provider pricing may not be available.

Fail closed on incomplete coverage or malformed control operands. For each incident, verify every exact target and execute its structured `actionManifest` in order. Re-read only supported fields from the named GET surface and enforce its `preconditions` and `idempotencyKey`; on mismatch, abort as a verified no-op. Never infer missing issue, run, mapping, root-run, retry category, or cause/fingerprint operands.

Approval creation must first `GET /api/companies/:companyId/approvals` and suppress any approval of any status whose `payload.idempotencyKey` matches. A new request body is exactly `{type:'request_board_approval',payload:{...},issueIds:[...]}`. Paperclip run cancellation is Board-only: the CEO requests approval containing the exact recommended Board `POST /api/heartbeat-runs/:runId/cancel` action and its fresh run-GET preconditions; approval does not grant the CEO authority to execute it. There is no per-mapping pause action: request Board approval for destructive GitHub Sync mapping removal and wait for the Board executor.

For terminal runs, parse each available token and USD-cost field independently from the real run projection. A missing metric is `unknown`, never zero; if any included terminal run lacks a metric, that metric's aggregate total is also `unknown`. Report known subtotals separately without fabricating telemetry.

Record the incident fingerprint, canonical target, exact sibling actions, precondition results, approval links, and verified outcomes in the stable CEO report. Never patch Paperclip core or source. A blocked action remains an explicit incident outcome, not a monthly improvement proposal.
