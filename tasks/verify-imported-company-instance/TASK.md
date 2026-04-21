---
name: Verify Imported Company Instance
assignee: ceo
project: company-operations
---

Verify that the imported Micronaut Agent Company template produced the expected package-owned entities and is safe to use.

Check at least these points:

- the imported company has the expected package-owned agent roster, titles, icons, reporting chain, and local company skills
- each imported agent instruction bundle contains the expected runtime guidance and no missing package-only `references/` files
- the `company-operations` project exists
- this bootstrap issue exists in `TODO` on the CEO queue
- `Weekly Security Deep Scan` exists as an active routine owned by `security-engineer`
- `Daily CEO Self-Improvement` exists as an active routine owned by `ceo`
- the imported package still matches the intended workflow around execution stages, reviewer wakeups, and linked approvals
- operator-selected live company name, description, and issue prefix are allowed unless they break routing or governance

Produce one verification report that states:

- what entities you checked
- any mismatch you found
- whether the import is safe to use
- which follow-up belongs in a local `.company-runtime/` overlay versus a package PR
