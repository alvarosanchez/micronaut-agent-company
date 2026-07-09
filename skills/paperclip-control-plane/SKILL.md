---
name: paperclip-control-plane
description: Deterministic read-only Paperclip issue, document, and approval-link verification with strict JSON output.
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

All calls require `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY`. The URL must be an origin with no credentials, path, query, or fragment; plaintext HTTP is accepted only on loopback. Options are command-specific, singleton options reject duplicates, and unknown options fail before any request. Treat exit code `2` as a failed state assertion, not permission to improvise a write.

Do not attempt a cross-agent heartbeat invocation. Agent-authenticated callers may invoke only themselves; correct execution-policy routing or assignment must wake the next participant. If routing is correct but no run is queued, record a runtime wake blocker.

This skill grants no document mutation, GitHub, repository, implementation, closure, or publication authority. Permitted document writes and stage decisions remain on native Paperclip tools because v2026.626 exposes no atomic client precondition that can safely fence keyed-document replacement or same-agent stage re-entry. If a native document operation cannot guarantee the requested key, stop instead of retrying a remapped write.

See `references/instruction-automation-audit.md` for automated and deferred candidates.
