import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";

import YAML from "yaml";

const execFileAsync = promisify(execFile);

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

async function markdownFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, root);
    if (entry.isDirectory()) files.push(...await markdownFiles(url));
    else if (entry.name.endsWith(".md")) files.push(url);
  }
  return files.sort((left, right) => left.href.localeCompare(right.href));
}

async function importedAgentBundle(agentSlug, expectedSkills) {
  const rolePath = `../agents/${agentSlug}/AGENTS.md`;
  const role = await read(rolePath);
  const frontmatter = role.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(frontmatter, `${rolePath} must have YAML frontmatter`);
  const skills = YAML.parse(frontmatter[1]).skills;
  assert.deepEqual(skills, expectedSkills, `${agentSlug} must use the audited exact skill grant set`);

  const documents = [[rolePath, role]];
  for (const skill of skills) {
    if (skill.startsWith("paperclipai/")) {
      const catalogPath = `../node_modules/@paperclipai/skills-catalog/catalog/${skill.slice("paperclipai/".length)}/SKILL.md`;
      documents.push([catalogPath, await read(catalogPath)]);
      continue;
    }
    const skillRoot = new URL(`../skills/${skill}/`, import.meta.url);
    const files = await markdownFiles(skillRoot);
    assert.ok(files.some((file) => file.pathname.endsWith("/SKILL.md")), `missing local skill ${skill}`);
    for (const file of files) {
      const path = file.pathname.replace(new URL("../", import.meta.url).pathname, "");
      documents.push([path, await readFile(file, "utf8")]);
    }
  }
  return documents.map(([path, body]) => `\n<!-- ${path} -->\n${body}`).join("\n");
}

async function importedInvocationBundle(agentSlug, expectedSkills, taskSlug) {
  const roleAndSkills = await importedAgentBundle(agentSlug, expectedSkills);
  const taskPath = `../tasks/${taskSlug}/TASK.md`;
  return `${roleAndSkills}\n<!-- ${taskPath} -->\n${await read(taskPath)}`;
}

function bundleDigest(bundle) {
  return createHash("sha256").update(bundle).digest("hex");
}

function unsafeDeliveryImperatives(bundle) {
  const imperative = /^\s*(?:[-*]\s*)?(?:(?:you|the reviewer|the security engineer)\s+)?(?:(?:must|should|can)\s+)?(?:edit|modify|write|commit|push|merge|publish|release|create|update|reply|resolve|re-request)(?:\s|:)/i;
  const deliveryTarget = /\b(?:branches?|pull requests?|prs?|repositories|review threads?|releases?)\b/i;
  const prohibited = /\b(?:must not|do not|never|prohibited|read-only|non-mutating)\b/i;
  const otherOwner = /\b(?:implementation owner|delivery owner|follow-through owner|technical writer|micronaut engineer)\b/i;
  const indirectDelivery = /\b(?:just ship it|ship (?:it|the (?:small )?change)(?: in the same heartbeat)?|deliver or implement (?:it|the change) yourself)\b/i;
  return bundle.split("\n").filter((line) =>
    !prohibited.test(line)
    && !otherOwner.test(line)
    && ((imperative.test(line) && deliveryTarget.test(line)) || indirectDelivery.test(line))
  );
}

function unsafeMaintainerWaitMutations(bundle) {
  const protectedWait = /\b(?:healthy maintainer wait|unassigned[^\n]*(?:in_review|in review)|(?:in_review|in review)[^\n]*(?:no reviewer|unassigned))\b/i;
  const mutation = /\b(?:assign|reassign|move|set|wake|close|cancel|invalid|todo|in_progress|done)\b/i;
  const prohibition = /\b(?:must not|do not|never|without waking|leave[^\n]+unassigned|remain[^\n]+unassigned|restore[^\n]+unassigned)\b/i;
  return bundle.split("\n").filter((line) => protectedWait.test(line) && mutation.test(line) && !prohibition.test(line));
}

function unsafeCrossAgentWakeInstructions(markdown) {
  const wake = /heartbeat\/invoke|\bheartbeat invoke\b|\b(?:invoke|trigger|start)\b[^\n]{0,100}\b(?:another agent|next (?:agent|participant|reviewer)|reviewer|assignee)[^\n]{0,100}\bheartbeat\b|\bheartbeat\b[^\n]{0,100}\b(?:another agent|next (?:agent|participant|reviewer)|reviewer|assignee)\b/i;
  const prohibition = /\b(?:must not|do not|never|cannot|can't|may not|no cross-agent|permits an agent to invoke only itself)\b/i;
  return markdown.split("\n").filter((line) => wake.test(line) && !prohibition.test(line));
}

function unsafeRootMutationAuthorities(markdown) {
  const anyActor = /\b(?:CEO(?: routine)?|Architect|Security Engineer|Code Reviewer|QA Engineer|QA|Technical Writer|Micronaut Engineer|Writer|Engineer|(?:artifact-appropriate )?implementation owners?|delivery owners?|followThroughOwner)\b/gi;
  const restrictedActor = /^(?:CEO(?: routine)?|Architect|Security Engineer|Code Reviewer)$/i;
  const mutation = /(?<!-)\b(?:opens?|opening|updates?|updating|creates?|creating|sends?|sending|promotes?|promoting|publishes?|publishing|implements?|implementing|installs?|installing|adds?|adding|assigns?|assigning|authors?|authoring|rediscovers?|rediscovering|follows?|following|links?|linking|edits?|editing|modifies|modifying|writes?|writing|commits?|committing|pushes|pushing|merges?|merging|releases?|releasing|replies|replying|resolves?|resolving|re-requests?|re-requesting)\b(?!-)/gi;
  const mutationTarget = /\b(?:PRs?|pull requests?|repository branches?|repositories|review threads?|company[- ]skills?|skills?|reusable package defaults?|PR follow-through|pull-request follow-through|review-thread (?:resolution|mutation)|thread (?:resolution|mutation))\b/i;
  const prohibition = /\b(?:must not|does not|do not|never|cannot|can't|may not|should not|without|rather than|not be assigned)\b/i;
  const passiveMutation = /\b(?:PRs?|pull requests?|repository branches?|repositories|review threads?|company[- ]skills?|skills?|reusable package defaults?)\b[^\n.!?]{0,100}\b(?:opened|updated|created|sent|promoted|published|implemented|installed|added|assigned|authored|followed|linked|edited|modified|written|committed|pushed|merged|released|replied to|resolved)\b[^\n.!?]{0,40}\bby (?:the )?(CEO(?: routine)?|Architect|Security Engineer|Code Reviewer)\b/i;
  const ownerMutation = /\b(CEO(?: routine)?|Architect|Security Engineer|Code Reviewer)\b[^\n.!?]{0,60}\bowns?\b[^\n.!?]{0,80}\b(?:PR follow-through|pull-request follow-through|review-thread (?:resolution|mutation)|thread (?:resolution|mutation))\b/i;
  const routineOwnerMutation = /\b(?:set|sets|assign|assigns|assigned)\b[^\n.!?]{0,50}\bassignee\b[^\n.!?]{0,50}\broutine owner\b/i;
  const restrictedAssigneeMutation = /\b(?:set|sets|assign|assigns|assigned)\b[^\n.!?]{0,30}\bassignee\b(?:\s+to)?\s+(?:the\s+)?(?:CEO(?: routine)?|Architect|Security Engineer|Code Reviewer)\b[^\n.!?]{0,100}\b(?:PRs?|pull requests?|repository branches?|repositories|review threads?|company[- ]skills?|skills?|reusable package defaults?)\b/i;
  const restrictedDelegateMutation = /\b(?:assign|assigns|delegate|delegates|route|routes)\b[^\n.!?]{0,30}\b(?:CEO(?: routine)?|Architect|Security Engineer|Code Reviewer)\b[^\n.!?]{0,80}\b(?:open|update|create|send|promote|publish|implement|install|add|author|follow|link|edit|modify|write|commit|push|merge|release|reply|resolve)\w*\b[^\n.!?]{0,100}\b(?:PRs?|pull requests?|repository branches?|repositories|review threads?|company[- ]skills?|skills?|reusable package defaults?)\b/i;
  const legacyMutation = /\bCEO-opened PRs?\b/i;
  const results = [];

  for (const sentence of markdown.split(/\n+|(?<=[.!?])\s+/).filter(Boolean)) {
    if (!prohibition.test(sentence) && restrictedDelegateMutation.test(sentence)) {
      results.push(sentence.trim());
      continue;
    }
    const clauses = sentence.split(/\s*;\s*|\s*,?\s*\b(?:but|while|whereas)\b\s*|\s*,?\s+\band\b\s+(?=(?:(?:the )?(?:CEO(?: routine)?|Architect|Security Engineer|Code Reviewer|Technical Writer|Micronaut Engineer|Writer|Engineer|(?:artifact-appropriate )?implementation owner|delivery owner|followThroughOwner)\b|(?:must|should|may|can|will|does|do|never|not|open|update|create|send|promote|publish|implement|install|add|assign|author|rediscover|follow|link|edit|modify|write|commit|push|merge|release|reply|resolve|re-request)\w*\b))/i);
    let inheritedActor = null;
    for (const clause of clauses) {
      const priorActor = inheritedActor;
      const actorMatches = [...clause.matchAll(anyActor)].filter((actor) => {
        if (!restrictedActor.test(actor[0])) return true;
        const before = clause.slice(Math.max(0, actor.index - 16), actor.index);
        const after = clause.slice(actor.index + actor[0].length, actor.index + actor[0].length + 24);
        return !/\b(?:any|optional|final)\s+$/i.test(before)
          && !/^\s+(?:gates?|stages?|sign-off|review)\b/i.test(after)
          && !/^\s+or\s+(?:Security Engineer|Security)\s+gates?\b/i.test(after);
      });
      if (actorMatches.length > 0) inheritedActor = actorMatches.at(-1)[0];
      if (prohibition.test(clause)) continue;
      const directSpecial = passiveMutation.test(clause) || ownerMutation.test(clause) || routineOwnerMutation.test(clause) || restrictedAssigneeMutation.test(clause) || legacyMutation.test(clause);
      if (directSpecial) {
        results.push(clause.trim());
        continue;
      }
      for (const action of clause.matchAll(mutation)) {
        const precedingActors = actorMatches.filter((actor) => actor.index < action.index);
        const actor = precedingActors.at(-1)?.[0] ?? priorActor;
        if (!actor || !restrictedActor.test(actor)) continue;
        const actorIndex = precedingActors.at(-1)?.index ?? 0;
        const authority = clause.slice(actorIndex);
        if (!mutationTarget.test(authority.slice(action.index - actorIndex))) continue;
        results.push(clause.trim());
        break;
      }
    }
  }
  return [...new Set(results)];
}

const route = async () => read("../skills/micronaut-repo-operations/references/intake-routing-release.md");

async function trackedPolicyFiles() {
  const root = new URL("../", import.meta.url);
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: root });
  return stdout.split("\0").filter((path) => /(?:^|\/)(?:README|COMPANY|AGENTS|SKILL|TASK)\.md$|\.ya?ml$/.test(path));
}

function markedYaml(markdown, marker) {
  const markerText = `<!-- ${marker} -->`;
  const markerIndex = markdown.indexOf(markerText);
  assert.notEqual(markerIndex, -1, `missing ${marker} marker`);
  const remainder = markdown.slice(markerIndex + markerText.length).trimStart();
  const fence = remainder.match(/^```yaml\n([\s\S]*?)\n```/);
  assert.ok(fence, `${marker} must be followed by a YAML fence`);
  return YAML.parse(fence[1]);
}

test("QA intake schema makes planningRequired authoritative with an explicit ordered route", async () => {
  const [policy, qa] = await Promise.all([route(), read("../agents/qa-engineer/AGENTS.md")]);
  const schema = markedYaml(policy, "qa-intake-schema");
  const fields = [
    "deliveryClass", "planningRequired", "planningReason",
    "securityPrecheckRequired", "securityFinalReviewRequired", "deliveryOwner",
    "followThroughOwner", "verificationProfile", "stageSequence",
    "evidenceReproduction", "acceptanceCriteria",
  ];
  assert.match(policy, /issue type is only the surface label/i);
  assert.match(qa, /QA is the authoritative classifier/i);
  assert.deepEqual(Object.keys(schema), fields);
  for (const field of fields) {
    assert.match(qa, new RegExp(`\\b${field}\\b`), `QA instructions must require ${field}`);
  }
  assert.equal(schema.deliveryClass, "routine | architectural | security-sensitive | documentation");
  assert.equal(schema.planningRequired, "true | false");
  assert.equal(schema.deliveryOwner, "micronaut-engineer | technical-writer");
  assert.equal(schema.verificationProfile, "source | dependency | docs-prose | docs-executable");
  assert.ok(Array.isArray(schema.stageSequence), "stageSequence must be represented as an ordered list");
});

test("Architect accepts every authoritative planning route regardless of issue type", async () => {
  const architect = await read("../agents/architect/AGENTS.md");
  assert.match(architect, /`qa-intake`[^\n]+`planningRequired: true`[^\n]+current participant[^\n]+`stageSequence`/i);
  assert.match(architect, /Issue type is only a surface label[^\n]+must not override QA's route/i);
  assert.doesNotMatch(architect, /Confirm the issue type is one of/i);
  assert.doesNotMatch(architect, /delivery `type:` gate/i);
});

test("QA-loaded guidance derives routing only from authoritative intake fields", async () => {
  const bodies = await Promise.all([
    read("../agents/qa-engineer/AGENTS.md"),
    read("../skills/micronaut-quality-gates/SKILL.md"),
  ]);
  for (const body of bodies) {
    assert.match(body, /authoritative `qa-intake`[^\n]+(?:booleans[^\n]+)?ordered `stageSequence`/i);
    assert.match(body, /issue type[^\n]+(?:surface label|does not select the route)/i);
    assert.doesNotMatch(body, /stage sequence (?:is correct|for) the issue type|stage sequence for the issue type|participants are correct for the issue type/i);
  }
});

test("public operating roster has nine roles while package import has exactly eight", async () => {
  const [readme, packageYaml] = await Promise.all([read("../README.md"), read("../.paperclip.yaml")]);
  const roster = markedYaml(readme, "operating-role-roster");
  assert.equal(roster.length, 9);
  assert.deepEqual(roster.at(-1), {
    slug: "ui-ux-designer",
    name: "UI/UX Designer",
    source: "live-only",
    model: "gpt-5.6-sol",
    reasoningEffort: "high",
  });

  const packageAgents = YAML.parse(packageYaml).agents;
  assert.equal(Object.keys(packageAgents).length, 8);
  assert.equal(packageAgents["ui-ux-designer"], undefined);
  const { stdout } = await execFileAsync("git", ["ls-files", "agents/*/AGENTS.md"], {
    cwd: new URL("../", import.meta.url),
  });
  const agentFiles = stdout.trim().split("\n").filter(Boolean);
  assert.equal(agentFiles.length, 8);
  assert.ok(agentFiles.every((path) => !path.includes("ui-ux-designer")));
});

test("machine-readable route matrix preserves every required and omitted gate", async () => {
  const matrix = markedYaml(await route(), "workflow-routing-matrix");
  assert.deepEqual(matrix, {
    "lightweight-training": ["micronaut-engineer", "qa-engineer", "code-reviewer", "micronaut-engineer-publication"],
    "routine-bug": ["qa-engineer", "micronaut-engineer", "qa-engineer", "code-reviewer"],
    "architecture-sensitive-bug": ["qa-engineer", "architect", "micronaut-engineer", "qa-engineer", "code-reviewer"],
    "routine-dependency-upgrade": ["qa-engineer", "micronaut-engineer", "qa-engineer", "code-reviewer"],
    "migration-dependency-upgrade": ["qa-engineer", "architect", "micronaut-engineer", "qa-engineer", "code-reviewer"],
    "security-sensitive-source": ["qa-engineer", "security-engineer", "micronaut-engineer", "qa-engineer", "security-engineer", "code-reviewer"],
    "security-sensitive-architectural-source": ["qa-engineer", "security-engineer", "architect", "micronaut-engineer", "qa-engineer", "security-engineer", "code-reviewer"],
    "prose-docs": ["qa-engineer", "technical-writer", "qa-engineer", "code-reviewer"],
    "executable-docs": ["qa-engineer", "technical-writer", "qa-engineer", "code-reviewer"],
    "behavior-changing-executable-docs": ["qa-engineer", "technical-writer", "qa-engineer", "security-engineer", "code-reviewer"],
    "security-sensitive-docs": ["qa-engineer", "security-engineer", "technical-writer", "qa-engineer", "security-engineer", "code-reviewer"],
    "workflow-authority-docs": ["qa-engineer", "architect", "technical-writer", "qa-engineer", "code-reviewer"],
    "security-sensitive-workflow-authority-docs": ["qa-engineer", "security-engineer", "architect", "technical-writer", "qa-engineer", "security-engineer", "code-reviewer"],
    feature: ["qa-engineer", "architect", "micronaut-engineer", "qa-engineer", "code-reviewer"],
  });
});

test("routine and complex bugs have distinct architecture routing", async () => {
  const policy = await route();
  assert.match(policy, /Routine localized bug:[^\n]+QA intake -> Micronaut Engineer -> QA verification -> Code Reviewer[^\n]+skips Architect and Security/i);
  assert.match(policy, /Architecture-sensitive bug:[^\n]+QA intake -> Architect -> Micronaut Engineer -> QA verification -> Code Reviewer/i);
  for (const trigger of ["cross-module", "public API", "concurrency", "structural performance", "native-image", "multiple materially different fixes", "contradictory intended behavior", "failed implementation"]) {
    assert.match(policy, new RegExp(trigger, "i"));
  }
});

test("routine and migration dependency upgrades have distinct architecture routing", async () => {
  const policy = await route();
  assert.match(policy, /Routine compatible dependency upgrade:[^\n]+QA intake -> Micronaut Engineer -> QA verification -> Code Reviewer[^\n]+skips Architect and Security/i);
  assert.match(policy, /Architectural or migration dependency upgrade:[^\n]+QA intake -> Architect -> Micronaut Engineer -> QA verification -> Code Reviewer/i);
  for (const trigger of ["major upgrade", "configuration migration", "BOM", "language", "annotation-processing", "multi-module", "transitive replacement", "compatibility matrix", "disputed strategy"]) {
    assert.match(policy, new RegExp(trigger, "i"));
  }
});

test("security-sensitive work has pre-triage and final security stages", async () => {
  const [policy, security] = await Promise.all([route(), read("../agents/security-engineer/AGENTS.md")]);
  assert.match(policy, /Security Engineer pre-triage -> Architect only when[^\n]+-> Micronaut Engineer -> QA verification -> Security Engineer final review -> Code Reviewer/i);
  assert.match(policy, /pre-triage never replaces final security review/i);
  for (const trigger of ["authentication", "authorization", "secrets", "cryptography", "untrusted input", "serialization", "filesystem", "process execution", "network trust", "dependency vulnerability", "CI permissions", "release credentials", "secure defaults"]) {
    assert.match(policy, new RegExp(trigger, "i"));
  }
  assert.match(security, /requires both pre-triage before implementation and final review after QA/i);
});

test("always-loaded route summary defers to the authoritative conditional stageSequence", async () => {
  const summary = await read("../skills/micronaut-repo-operations/SKILL.md");
  assert.match(summary, /authoritative ordered `qa-intake\.stageSequence`/i);
  assert.match(summary, /issue type alone does not select the route/i);
  assert.match(summary, /routine non-security bugs and compatible dependency upgrades skip Architect and Security/i);
  assert.match(summary, /defined Security triggers add pre-triage before implementation and final review after QA/i);
  assert.match(summary, /routine prose and executable docs[^\n]+Writer -> QA -> (?:Code )?Reviewer/i);
  assert.doesNotMatch(summary, /Bugs: QA intake\/reproducer → Micronaut Engineer → QA verification → Security Engineer → Code Reviewer/);
  assert.doesNotMatch(summary, /Docs: QA intake → Technical Writer → QA verification → Security Engineer → Code Reviewer/);
  assert.doesNotMatch(summary, /dependency upgrades: QA intake → Architect[^\n]+Security Engineer → Code Reviewer/i);
});

test("Security pre-triage and final approval follow their exact stageSequence successors", async () => {
  const [quality, security, securitySkill] = await Promise.all([
    read("../skills/micronaut-quality-gates/SKILL.md"),
    read("../agents/security-engineer/AGENTS.md"),
    read("../skills/micronaut-security-review/SKILL.md"),
  ]);
  for (const body of [quality, security, securitySkill]) {
    assert.match(body, /pre-triage[^\n]+next entry in (?:the )?(?:authoritative )?ordered `qa-intake\.stageSequence`/i);
    assert.match(body, /final (?:Security )?review[^\n]+Code Reviewer/i);
    assert.doesNotMatch(body, /If the work is approved, it moves to Code Reviewer/i);
  }
  assert.match(quality, /pre-triage[^\n]+does not skip Architect, implementation, QA verification, or final Security review/i);
  assert.match(securitySkill, /pre-triage[^\n]+never skips Architect, implementation, QA verification, or final Security review/i);
  assert.match(securitySkill, /inspect[^\n]+review threads[^\n]+do not mutate/i);
  assert.match(securitySkill, /followThroughOwner[^\n]+thread mutation/i);
});

test("QA verification advances to the exact next stage, including routine direct review", async () => {
  const qa = await read("../agents/qa-engineer/AGENTS.md");
  assert.match(qa, /approved[^\n]+exact next entry in (?:the )?authoritative route artifact's ordered `stageSequence`/i);
  assert.match(qa, /routine routes advance directly to Code Reviewer/i);
  assert.match(qa, /defined Security-trigger routes[^\n]+Security final review/i);
  assert.match(qa, /behavior-changing executable instructions[^\n]+securityPrecheckRequired: false[^\n]+securityFinalReviewRequired: true[^\n]+Security final review/i);
  assert.doesNotMatch(qa, /implementation is ready for the security stage/i);
  assert.doesNotMatch(qa, /next `currentParticipant` is the security stage when review stages remain/i);
});

test("documentation uses reduced prose gates and conditional executable security", async () => {
  const policy = await route();
  assert.match(policy, /Prose-only docs:[^\n]+QA intake -> Technical Writer -> QA verification -> Code Reviewer[^\n]+no Security stage/i);
  assert.match(policy, /Routine executable docs:[^\n]+QA intake -> Technical Writer -> QA verification -> Code Reviewer[^\n]+omit Security/i);
  assert.match(policy, /Behavior-changing executable docs[^\n]+QA intake -> Technical Writer -> QA verification -> Security Engineer final review -> Code Reviewer/i);
  assert.match(policy, /securityPrecheckRequired: false[^\n]+securityFinalReviewRequired: true/i);
  assert.match(policy, /Security-sensitive docs:[^\n]+QA intake -> Security Engineer pre-triage -> Technical Writer -> QA verification -> Security Engineer final review -> Code Reviewer/i);
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

test("effective CEO self-improvement policy uses bounded routing fixtures", async () => {
  const [ceo, routine, evolution] = await Promise.all([
    read("../agents/ceo/AGENTS.md"),
    read("../tasks/monthly-ceo-self-improvement/TASK.md"),
    read("../skills/company-package-evolution/SKILL.md"),
  ]);
  const effectivePolicy = [ceo, routine, evolution].join("\n");
  const fixtures = markedYaml(evolution, "ceo-self-improvement-routing");

  assert.deepEqual(fixtures["textual-finding"], {
    deliveryOwner: "technical-writer",
    planningRequired: false,
    adapterBoundaryRequired: false,
    acceptanceEvidence: "exact stale wording and expected corrected wording",
  });
  assert.deepEqual(fixtures["executable-adapter-config-finding"], {
    deliveryOwner: "micronaut-engineer",
    planningRequired: false,
    adapterBoundaryRequired: true,
    acceptanceEvidence: "observable adapter or configuration behavior plus regression assertions",
  });
  assert.deepEqual(fixtures["architectural-adapter-config-finding"].architectureTriggers, [
    "cross-module compatibility", "materially different fixes", "migration", "compatibility matrix", "design ambiguity",
  ]);
  assert.match(effectivePolicy, /executable (?:behavior|impact)[^\n]+adapter\/config[^\n]+(?:alone|by itself)[^\n]+(?:does not|is not)[^\n]+Architect/i);
  assert.match(effectivePolicy, /observable before\/after behavior[^\n]+(?:regression|verification) evidence/i);
  assert.match(effectivePolicy, /textual child[^\n]+exact stale\/current wording[^\n]+expected corrected wording[^\n]+without inventing an adapter boundary/i);
  assert.match(effectivePolicy, /only executable adapter\/config findings[^\n]+(?:name|must name)[^\n]+boundary/i);
  assert.match(ceo, /acceptance criteria[^\n]+never use only[^\n]+intended policy/i);
});

test("referenced skill sources are inert immutable provenance, not runtime-loaded bodies", async () => {
  const approvedSources = {
    "agent-md-refactor": {
      kind: "github-file", repo: "micronaut-projects/micronaut-project-template", path: ".agents/skills/agent-md-refactor/SKILL.md",
      commit: "3eaa6fd9ff1e95634053382a1433dd15967d851e", sha256: "03d33d8097cc96f3cc4cb7f08932db581ada3df78d7239f62e08020103a3b2ba", usage: "referenced",
    },
    coding: {
      kind: "github-file", repo: "micronaut-projects/micronaut-project-template", path: ".agents/skills/coding/SKILL.md",
      commit: "3eaa6fd9ff1e95634053382a1433dd15967d851e", sha256: "1e5f42196b8fd354670ce329e2a653541bf25d542d49eb66578af14cafa31bfb", usage: "referenced",
    },
    docs: {
      kind: "github-file", repo: "micronaut-projects/micronaut-project-template", path: ".agents/skills/docs/SKILL.md",
      commit: "3eaa6fd9ff1e95634053382a1433dd15967d851e", sha256: "cd249e0a7918a8286508d4b61970c3f26c87b581aa70adbc8bb62c96a528c2dd", usage: "referenced",
    },
    "gh-cli": {
      kind: "github-file", repo: "github/awesome-copilot", path: "skills/gh-cli/SKILL.md",
      commit: "e9a7805e2b1dbda5ad4d0cc9be1fc3ef6273e115", sha256: "18e53a9f4c154406a072ed4cfbc524d40f9a4734ef25102086c1ef5e24113a76", usage: "referenced",
    },
    gradle: {
      kind: "github-file", repo: "micronaut-projects/micronaut-project-template", path: ".agents/skills/gradle/SKILL.md",
      commit: "3eaa6fd9ff1e95634053382a1433dd15967d851e", sha256: "f88c6758f26da0c9a034d510845fdb40f43d61abda721253e7bbbb7cd91262ec", usage: "referenced",
    },
    guides: {
      kind: "github-file", repo: "micronaut-projects/micronaut-project-template", path: ".agents/skills/guides/SKILL.md",
      commit: "c604152d418ca3aa32b544922aaf56f1b8ba342d", sha256: "e6d6f600232b7b215290cb40c515d70079811f7b84cdaec9ebb62bba0a7e827e", usage: "referenced",
    },
    "skill-creator": {
      kind: "github-file", repo: "micronaut-projects/micronaut-project-template", path: ".agents/skills/skill-creator/SKILL.md",
      commit: "3eaa6fd9ff1e95634053382a1433dd15967d851e", sha256: "a165278bf1539f78d6adfa4f2c185d73a6a8259edd111f490d9e860e7dbd012c", usage: "referenced",
    },
  };
  const { stdout } = await execFileAsync("git", ["ls-files", "skills/*/SKILL.md"], {
    cwd: new URL("../", import.meta.url),
  });
  const referenced = [];
  for (const path of stdout.trim().split("\n").filter(Boolean)) {
    const markdown = await read(`../${path}`);
    const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    assert.ok(match, `${path} must have YAML frontmatter`);
    const frontmatter = YAML.parse(match[1]);
    for (const source of frontmatter.metadata?.sources ?? []) {
      if (source.usage !== "referenced") continue;
      referenced.push(frontmatter.name);
      assert.deepEqual(
        Object.fromEntries(["kind", "repo", "path", "commit", "sha256", "usage"].map((key) => [key, source[key]])),
        approvedSources[frontmatter.name],
        `${path} referenced source must match the approved immutable provenance tuple`,
      );
      assert.equal(match[2].trim(), "", `${path} must remain an explicit metadata-only local runtime stub`);
    }
  }
  assert.deepEqual(referenced.sort(), ["agent-md-refactor", "coding", "docs", "gh-cli", "gradle", "guides", "skill-creator"]);
  const readme = await read("../README.md");
  assert.match(readme, /`usage: referenced` is inert provenance metadata[^\n]+does not resolve, fetch, or inject the remote source/i);
});

test("every active routine has a complete pinned imported invocation bundle", async () => {
  const specs = {
    "monthly-product-discovery": {
      agent: "product-manager",
      skills: [
        "paperclip-control-plane", "product-discovery", "micronaut-repo-operations", "micronaut-github-operations", "docs", "gh-cli",
        "paperclipai/bundled/quality/qa-acceptance",
        "paperclipai/bundled/paperclip-operations/task-planning",
        "paperclipai/optional/browser/agent-browser",
      ],
    },
    "monthly-security-deep-scan": {
      agent: "security-engineer",
      skills: ["paperclip-control-plane", "micronaut-repo-operations", "micronaut-github-operations", "micronaut-quality-gates", "micronaut-security-review", "coding", "docs", "gradle", "micronaut-test-resources-provider-development"],
    },
    "monthly-user-guide-review": {
      agent: "technical-writer",
      skills: [
        "paperclip-control-plane", "micronaut-repo-operations", "micronaut-github-operations", "micronaut-quality-gates", "docs", "guides",
        "micronaut-test-resources-provider-development", "agent-md-refactor", "skill-creator", "gh-cli",
        "paperclipai/bundled/docs/doc-maintenance",
        "paperclipai/bundled/software-development/github-pr-workflow",
        "paperclipai/optional/browser/agent-browser",
      ],
    },
    "monthly-guide-topic-discovery": {
      agent: "technical-writer",
      skills: [
        "paperclip-control-plane", "micronaut-repo-operations", "micronaut-github-operations", "micronaut-quality-gates", "docs", "guides",
        "micronaut-test-resources-provider-development", "agent-md-refactor", "skill-creator", "gh-cli",
        "paperclipai/bundled/docs/doc-maintenance",
        "paperclipai/bundled/software-development/github-pr-workflow",
        "paperclipai/optional/browser/agent-browser",
      ],
    },
    "monthly-ceo-self-improvement": {
      agent: "ceo",
      skills: ["paperclip-control-plane", "company-package-evolution", "ceo-issue-history", "marketplace-skill-discovery", "paperclipai/bundled/paperclip-operations/issue-triage", "paperclipai/bundled/paperclip-operations/task-planning"],
    },
    training: {
      agent: "ceo",
      skills: ["paperclip-control-plane", "company-package-evolution", "ceo-issue-history", "marketplace-skill-discovery", "paperclipai/bundled/paperclip-operations/issue-triage", "paperclipai/bundled/paperclip-operations/task-planning"],
    },
  };
  const config = YAML.parse(await read("../.paperclip.yaml"));
  const activeRoutines = Object.entries(config.routines)
    .filter(([, routine]) => routine.status === "active")
    .map(([slug]) => slug)
    .sort();
  assert.deepEqual(activeRoutines, Object.keys(specs).sort(), "every active routine must have an audited invocation bundle");

  const digests = {};
  for (const [slug, spec] of Object.entries(specs)) {
    const task = await read(`../tasks/${slug}/TASK.md`);
    const frontmatter = task.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, `${slug} task must have YAML frontmatter`);
    assert.equal(YAML.parse(frontmatter[1]).assignee, spec.agent, `${slug} task assignee must match its audited role bundle`);
    digests[slug] = bundleDigest(await importedInvocationBundle(spec.agent, spec.skills, slug));
  }

  assert.deepEqual(digests, {
    "monthly-product-discovery": "0547b5e175d0bb5faf37e76b18388ad6969ca6e985241d7c8ac5a77084ad2c98",
    "monthly-security-deep-scan": "a191883fd225661b673eef9dda4d768c43dfa1643800fa03fbdbeda65ef3b05c",
    "monthly-user-guide-review": "eb14d10f0fedbbc0d3f058e0452f4f5bcdc73b7c6d2a402a38e3f3e8535d390c",
    "monthly-guide-topic-discovery": "7ef8e11ce2681bdd1c0925deb8bc74b90583a3971723c8bbb885907a9d3a3199",
    "monthly-ceo-self-improvement": "1f45ef4bf80fe75289084eb68045f63c071363cc63d61522e465072aa5cc3854",
    training: "71171ae9488ebab5bf0293702bc3ff068a4e5a51188467a53a4bdde1af62d5d9",
  });
});

test("CEO effective bundle is governance-only", async () => {
  const catalogSkills = ["paperclipai/bundled/paperclip-operations/issue-triage", "paperclipai/bundled/paperclip-operations/task-planning"];
  const expectedSkills = [
    "paperclip-control-plane",
    "company-package-evolution",
    "ceo-issue-history",
    "marketplace-skill-discovery",
    ...catalogSkills,
  ];
  const bundles = await Promise.all([
    importedInvocationBundle("ceo", expectedSkills, "monthly-ceo-self-improvement"),
    importedInvocationBundle("ceo", expectedSkills, "training"),
  ]);
  for (const bundle of bundles) {
    assert.deepEqual(unsafeDeliveryImperatives(bundle), ["- The issue is a single small change you can ship in the same heartbeat. Just ship it."], "only the pinned task-planning rubric example may resemble delivery authority");
    assert.match(bundle, /Neither skill grants implementation or PR authority/i);
    assert.deepEqual(unsafeRootMutationAuthorities(bundle), [], "CEO effective routine bundle must not assign mutation authority to a governance or gate role");
    assert.deepEqual(unsafeMaintainerWaitMutations(bundle), ["- `in_review` with no reviewer participant, no pending interaction, no approval — invalid review path → reassign to a real reviewer or move to `todo`."], "only the pinned task-planning invalid-path example may resemble maintainer-wait mutation");
    assert.match(bundle, /neither may override healthy unassigned maintainer wait/i);
  }
  const indirectMutationProbe = "The issue is a single small change you can ship in the same heartbeat. Just ship it.";
  assert.deepEqual(unsafeDeliveryImperatives(indirectMutationProbe), [indirectMutationProbe]);
  for (const probe of [
    "An in_review item with no reviewer is an invalid review path; reassign it or move it to todo.",
    "Wake the assignee and set the unassigned in_review issue to in_progress.",
    "Assign the unassigned in_review pull request to yourself.",
    "Close the unassigned in_review pull request issue as done.",
  ]) {
    assert.deepEqual(unsafeMaintainerWaitMutations(probe), [probe]);
  }
  for (const forbidden of ["find-skills", "gh-cli", "micronaut-github-operations", "agent-md-refactor", "paperclipai/bundled/software-development/github-pr-workflow"]) {
    assert.ok(!expectedSkills.includes(forbidden), `CEO must not load mutation-capable skill ${forbidden}`);
  }
  assert.equal(bundleDigest(bundles[0]), "1f45ef4bf80fe75289084eb68045f63c071363cc63d61522e465072aa5cc3854");
});

test("implementation owners create and follow their PRs while Reviewer remains a pure gate", async () => {
  const [readme, company, engineer, writer, reviewer, quality, delivery, tools] = await Promise.all([
    read("../README.md"),
    read("../COMPANY.md"),
    read("../agents/micronaut-engineer/AGENTS.md"),
    read("../agents/technical-writer/AGENTS.md"),
    read("../agents/code-reviewer/AGENTS.md"),
    read("../skills/micronaut-quality-gates/SKILL.md"),
    read("../skills/micronaut-repo-operations/references/pr-delivery-evidence.md"),
    read("../skills/micronaut-repo-operations/references/github-sync-tools.md"),
  ]);
  for (const body of [readme, company, engineer, writer, reviewer, quality, delivery, tools]) {
    assert.doesNotMatch(body, /Code Reviewer (?:normally )?creates? the (?:final )?(?:GitHub )?PR|code-reviewer` creates the GitHub PR/i);
    assert.doesNotMatch(body, /QA and Security(?: Engineer)? (?:artifacts both |stages )?approved before (?:you |the Code Reviewer )?(?:create|creates|created) (?:one|the PR)/i);
  }
  assert.match(engineer, /publication mode/i);
  assert.match(engineer, /publish exactly the approved manifest SHA and metadata/i);
  assert.match(writer, /publication mode/i);
  assert.match(writer, /publish exactly the approved `publication-manifest` SHA and metadata/i);
  assert.match(reviewer, /must not create, update, or publish the PR/i);
  assert.match(reviewer, /every upstream gate/i);
  assert.doesNotMatch(
    reviewer,
    /paperclip-github-plugin:(?:create_pull_request|update_pull_request|upload_pull_request_asset|add_pull_request_to_project|request_pull_request_reviewers)/,
    "Code Reviewer instructions must expose no GitHub write tools.",
  );
});

test("root company policy delegates mutation-bearing routine work to implementation owners", async () => {
  const [company, readme] = await Promise.all([read("../COMPANY.md"), read("../README.md")]);
  for (const [label, policy] of [["COMPANY.md", company], ["README.md", readme]]) {
    assert.deepEqual(unsafeRootMutationAuthorities(policy), [], `${label} must not restore delivery authority to CEO, routine coordinators, Security, or Reviewer`);
  }
  const rootPolicy = `${company}\n${readme}`;
  assert.match(company, /CEO routine classifies[\s\S]{0,500}scoped QA-assigned child/i);
  assert.match(company, /artifact-appropriate implementation owner creates or updates any repository branch and PR[\s\S]{0,250}review-thread follow-through/i);
  assert.match(company, /CEO does not open, update, rediscover, or follow repository PRs/i);
  assert.match(company, /set assignee to the artifact-appropriate implementation owner rather than the routine owner/i);
  assert.match(company, /CEO, Security Engineer, and Code Reviewer must not be assigned mutation-bearing out-of-pipeline PR children/i);
  assert.match(readme, /For reusable default improvements, CEO classifies the finding and creates a scoped QA-assigned child[\s\S]{0,250}artifact-appropriate implementation owner promotes the change through a PR/i);
  assert.match(readme, /CEO classifies it and creates a scoped QA-assigned child[\s\S]{0,250}artifact-appropriate implementation owner promotes it through a PR/i);
  for (const retiredPolicy of [
    /sets? assignee to the routine owner before doing the project-specific work/i,
    /CEO routine may promote[\s\S]{0,300}PRs/i,
    /CEO-opened PRs/i,
    /CEO should promote it through a PR/i,
    /promoted by the CEO through a PR/i,
    /assignee Architect[\s\S]{0,180}(?:PR|pull request|implementation)/i,
  ]) {
    assert.doesNotMatch(rootPolicy, retiredPolicy);
  }
  for (const probe of [
    "The CEO may open and follow repository PRs.",
    "Set assignee to the routine owner before opening the PR.",
    "Security Engineer creates and follows repository PRs.",
    "Code Reviewer owns PR follow-through and review-thread resolution.",
    "Reusable package defaults should be promoted by the CEO through a PR.",
    "The CEO should promote it through a PR.",
    "Set assignee Architect for the new company skill pull request implementation.",
    "After approval, CEO publishes the approved skill pull request.",
    "Assign Architect to implement and publish the company-skill pull request.",
    "Security Engineer publishes repository branches and updates pull requests for accepted findings.",
    "Architect publishes repository branches and updates pull requests for accepted plans.",
  ]) {
    assert.ok(unsafeRootMutationAuthorities(probe).length >= 1, `expected unsafe authority detection in: ${probe}`);
  }
  assert.equal(
    unsafeRootMutationAuthorities("CEO does not open pull requests, but CEO publishes repository branches for approved changes.").length,
    1,
    "a prohibited clause must not hide an independent mutation grant",
  );
  assert.deepEqual(
    unsafeRootMutationAuthorities("Security Engineer creates a security report, and the Technical Writer updates the pull request."),
    [],
    "a later implementation-owner mutation must not be attributed to an earlier gate actor",
  );
});

test("repository-wide policy never grants mutation authority to governance or gate roles", async () => {
  for (const file of await trackedPolicyFiles()) {
    const content = await read(`../${file}`);
    assert.deepEqual(
      unsafeRootMutationAuthorities(content),
      [],
      `${file} grants repository, PR, review-thread, or skill mutation authority to CEO, Architect, Security Engineer, or Code Reviewer`,
    );
  }
});

test("healthy PR wait remains unassigned in review", async () => {
  const readme = await read("../README.md");
  assert.match(readme, /IN_REVIEW --> IN_REVIEW: Final stage approves; healthy PR waits unassigned/);
  assert.doesNotMatch(readme, /IN_REVIEW --> TODO: Final stage approves PR-based work/);
  assert.match(readme, /restore `IN_REVIEW`, clear the internal assignee/i);
});

test("repository-wide policy never assigns PR mutation to Code Reviewer", async () => {
  const forbiddenReviewerTools = /paperclip-github-plugin:(?:create_pull_request|update_pull_request|upload_pull_request_asset|add_pull_request_to_project|request_pull_request_reviewers|reply_to_review_thread|resolve_review_thread|unresolve_review_thread)/;
  const forbiddenAssignments = [
    /Code Reviewer\s+(?:(?:must|will|may|should|can)\s+|(?:is|remains)\s+(?:responsible\s+for\s+)?|owns?\s+)?(?:creates?|updates?|publishes?|uploads?|embeds?|finalizes?|requests?)\s+(?:the\s+)?(?:PR|pull request|PR body|asset|reviewer)/i,
    /Code Reviewer\s+(?:(?:must|will|may|should|can)\s+|(?:is|remains)\s+(?:responsible\s+for\s+)?|owns?\s+)?(?:replies?\s+to|resolves?|unresolves?)\s+(?:the\s+)?(?:review thread|thread)/i,
    /(?:PR|pull request|PR body|asset|review thread|thread)[^\n.!?]{0,120}\b(?:created|updated|published|uploaded|embedded|finalized|replied to|resolved|unresolved)\s+by\s+(?:the\s+)?Code Reviewer/i,
  ];
  for (const file of await trackedPolicyFiles()) {
    const content = await read(`../${file}`);
    if (file === "agents/code-reviewer/AGENTS.md") {
      assert.doesNotMatch(content, forbiddenReviewerTools, `${file} exposes a reviewer mutation tool`);
    }
    for (const line of content.split("\n")) {
      for (const pattern of forbiddenAssignments) {
        assert.doesNotMatch(line, pattern, `${file} assigns a mutation to Code Reviewer: ${line}`);
      }
    }
  }
});

test("effective Reviewer and Security bundles keep repository delivery mutations scoped", async () => {
  const reviewerBundle = await importedAgentBundle("code-reviewer", [
    "paperclip-control-plane",
    "micronaut-repo-operations",
    "micronaut-github-operations",
    "micronaut-quality-gates",
    "coding", "docs", "gradle", "micronaut-test-resources-provider-development", "micronaut-graalvm-native-development", "skill-creator", "gh-cli", "paperclipai/optional/browser/agent-browser",
  ]);
  const securityBundle = await importedInvocationBundle("security-engineer", [
    "paperclip-control-plane",
    "micronaut-repo-operations",
    "micronaut-github-operations",
    "micronaut-quality-gates",
    "micronaut-security-review",
    "coding", "docs", "gradle", "micronaut-test-resources-provider-development",
  ], "monthly-security-deep-scan");

  assert.deepEqual(unsafeDeliveryImperatives(reviewerBundle), [], "Reviewer effective bundle must remain non-mutating");
  const mutationProbe = "edit the branch, commit and push fixes, update the pull request, reply to and resolve every review thread, then re-request review";
  assert.deepEqual(unsafeDeliveryImperatives(mutationProbe), [mutationProbe]);
  const reviewerDigest = "2522e05a910a4b1f2253ddde1477beaa9c33f4eb3faca95af60b56402f0ea11b";
  assert.equal(bundleDigest(reviewerBundle), reviewerDigest);
  assert.notEqual(
    bundleDigest(`${reviewerBundle}\nUpdate documentation and source files in the same pass.`),
    reviewerDigest,
    "any injected effective-bundle instruction must invalidate the approved bundle",
  );
  assert.match(securityBundle, /Security Engineer and Code Reviewer are read-only/i);
  assert.match(securityBundle, /Only role-authorized implementation owners and `followThroughOwner` may use GitHub write tools/i);
  assert.deepEqual(
    unsafeDeliveryImperatives(securityBundle),
    [],
    "Security effective invocation bundle must not grant unconditional repository delivery mutations",
  );
  assert.deepEqual(
    unsafeRootMutationAuthorities(securityBundle),
    [],
    "Security effective invocation bundle must not assign repository or PR mutation authority to a governance or gate role",
  );
  assert.equal(bundleDigest(securityBundle), "a191883fd225661b673eef9dda4d768c43dfa1643800fa03fbdbeda65ef3b05c");
});

test("Security inspects review threads but followThroughOwner performs thread mutations", async () => {
  const [security, securitySkill, githubOperations, legacyGithubReference] = await Promise.all([
    read("../agents/security-engineer/AGENTS.md"),
    read("../skills/micronaut-security-review/SKILL.md"),
    read("../skills/micronaut-github-operations/SKILL.md"),
    read("../skills/micronaut-repo-operations/references/github-sync-tools.md"),
  ]);
  for (const body of [security, securitySkill]) {
    assert.match(body, /inspect[^\n]+review threads/i);
    assert.match(body, /followThroughOwner[^\n]+(?:replies[^\n]+resolves|thread mutation)/i);
    assert.doesNotMatch(body, /paperclip-github-plugin:(?:reply_to_review_thread|resolve_review_thread|unresolve_review_thread)/);
  }
  for (const body of [githubOperations, legacyGithubReference]) {
    assert.match(body, /Only role-authorized implementation owners and `followThroughOwner` may use GitHub write tools/i);
    assert.match(body, /Security Engineer and Code Reviewer[^\n]+read-only/i);
    assert.match(body, /Security Engineer and Code Reviewer[^\n]+must not[^\n]+(?:reply|resolve|unresolve)/i);
  }
  assert.doesNotMatch(legacyGithubReference, /\bgit push\b|\band pushes\b/i);
});

test("prose-only docs omit Security consistently and stale global routes are rejected", async () => {
  const [readme, company, writer, reviewer, quality] = await Promise.all([
    read("../README.md"),
    read("../COMPANY.md"),
    read("../agents/technical-writer/AGENTS.md"),
    read("../agents/code-reviewer/AGENTS.md"),
    read("../skills/micronaut-quality-gates/SKILL.md"),
  ]);
  assert.doesNotMatch(writer, /`type: docs` issues still move through QA, Security Engineer, and Code Reviewer/i);
  assert.doesNotMatch(reviewer, /latest security artifact/i);
  assert.doesNotMatch(company, /Architect[^\n]+planning stage for[^\n]+`type: dependency-upgrade` work/i);
  assert.doesNotMatch(company, /QA Engineer[^\n]+approves the work for security review/i);
  assert.doesNotMatch(company, /Micronaut Engineer[^\n]+handles PR follow-through after PR creation/i);
  for (const body of [readme, company, writer, reviewer, quality]) {
    assert.match(body, /(?:routine )?prose(?:-only)?(?: and executable)? docs[^\n]+(?:omit|no|without) (?:the )?Security|(?:routine )?prose(?:-only)?(?: and executable)? docs[^\n]+Writer -> QA -> (?:Code )?Reviewer/i);
  }
});

test("tracked policy never tells an agent to invoke another agent's heartbeat", async () => {
  const violations = [];
  for (const file of await trackedPolicyFiles()) {
    const markdown = await read(`../${file}`);
    for (const line of unsafeCrossAgentWakeInstructions(markdown)) violations.push(`${file}: ${line.trim()}`);
  }
  assert.deepEqual(violations, []);
});

test("PR follow-through re-enters gates by actual change effect", async () => {
  const [control, qa, architect, company, readme] = await Promise.all([
    read("../skills/micronaut-repo-operations/references/workflow-control-plane.md"),
    read("../agents/qa-engineer/AGENTS.md"),
    read("../agents/architect/AGENTS.md"),
    read("../COMPANY.md"),
    read("../README.md"),
  ]);
  assert.match(control, /routine source, test, dependency, or build changes go Micronaut Engineer -> QA -> Code Reviewer/i);
  assert.match(control, /routine prose or executable docs go Technical Writer -> QA -> Code Reviewer/i);
  for (const [label, summary] of [["control plane", control], ["README", readme]]) {
    assert.match(summary, /behavior-changing executable instructions[^\n]+no established (?:Security )?pre-triage trigger/i, `${label} must omit pre-triage for S6`);
    assert.match(summary, /behavior-changing executable instructions[^\n]+securityPrecheckRequired: false[^\n]+securityFinalReviewRequired: true|behavior-changing executable instructions[^\n]+securityFinalReviewRequired: true[^\n]+securityPrecheckRequired: false/i, `${label} must preserve S6 booleans`);
    assert.match(summary, /behavior-changing executable instructions[^\n]+(?:Technical )?Writer -> QA -> Security final -> (?:Code )?Reviewer/i, `${label} must preserve final Security for S6`);
    assert.doesNotMatch(summary, /behavior-changing executable instructions[^\n]+securityPrecheckRequired: true/i, `${label} must not add S6 pre-triage`);
  }
  assert.match(control, /defined Security triggers add pre-triage before the owner and final Security review after QA/i);
  assert.match(control, /design-changing requests go Architect -> recorded implementation owner -> applicable gates/i);
  assert.match(control, /clean rebase with green CI returns to maintainer wait/i);
  assert.match(control, /conflicts or semantic changes rerun the applicable gates/i);
  assert.match(control, /followThroughAssigneeAgentId/);
  assert.match(control, /does not implement plugin code/i);
  for (const body of [qa, architect, company, readme]) {
    assert.match(body, /reopens a PR-based issue[^\n]+recorded `qa-intake\.followThroughOwner`/i);
    assert.match(body, /source, test, dependency, or build repair belongs to Micronaut Engineer/i);
    assert.match(body, /prose, docs, guide, `AGENTS\.md`, role-instruction, and textual control-plane follow-through remains with Technical Writer/i);
  }
  for (const file of await trackedPolicyFiles()) {
    const content = await read(`../${file}`);
    assert.doesNotMatch(
      content,
      /reopens a PR-based issue[^\n]+Route it to (?:the )?Micronaut Engineer/i,
      `${file} bypasses the recorded follow-through owner on PR re-entry`,
    );
  }
});
