---
name: Verify Imported Company Instance
assignee: ceo
project: company-operations
---

Verify that the imported Micronaut Agent Company template produced the expected package-owned entities and is safe to use.

Check at least these points:

- the imported company has the expected package-owned agent roster, Paperclip roles, titles, icons, reporting chain, and local company skills
- `Product Manager` exists with role `pm`, title `Product Manager`, icon `radar`, reporting chain to `ceo`, and the expected product-discovery skills
- `Technical Writer` includes the referenced `guides` skill for standalone Micronaut Guides work
- the imported company preserves the package's company defaults: `requireBoardApprovalForNewAgents` is explicitly false; `attachmentMaxBytes` (10 MiB in the package) is retired and ignored by `paperclipai@2026.831.1`, so the process-level attachment cap is understood as the final ceiling
- every package-owned agent has `runtime.heartbeat.maxConcurrentRuns` set to 1, preserving the package's single-run concurrency override against Paperclip v2026.831.1's default of 20
- every package-owned agent imported with the intended 2026.831.1 adapter: `claude_local` with `engine: auto`, `dangerouslySkipPermissions: true`, and the role's model/effort (`claude-opus-5` medium for CEO and Product Manager, `claude-fable-5-1` high for Architect and Micronaut Engineer, `claude-opus-5` high for QA and Security, `claude-sonnet-5` medium for Technical Writer), and `codex_local` with `engine: auto`, `gpt-6-astra`, `modelReasoningEffort: high`, and `dangerouslyBypassApprovalsAndSandbox: true` for Code Reviewer only; each cheap profile is enabled (`claude-haiku-4-5` low effort, or `gpt-5.6-luna` low reasoning for Code Reviewer); the instance can actually run both adapters with the deployment's Claude and Codex subscription credentials
- each imported agent instruction bundle contains the expected runtime guidance and no missing package-only `references/` files
- the `company-operations` project exists
- this bootstrap issue exists in `TODO` on the CEO queue
- `monthly-security-deep-scan` exists as an active routine owned by `security-engineer`
- `monthly-product-discovery` exists as an active routine owned by `product-manager`
- `monthly-user-guide-review` exists as an active routine owned by `technical-writer`
- `monthly-guide-topic-discovery` exists as an active routine owned by `technical-writer`
- `monthly-ceo-self-improvement` exists as an active routine owned by `ceo`
- the imported package still matches the intended workflow around native execution-policy routing, reviewer wake fallbacks, issue-thread interactions, resumable follow-up, liveness recovery, and linked approvals
- productivity review issues created with `originKind: issue_productivity_review` for no-comment, long-active, or high-churn source work are treated as first-class queue-health work, with the CEO or manager deciding the source issue route rather than creating duplicate reviews
- when repo work depends on services or jobs, the live project workspace or execution workspace configuration is intentionally operator-owned instead of being assumed to come from this package
- live Paperclip environments, including local, SSH-backed, or sandbox-backed providers, are intentionally operator-owned and not hard-coded into this package
- Paperclip v2026.831.1 runtime surfaces are understood: plugin tools are reached through `GET /api/plugins/tools` and `POST /api/plugins/tools/execute` with the run-minted token and filtered by the company tool-access policy; the 48h run token replaces any static `PAPERCLIP_API_KEY`; interaction resolver policy defaults to `anyone`; skill sync and reimport preserve operator skill selections unless an explicit replace merge mode is chosen, so verify grants merged rather than assuming replacement; the package declares bundle `schemaVersion: 7` so import emits no unstamped-bundle warning, and large imports run as async jobs; task watchdogs are limited to non-GitHub waits; ask mode is reserved for explicit Q&A work; routine date variables and Teams Catalog are runtime adoption surfaces; package skills can be reconciled through the Skills Store/runtime skill inventory, PR-visible evidence can use workspace file viewer or artifact links, and sandbox provider choices remain live deployment configuration rather than portable package defaults
- Paperclip planning-mode behavior is understood: only explicit planning-only precursor issues use `workMode: planning`; accepted plans are decomposed through `POST /api/issues/{issueId}/accepted-plan-decompositions` into standard-mode child implementation issues
- the imported company grants the expected agents the Paperclip catalog skill keys `paperclipai/bundled/paperclip-operations/issue-triage`, `paperclipai/bundled/paperclip-operations/task-planning`, `paperclipai/bundled/quality/qa-acceptance`, `paperclipai/bundled/software-development/github-pr-workflow`, `paperclipai/bundled/docs/doc-maintenance`, and `paperclipai/optional/browser/agent-browser`; install those Skills Store entries in the target company and verify the grants move from missing to configured without vendoring catalog skill bodies in this package
- operator-selected live company names, descriptions, and issue prefixes are valid import choices as long as they do not break routing, governance visibility, or package-owned entity mapping
- references to `.paperclip.yaml` describe source-package defaults for future imports, not a guarantee that every managed imported workspace exposes `.paperclip.yaml` locally

Produce one verification report.

State at least these points:

- what entities you checked
- any mismatch you found
- whether the import is safe to use
- which follow-up belongs in a local `.company-runtime/` overlay versus a package PR
