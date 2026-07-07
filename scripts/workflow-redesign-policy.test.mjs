import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const route = async () => read("../skills/micronaut-repo-operations/references/intake-routing-release.md");

test("QA intake has a stable authoritative classification artifact", async () => {
  const [policy, qa] = await Promise.all([route(), read("../agents/qa-engineer/AGENTS.md")]);
  const fields = [
    "deliveryClass", "planningRequired", "planningReason", "securityPrecheckRequired",
    "deliveryOwner", "followThroughOwner", "verificationProfile",
    "evidenceReproduction", "acceptanceCriteria",
  ];
  assert.match(policy, /issue type is only the surface label/i);
  assert.match(qa, /QA is the authoritative classifier/i);
  for (const field of fields) {
    assert.match(policy, new RegExp(`^${field}:`, "m"), `qa-intake must define ${field}`);
    assert.match(qa, new RegExp(`\\b${field}\\b`), `QA instructions must require ${field}`);
  }
  assert.match(policy, /routine \| architectural \| security-sensitive \| documentation/);
  assert.match(policy, /micronaut-engineer \| technical-writer/);
  assert.match(policy, /source \| dependency \| docs-prose \| docs-executable/);
});

test("routine and complex bugs have distinct architecture routing", async () => {
  const policy = await route();
  assert.match(policy, /Routine localized bug:[^\n]+QA intake -> Micronaut Engineer -> QA verification -> Security Engineer final review -> Code Reviewer[^\n]+skips Architect/i);
  assert.match(policy, /Architecture-sensitive bug:[^\n]+QA intake -> Architect -> Micronaut Engineer -> QA verification -> Security Engineer final review -> Code Reviewer/i);
  for (const trigger of ["cross-module", "public API", "concurrency", "structural performance", "native-image", "multiple materially different fixes", "contradictory intended behavior", "failed implementation"]) {
    assert.match(policy, new RegExp(trigger, "i"));
  }
});

test("routine and migration dependency upgrades have distinct architecture routing", async () => {
  const policy = await route();
  assert.match(policy, /Routine compatible dependency upgrade:[^\n]+QA intake -> Micronaut Engineer -> QA verification -> Security Engineer final review -> Code Reviewer[^\n]+skips Architect/i);
  assert.match(policy, /Architectural or migration dependency upgrade:[^\n]+QA intake -> Architect -> Micronaut Engineer -> QA verification -> Security Engineer final review -> Code Reviewer/i);
  for (const trigger of ["major upgrade", "configuration migration", "BOM", "language", "annotation-processing", "multi-module", "transitive replacement", "compatibility matrix", "disputed strategy"]) {
    assert.match(policy, new RegExp(trigger, "i"));
  }
});

test("security-sensitive work has pre-triage and final security stages", async () => {
  const [policy, security] = await Promise.all([route(), read("../agents/security-engineer/AGENTS.md")]);
  assert.match(policy, /Security Engineer pre-triage -> Architect only when[^\n]+-> Micronaut Engineer -> QA verification -> Security Engineer final review -> Code Reviewer/i);
  assert.match(policy, /pre-triage never replaces final security review/i);
  assert.match(security, /requires both pre-triage before implementation and final review after QA/i);
});

test("documentation uses reduced prose gates and conditional executable security", async () => {
  const policy = await route();
  assert.match(policy, /Prose-only docs:[^\n]+QA intake -> Technical Writer -> QA verification -> Code Reviewer[^\n]+no Security stage/i);
  assert.match(policy, /Executable examples or security-sensitive docs:[^\n]+QA intake -> Technical Writer -> QA verification -> Security Engineer final review -> Code Reviewer/i);
});

test("AGENTS textual and executable package findings have explicit owners", async () => {
  const [policy, evolution, writer, engineer] = await Promise.all([
    route(),
    read("../skills/company-package-evolution/SKILL.md"),
    read("../agents/technical-writer/AGENTS.md"),
    read("../agents/micronaut-engineer/AGENTS.md"),
  ]);
  assert.match(policy, /Mechanical or stale repository `AGENTS\.md`:[^\n]+CEO finding -> QA intake -> Technical Writer -> QA verification -> Code Reviewer/i);
  assert.match(writer, /own implementation and PR follow-through for prose docs, guides, repository `AGENTS\.md`, company role instructions, and textual control-plane changes/i);
  assert.match(engineer, /own implementation and PR follow-through for source, tests, dependencies, build logic, package scripts, adapters, and plugins/i);
  assert.match(evolution, /executable package scripts\/tests\/config behavior and plugin\/adapter code route to Engineer/i);
});

test("CEO cannot perform repository or PR delivery work", async () => {
  const [ceo, routine] = await Promise.all([
    read("../agents/ceo/AGENTS.md"),
    read("../tasks/monthly-ceo-self-improvement/TASK.md"),
  ]);
  for (const body of [ceo, routine]) {
    assert.match(body, /CEO never branches, edits(?: repository files)?, commits, pushes, creates or updates PRs, repairs CI, replies to review threads, or performs PR rediscovery/i);
  }
  assert.match(ceo, /creates and assigns scoped (?:child issues|children) with acceptance criteria, then stops/i);
  assert.match(routine, /textual[^\n]+Technical Writer/i);
  assert.match(routine, /executable (?:company-)?package[^\n]+Micronaut Engineer/i);
});

test("PR follow-through re-enters gates by actual change effect", async () => {
  const control = await read("../skills/micronaut-repo-operations/references/workflow-control-plane.md");
  assert.match(control, /source, test, dependency, or build changes go Micronaut Engineer -> QA -> Security -> Code Reviewer/i);
  assert.match(control, /prose-only docs go Technical Writer -> QA -> Code Reviewer/i);
  assert.match(control, /executable or security-sensitive docs add Security/i);
  assert.match(control, /design-changing requests go Architect -> recorded implementation owner -> applicable gates/i);
  assert.match(control, /clean rebase with green CI returns to maintainer wait/i);
  assert.match(control, /conflicts or semantic changes rerun the applicable gates/i);
  assert.match(control, /followThroughAssigneeAgentId/);
  assert.match(control, /does not implement plugin code/i);
});
