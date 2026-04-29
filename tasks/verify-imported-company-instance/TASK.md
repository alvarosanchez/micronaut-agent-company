---
name: Verify Imported Company Instance
assignee: ceo
project: company-operations
---

Verify that the imported Micronaut Agent Company template produced the expected package-owned entities and is safe to use.

Check at least these points:

- the imported company has the expected package-owned agent roster, Paperclip roles, titles, icons, reporting chain, and local company skills
- the imported company preserves the package's Paperclip v2026.428 defaults: `attachmentMaxBytes` is 10 MiB, `requireBoardApprovalForNewAgents` is explicitly false, and the process-level attachment cap is understood as the final ceiling
- each imported agent instruction bundle contains the expected runtime guidance and no missing package-only `references/` files
- the `company-operations` project exists
- this bootstrap issue exists in `TODO` on the CEO queue
- `Weekly Security Deep Scan` exists as an active routine owned by `security-engineer`
- `Daily CEO Self-Improvement` exists as an active routine owned by `ceo`
- the imported package still matches the intended workflow around native execution-policy routing, reviewer wake fallbacks, issue-thread interactions, resumable follow-up, liveness recovery, and linked approvals
- productivity review issues created with `originKind: issue_productivity_review` for no-comment, long-active, or high-churn source work are treated as first-class queue-health work, with the CEO or manager deciding the source issue route rather than creating duplicate reviews
- when repo work depends on services or jobs, the live project workspace or execution workspace configuration is intentionally operator-owned instead of being assumed to come from this package
- live Paperclip environments, including local, SSH-backed, or sandbox-backed providers, are intentionally operator-owned and not hard-coded into this package
- operator-selected live company names, descriptions, and issue prefixes are valid import choices as long as they do not break routing, governance visibility, or package-owned entity mapping
- references to `.paperclip.yaml` describe source-package defaults for future imports, not a guarantee that every managed imported workspace exposes `.paperclip.yaml` locally

Produce one verification report.

State at least these points:

- what entities you checked
- any mismatch you found
- whether the import is safe to use
- which follow-up belongs in a local `.company-runtime/` overlay versus a package PR
