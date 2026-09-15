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

Read every stage artifact in one call instead of guessing document routes:

```bash
node <skill-directory>/scripts/paperclip-workflow.mjs docs --issue "$PAPERCLIP_TASK_ID" --dir "$PAPERCLIP_RUN_SCRATCH_DIR/docs"
```

`docs` writes each issue document to `<dir>/<key>.md` (all documents, or only the `--document` keys given), prints the paths, byte sizes and latest revision ids as JSON, and exits `2` when a requested key is missing. Documents are addressed by `key` (`/api/issues/{id}/documents/{key}`), never by document id, and the snapshot's `documents` field is an array of `{id, key, title, ...}` objects, not a map. Read the written files in full with your file tool; do not `head` a 15 KB artifact and call it read.

Commands:

- `snapshot`: fetch issue, heartbeat context, and selected durable documents as normalized JSON.
- `verify`: assert expected status, assignee, active participant, stage outcome, and document presence.
- `approval-link`: verify that an approval is linked to the current issue.
- `docs`: write the issue's documents to files for reading.

Run environment you already have (no `env` dump is needed, and never paste the key into a command): `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY` (reference it as `$PAPERCLIP_API_KEY`), `PAPERCLIP_AGENT_ID`, `PAPERCLIP_RUN_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_PROJECT_ID`, `PAPERCLIP_TASK_ID` (the current issue id), `PAPERCLIP_RUN_SCRATCH_DIR` (per-run scratch, deleted after the run; draft artifacts here, never inside the repository worktree), and `PAPERCLIP_WORKSPACE_CWD` (the worktree). File tools cannot expand variables: `echo "$PAPERCLIP_RUN_SCRATCH_DIR"` once and use the literal path.

Write endpoints this package's roles use (authority still comes from the role and stage, not from this list; always print the HTTP status and body of every write):

- durable artifact: `PUT /api/issues/{id}/documents/{key}` with `{"title": "...", "format": "markdown", "body": "...", "changeSummary": "..."}`; an existing key additionally requires `"baseRevisionId"` (the latest revision id from `docs`/`snapshot`), and a locked key returns `409`, which means stop and record, not retry.
- stage decision: `PATCH /api/issues/{id}` with `{"status": "done", "comment": "<decision>"}` approves your active execution-policy stage in one call; a non-`done` status (`in_progress`) with the same `comment` field requests changes. The path parameter is `{id}` (`/api/issues/{id}`), not `{issueId}`.
- plain progress comment: `POST /api/issues/{id}/comments` with `{"body": "..."}`.
- plugin tools: `plugin-tool.mjs` above.

All calls require `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY`. The URL must be an origin with no credentials, path, query, or fragment; plaintext HTTP is accepted only on loopback. Options are command-specific, singleton options reject duplicates, and unknown options fail before any request. Treat exit code `2` as a failed state assertion, not permission to improvise a write.

Do not attempt a cross-agent heartbeat invocation. Agent-authenticated callers may invoke only themselves; correct execution-policy routing or assignment must wake the next participant. If routing is correct but no run is queued, record a runtime wake blocker.

This skill grants no document mutation, GitHub, repository, implementation, closure, or publication authority; `plugin-tool.mjs` only forwards to tools the gateway already allows for the calling agent. Permitted document writes and stage decisions remain on native Paperclip tools because v2026.831.1 still exposes no server-enforced precondition for same-agent stage re-entry, and an agent write to a locked keyed document is redirected to a new document instead of failing. If a native document operation cannot guarantee the requested key, stop instead of retrying a remapped write.

See `references/instruction-automation-audit.md` for automated and deferred candidates.
