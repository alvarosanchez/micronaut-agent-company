---
name: Engineering
description: Maintenance team responsible for the Micronaut repository cluster operated by this company.
slug: engineering
manager: ../../agents/ceo/AGENTS.md
includes:
  - ../../agents/product-manager/AGENTS.md
  - ../../agents/architect/AGENTS.md
  - ../../agents/qa-engineer/AGENTS.md
  - ../../agents/security-engineer/AGENTS.md
  - ../../agents/code-reviewer/AGENTS.md
  - ../../agents/micronaut-engineer/AGENTS.md
  - ../../agents/technical-writer/AGENTS.md
  - ../../skills/micronaut-repo-operations/SKILL.md
  - ../../skills/micronaut-quality-gates/SKILL.md
  - ../../skills/micronaut-security-review/SKILL.md
tags:
  - micronaut
  - engineering
  - maintenance
---

The Engineering team maintains a bounded Micronaut repository cluster through proactive Product Manager discovery and risk-classified delivery. QA is the authoritative classifier: routine bugs and compatible dependency upgrades skip Architect; architecture/migration triggers add Architect; security-sensitive work gets Security pre-triage and final review; prose docs use Writer -> QA -> Reviewer, while executable/security docs add Security. Micronaut Engineer owns code/build/dependency/plugin implementation and PR follow-through. Technical Writer owns docs, repository `AGENTS.md`, company instructions, textual control-plane implementation, and PR follow-through. CEO governs and routes, then stops before repository or PR work. Human approvals and merges remain outside the agent org.
