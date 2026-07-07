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

async function effectiveAgentBundle(agentSlug, expectedSkills, allowedCatalogSkills = []) {
  const rolePath = `../agents/${agentSlug}/AGENTS.md`;
  const role = await read(rolePath);
  const frontmatter = role.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(frontmatter, `${rolePath} must have YAML frontmatter`);
  const skills = YAML.parse(frontmatter[1]).skills;
  assert.deepEqual(skills, expectedSkills, `${agentSlug} must use the audited exact skill grant set`);

  const documents = [[rolePath, role]];
  for (const skill of skills) {
    if (skill.startsWith("paperclipai/")) {
      assert.ok(allowedCatalogSkills.includes(skill), `${agentSlug} must not load unaudited catalog skill ${skill}`);
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

function bundleDigest(bundle) {
  return createHash("sha256").update(bundle).digest("hex");
}

function unsafeDeliveryImperatives(bundle) {
  const imperative = /^\s*(?:[-*]\s*)?(?:(?:you|the reviewer|the security engineer)\s+)?(?:(?:must|should|can)\s+)?(?:edit|modify|write|commit|push|merge|publish|release|create|update|reply|resolve|re-request)(?:\s|:)/i;
  const deliveryTarget = /\b(?:branches?|pull requests?|prs?|repositories|review threads?|releases?)\b/i;
  const prohibited = /\b(?:must not|do not|never|prohibited|read-only|non-mutating)\b/i;
  const otherOwner = /\b(?:implementation owner|delivery owner|follow-through owner|technical writer|micronaut engineer)\b/i;
  return bundle.split("\n").filter((line) =>
    imperative.test(line)
    && deliveryTarget.test(line)
    && !prohibited.test(line)
    && !otherOwner.test(line)
  );
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
  assert.match(qa, /approved[^\n]+exact next entry in (?:the )?authoritative ordered `qa-intake\.stageSequence`/i);
  assert.match(qa, /routine routes advance directly to Code Reviewer/i);
  assert.match(qa, /security-sensitive routes advance to Security final review/i);
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

test("CEO effective bundle is governance-only", async () => {
  const catalogSkills = [
    "paperclipai/bundled/paperclip-operations/issue-triage",
    "paperclipai/bundled/paperclip-operations/task-planning",
  ];
  const expectedSkills = [
    "company-package-evolution",
    "ceo-issue-history",
    "find-skills",
    ...catalogSkills,
  ];
  const bundle = await effectiveAgentBundle("ceo", expectedSkills, catalogSkills);
  assert.deepEqual(unsafeDeliveryImperatives(bundle), [], "CEO effective local bundle must not authorize repository or PR delivery");
  for (const forbidden of ["gh-cli", "micronaut-github-operations", "micronaut-repo-operations", "agent-md-refactor", "paperclipai/bundled/software-development/github-pr-workflow"]) {
    assert.ok(!expectedSkills.includes(forbidden), `CEO must not load mutation-capable skill ${forbidden}`);
  }
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
  assert.match(engineer, /create or update the PR[\s\S]{0,300}before QA verification/i);
  assert.match(writer, /create or update the PR[\s\S]{0,300}before QA verification/i);
  assert.match(reviewer, /must not create, update, or publish the PR/i);
  assert.match(reviewer, /applicable upstream gates/i);
  assert.doesNotMatch(
    reviewer,
    /paperclip-github-plugin:(?:create_pull_request|update_pull_request|upload_pull_request_asset|add_pull_request_to_project|request_pull_request_reviewers)/,
    "Code Reviewer instructions must expose no GitHub write tools.",
  );
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
  const reviewerBundle = await effectiveAgentBundle("code-reviewer", [
    "micronaut-repo-operations",
    "micronaut-github-operations",
    "micronaut-quality-gates",
  ]);
  const securityBundle = await effectiveAgentBundle("security-engineer", [
    "micronaut-repo-operations",
    "micronaut-github-operations",
    "micronaut-quality-gates",
    "micronaut-security-review",
  ]);

  assert.deepEqual(unsafeDeliveryImperatives(reviewerBundle), [], "Reviewer effective bundle must remain non-mutating");
  const mutationProbe = "edit the branch, commit and push fixes, update the pull request, reply to and resolve every review thread, then re-request review";
  assert.deepEqual(unsafeDeliveryImperatives(mutationProbe), [mutationProbe]);
  const reviewerDigest = "dff3369947c61260257d653820433e510d1944b81324dca69d081d09f41b1d82";
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
    "Security effective bundle must not grant unconditional repository delivery mutations",
  );
  assert.equal(bundleDigest(securityBundle), "38ad28624eb253141096f5ec0e9b51f6f9be945bbae7effc3330ab077e515b52");
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
