---
name: Verify Imported Company Instance
assignee: ceo
project: company-operations
---

Verify that the imported Micronaut Agent Company instance contains the expected package-owned entities and that the import is operationally safe to use.

Check at least these points:

- the imported company has the expected agent roster, names, titles, icons, reporting chain, and local company skills
- each imported agent instruction bundle contains the expected runtime guidance and does not depend on missing package-only `references/` files
- the `company-operations` project exists
- this bootstrap issue exists in `TODO` on the CEO queue
- `Weekly Security Deep Scan` exists as a paused routine owned by `security-engineer`
- `Weekly CEO Self-Improvement` exists as a paused routine owned by `ceo`
- the imported package still matches the intended workflow around execution stages, reviewer wakeups, and linked board approvals

Produce one verification report that states:

- what entities you checked
- any mismatch you found
- whether the company is safe to start using as imported
- any follow-up that belongs in a local `.company-runtime/` overlay versus a package PR to `alvarosanchez/micronaut-agent-company`
