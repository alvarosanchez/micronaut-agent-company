---
name: Training
assignee: ceo
project: company-operations
recurring: true
---

Analyze all other agents' past executions since the last Training pass, then improve agent performance through approved reusable skills from https://skills.sh.

Start by finding the previous Training report or routine run. Use that timestamp, report id, or run id as the boundary for this pass. If no previous pass exists, inspect the recent imported company history that is available in the current Paperclip instance and record the first-pass boundary you chose.

Inspect every non-CEO agent:

- Architect
- Product Manager
- QA Engineer
- Security Engineer
- Code Reviewer
- Micronaut Engineer
- Technical Writer

For each agent, review completed, failed, blocked, and changes-requested executions, including issue reports, stage artifacts, comments, linked approvals, PR follow-up notes, and any runtime liveness or continuation metadata that explains where work slowed down.

Look for repeatable performance gaps that a reusable skill could improve, such as missed domain conventions, repeated tool mistakes, weak verification loops, brittle review habits, slow GitHub or Paperclip workflows, avoidable planning churn, or documentation quality issues. Do not create skill proposals for one-off mistakes that are better handled by a direct issue comment, a local `.company-runtime/` overlay, or an existing company skill.

Use the CEO's referenced `find-skills` capability to search https://skills.sh for skills that directly match the evidenced gap. Verify each candidate against the recent execution evidence before proposing it.

For every skill candidate, create one linked board approval request before changing the company:

- include the exact https://skills.sh entry and proposed company skill slug
- name the target agent or agents
- cite the execution evidence since the last Training pass
- explain why an external referenced skill is better than prose in an existing company instruction
- state the exact implementation path after approval: add a company skill with source metadata that references the https://skills.sh entry using `usage: referenced`, then link it to the approved agent or agents

If the board approval is already approved during this run, add the approved skill as a company skill referencing the https://skills.sh entry and link it to the agent or agents named in the approval. If approval is pending, rejected, or requires revision, do not install or assign the skill; record the approval state and next step.

Produce one Paperclip report that includes:

- the last-pass boundary used for this analysis
- the agents and executions inspected
- the recurring performance gaps found, or a clear statement that no skill-worthy gap was found
- every skill candidate considered, including candidates rejected before board approval and why
- every linked board approval request opened or followed up
- every approved company skill added and every agent skill assignment changed
- any blocker that prevented approval creation, skill creation, or assignment

Finish with a real outcome: no skill-worthy gaps found, linked board approval request opened, approved skill added and linked to the agent, or clearly blocked with the blocking fact named.
