---
name: Training
assignee: ceo
project: company-operations
recurring: true
---

Analyze all other agents' past executions since the last Training pass, then improve their technology, domain, stack, tool, library, and external service coverage through approved reusable skills from https://skills.sh or through Architect-authored company skills when no suitable external skill exists.

Training is not a generic Paperclip workflow-performance review. Queue health, handoff correctness, Paperclip usage patterns, and productivity-review findings belong to the daily CEO self-improvement routine or `issue_productivity_review` handling unless they reveal a reusable technology or domain skill need.

Start by finding the previous Training report or routine run. Use that timestamp, report id, or run id as the boundary for this pass. If no previous pass exists, inspect the recent imported company history that is available in the current Paperclip instance and record the first-pass boundary you chose.

Inspect every non-CEO agent:

- Architect
- Product Manager
- QA Engineer
- Security Engineer
- Code Reviewer
- Micronaut Engineer
- Technical Writer

For each agent, review completed, failed, blocked, and changes-requested executions, including issue reports, stage artifacts, comments, linked approvals, PR follow-up notes, and routine reports. Look for the technologies and domains the agent actually had to handle, especially new or recurring work with frameworks, data stores, search engines such as Elasticsearch or OpenSearch, message brokers, cloud services, build tools, test frameworks, observability platforms, security tooling, or repository-specific libraries. For Technical Writer, include evidence from Weekly User Guide Review and Weekly Guide Topic Discovery executions.

Look for repeatable technology or domain skill gaps that a reusable skill could improve: for example, the Micronaut Engineer repeatedly edits Elasticsearch integration code without a strong Elasticsearch skill, the Architect keeps planning changes in a technology with specialized compatibility rules, or QA repeatedly verifies a service-specific workflow without the right domain checklist. Do not create skill proposals for one-off mistakes, generic Paperclip workflow issues, broad "be faster" performance notes, or problems that are better handled by a direct issue comment, a local `.company-runtime/` overlay, or an existing company skill.

Use the CEO's referenced `find-skills` capability to search https://skills.sh for skills that directly match the evidenced technology or domain gap. Verify each candidate against the recent execution evidence before proposing it.

For every skill candidate, create one linked board approval request before changing the company:

- include the exact https://skills.sh entry and proposed company skill slug
- name the target agent or agents
- cite the execution evidence since the last Training pass
- explain why an external referenced skill is better than prose in an existing company instruction
- state the exact implementation path after approval: add a company skill with source metadata that references the https://skills.sh entry using `usage: referenced`, then link it to the approved agent or agents

If the board approval is already approved during this run, add the approved skill as a company skill referencing the https://skills.sh entry and link it to the agent or agents named in the approval. If approval is pending, rejected, or requires revision, do not install or assign the skill; record the approval state and next step.

If no suitable existing https://skills.sh skill exists, but the same technology or domain gap is recurring enough to justify company-owned guidance, create one Paperclip child issue or subtask with status `backlog` and assignee Architect. The subtask must ask Architect to create the new company skill as a pull request to the company package, include the target agent or agents, cite the execution evidence, explain why no existing external skill was suitable, and name the expected skill slug and scope. Do not draft the custom skill in the Training routine itself.

Produce one Paperclip report that includes:

- the last-pass boundary used for this analysis
- the agents and executions inspected
- the recurring technology or domain skill gaps found, or a clear statement that no skill-worthy gap was found
- every skill candidate considered, including candidates rejected before board approval and why
- every linked board approval request opened or followed up
- every approved company skill added and every agent skill assignment changed
- every Architect subtask created for a recurring skill-worthy gap with no suitable existing skill
- any blocker that prevented approval creation, skill creation, or assignment

Finish with a real outcome: no skill-worthy gaps found, linked board approval request opened, approved skill added and linked to the agent, Architect subtask created for a new company skill PR, or clearly blocked with the blocking fact named.
