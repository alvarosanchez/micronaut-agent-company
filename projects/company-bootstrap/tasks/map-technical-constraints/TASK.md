---
name: Map Technical Constraints
assignee: architect
project: company-bootstrap
---

For each repository in `references/repository-cluster.md`, map the local technical facts that change how the company should operate.

At minimum, record or confirm:

- branch strategy and release-line expectations
- how SemVer targeting should be inferred from the default branch and latest stable release
- when new minor or major branches must be created from the default branch with local git CLI
- JDK and Gradle requirements
- key module boundaries or cross-repo dependencies
- test commands and expensive verification paths
- reproducer-test patterns for bugs and any known test fixtures or sample apps
- docs system layout and release-note conventions
- CI and Sonar Quality Gate expectations that engineers must satisfy during the PR cycle
- any compatibility or migration traps that should affect planning
