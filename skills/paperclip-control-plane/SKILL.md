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

Plugin tools go through the same skill so no run has to rediscover the gateway payload:

```bash
node <skill-directory>/scripts/plugin-tool.mjs list
node <skill-directory>/scripts/plugin-tool.mjs call paperclip-github-plugin:get_issue --params '{"repository":"micronaut-projects/micronaut-maven-plugin","issueNumber":1712}'
```

`plugin-tool.mjs` builds the exact `POST /api/plugins/tools/execute` body the host validates, `{ "tool": "<pluginId>:<tool>", "parameters": { ... }, "runContext": { "agentId", "runId", "companyId", "projectId" } }`, from `PAPERCLIP_AGENT_ID`, `PAPERCLIP_RUN_ID`, `PAPERCLIP_COMPANY_ID`, and `PAPERCLIP_PROJECT_ID` (falling back to the current issue's project when that variable is empty). The field is `parameters`, never `arguments`. Exit code `2` means the gateway denied the call (`deny_default`: a missing tool-access profile, report it as a deployment gap) or the tool itself returned an error; do not write an ad hoc curl or shell helper for the gateway.

Commands:

- `snapshot`: fetch issue, heartbeat context, and selected durable documents as normalized JSON.
- `verify`: assert expected status, assignee, active participant, stage outcome, and document presence.
- `approval-link`: verify that an approval is linked to the current issue.

All calls require `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY`. The URL must be an origin with no credentials, path, query, or fragment; plaintext HTTP is accepted only on loopback. Options are command-specific, singleton options reject duplicates, and unknown options fail before any request. Treat exit code `2` as a failed state assertion, not permission to improvise a write.

Do not attempt a cross-agent heartbeat invocation. Agent-authenticated callers may invoke only themselves; correct execution-policy routing or assignment must wake the next participant. If routing is correct but no run is queued, record a runtime wake blocker.

This skill grants no document mutation, GitHub, repository, implementation, closure, or publication authority; `plugin-tool.mjs` only forwards to tools the gateway already allows for the calling agent. Permitted document writes and stage decisions remain on native Paperclip tools because v2026.831.1 still exposes no server-enforced precondition for same-agent stage re-entry, and an agent write to a locked keyed document is redirected to a new document instead of failing. If a native document operation cannot guarantee the requested key, stop instead of retrying a remapped write.

See `references/instruction-automation-audit.md` for automated and deferred candidates.
