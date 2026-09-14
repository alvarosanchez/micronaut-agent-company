---
name: Monthly Security Deep Scan
assignee: security-engineer
project: company-operations
recurring: true
---

Review the current Micronaut repository cluster from a security posture perspective.

Inspect recent code changes, active pull requests, default branches, dependency or wrapper movement, build logic, GitHub Actions or other CI/CD automation, release workflows, and security-sensitive docs or examples. Cross-link each finding to an existing synced GitHub issue or PR when possible.

Before opening GitHub PR tools for active pull requests, read the host's external-object state for their synced issues in one call, `POST /api/companies/{companyId}/issues/external-object-summaries` with the issue ids; it already carries each PR's open, merged, CI, and review state. Compare every finding against the previous month's `security-deep-scan-report` document and report repeats as repeats with their first-seen date rather than as new findings.

Write one Paperclip report explicitly as this routine issue's keyed document `security-deep-scan-report` (the host keeps agent reasoning out of automatic comments and summarizes only the final output segment, so a report that exists only in the run transcript is lost) and include:

- ranked findings with concrete exploit, misuse, or exposure paths
- the repositories, branches, files, workflows, and docs surfaces inspected
- any existing GitHub issues or PRs that already track the risk
- the smallest safe remediation or escalation path
- explicit maintainer follow-up when a new GitHub issue must be opened or handled by humans

If no follow-up is needed, record what was scanned and why the current posture is acceptable. Do not edit this company package's core instruction files during the routine; use additive `.company-runtime/` overlays if local operating guidance needs to change.
