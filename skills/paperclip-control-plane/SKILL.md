---
name: paperclip-control-plane
description: Deterministic Paperclip issue, document, approval-link, and execution-stage REST operations with guarded mutations and JSON output.
---

# Paperclip Control Plane

Use the bundled CLI before interpreting repeated REST steps:

```bash
node <skill-directory>/scripts/paperclip-workflow.mjs snapshot --issue "$PAPERCLIP_ISSUE_ID" --document qa-intake
node <skill-directory>/scripts/paperclip-workflow.mjs verify --issue "$PAPERCLIP_ISSUE_ID" --participant "$PAPERCLIP_AGENT_ID"
```

Commands:

- `snapshot`: fetch issue, heartbeat context, and selected durable documents as normalized JSON.
- `verify`: assert expected status, assignee, active participant, stage outcome, and document presence.
- `approval-link`: verify that an approval is linked to the current issue.
- `put-document`: create or revise one keyed issue document from a file, using the current `baseRevisionId`, then verify the stored body.
- `transition`: assert the current stage participant, apply `done` or `in_progress` with a comment file, and read state back.

Mutations require `PAPERCLIP_RUN_ID`; all calls require `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY`. Treat exit code `2` as a failed state assertion, not permission to improvise a write.

Do not attempt a cross-agent heartbeat invocation. Agent-authenticated callers may invoke only themselves; correct execution-policy routing or assignment must wake the next participant. If routing is correct but no run is queued, record a runtime wake blocker.

This skill grants no GitHub, repository, implementation, closure, or publication authority. Role instructions remain authoritative about which documents and transitions the agent may write.

See `references/instruction-automation-audit.md` for automated and deferred candidates.
