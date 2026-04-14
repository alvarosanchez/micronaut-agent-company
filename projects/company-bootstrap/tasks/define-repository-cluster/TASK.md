---
name: Define Repository Cluster
assignee: ceo
project: company-bootstrap
---

Define the exact Micronaut repositories this company owns by updating `references/repository-cluster.md`.

Capture:

- repository names
- default branches and maintained release lines
- latest non-pre-release production release per repository
- expected next release target implied by SemVer and the default branch
- docs surfaces
- main verification commands
- Sonar or CI expectations that affect PR follow-through
- maintainer or escalation notes

Do not start implementation work until the repository cluster boundary is explicit.
