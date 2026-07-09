import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

async function readGuidePolicy() {
  return (await Promise.all([
    read("../skills/micronaut-repo-operations/references/internal-routines-overlays.md"),
    read("../skills/micronaut-repo-operations/references/intake-routing-release.md"),
    read("../skills/micronaut-repo-operations/references/pr-delivery-evidence.md"),
  ])).join("\n");
}

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(match, "Expected Markdown file to include frontmatter.");
  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

function assertContains(value, pattern, message) {
  assert.ok(pattern.test(value), message);
}

const ACTUAL_PROJECT_ROUTINE_SUBTASK_PATTERN =
  /(?:sub-issue|child issue|subtask)[\s\S]{0,220}(?:actual|corresponding)[\s\S]{0,120}(?:Paperclip )?project|(?:actual|corresponding)[\s\S]{0,120}(?:Paperclip )?project[\s\S]{0,220}(?:sub-issue|child issue|subtask)/i;
const ROUTINE_OWNER_ASSIGNEE_PATTERN =
  /(?:sub-issue|child issue|subtask)[\s\S]{0,220}(?:assigned|assignee)[\s\S]{0,160}(?:Technical Writer|technical-writer|routine owner|self|yourself)|(?:assigned|assignee)[\s\S]{0,160}(?:Technical Writer|technical-writer|routine owner|self|yourself)[\s\S]{0,220}(?:sub-issue|child issue|subtask)/i;
const PROJECT_TEMPLATE_GUIDE_EXCLUSION_PATTERN =
  /micronaut-project-template[\s\S]{0,260}(?:not an actual Micronaut project|repository template|file sync|sync files)[\s\S]{0,260}(?:skip|exclude|not eligible|do not)[\s\S]{0,260}(?:user guide|guide topic|standalone guide|guide routines)|(?:skip|exclude|not eligible|do not)[\s\S]{0,260}micronaut-project-template[\s\S]{0,260}(?:user guide|guide topic|standalone guide|guide routines)/i;
const MICRONAUT_BUILD_GUIDE_EXCLUSION_PATTERN =
  /micronaut-build[\s\S]{0,260}(?:internal Gradle plugins|Micronaut committers|not intended.*user|not end users|not an end-user project)[\s\S]{0,260}(?:skip|exclude|not eligible|do not)[\s\S]{0,260}(?:user guide|guide topic|standalone guide|guide routines)|(?:skip|exclude|not eligible|do not)[\s\S]{0,260}micronaut-build[\s\S]{0,260}(?:user guide|guide topic|standalone guide|guide routines)/i;
const ROUTINE_COORDINATOR_ONLY_PATTERN =
  /routine issue[\s\S]{0,260}(?:coordinator|coordination)[\s\S]{0,260}(?:does not|must not|do not)[\s\S]{0,160}(?:open|create|update)[\s\S]{0,120}(?:PR|pull request)|(?:does not|must not|do not)[\s\S]{0,160}(?:open|create|update)[\s\S]{0,120}(?:PR|pull request)[\s\S]{0,260}routine issue/i;
const SUBTASK_PR_DECISION_PATTERN =
  /(?:PR|pull request|documentation fix|guide PR)[\s\S]{0,260}(?:only|exclusively)[\s\S]{0,180}(?:inside|from)[\s\S]{0,120}(?:sub-issue|child issue|subtask)|(?:sub-issue|child issue|subtask)[\s\S]{0,260}(?:only|exclusively)[\s\S]{0,180}(?:open|create|update|decide)[\s\S]{0,120}(?:PR|pull request|documentation fix|guide PR)/i;
const NO_TOP_LEVEL_ROUTINE_FOLLOWUP_PATTERN =
  /(?:do not|must not|never)[\s\S]{0,160}(?:create|open)[\s\S]{0,160}top-level[\s\S]{0,160}(?:project-specific )?(?:issue|Paperclip issue)[\s\S]{0,220}(?:monthly-user-guide-review|monthly-guide-topic-discovery|guide routine|routine issue)|(?:monthly-user-guide-review|monthly-guide-topic-discovery|guide routine|routine issue)[\s\S]{0,220}(?:do not|must not|never)[\s\S]{0,160}(?:create|open)[\s\S]{0,160}top-level[\s\S]{0,160}(?:project-specific )?(?:issue|Paperclip issue)/i;
const GUIDE_PR_TYPE_DOCS_PATTERN =
  /(?:guide|documentation|docs)[\s\S]{0,220}(?:PR|pull request)[\s\S]{0,220}`?type: docs`?|`?type: docs`?[\s\S]{0,220}(?:guide|documentation|docs)[\s\S]{0,220}(?:PR|pull request)/i;
const SKIP_CI_COMMIT_PATTERN =
  /(?:guide|docs|documentation)[\s\S]{0,220}(?:PR|pull request)[\s\S]{0,260}(?:CI (?:is )?not needed|CI is not required|not exercised by the build|build does not exercise)[\s\S]{0,260}(?:commit|commits|commit message)[\s\S]{0,180}(?:skip ci|\[skip ci\])|(?:commit|commits|commit message)[\s\S]{0,180}(?:skip ci|\[skip ci\])[\s\S]{0,260}(?:CI (?:is )?not needed|CI is not required|not exercised by the build|build does not exercise)[\s\S]{0,220}(?:guide|docs|documentation)[\s\S]{0,220}(?:PR|pull request)/i;
const UPDATE_FROM_TARGET_BRANCH_PATTERN =
  /before (?:preparing|publishing|opening|updating)[^\n]*(?:guide|documentation|docs)[^\n]*(?:candidate|PR|pull request)[^\n]*(?:update|rebase|merge|sync)[^\n]*(?:target|base|default) branch|(?:update|rebase|merge|sync)[^\n]*(?:target|base|default) branch[^\n]*before[^\n]*(?:preparing|publishing|opening|updating)[^\n]*(?:candidate|PR|pull request)/i;
const CONFLICT_BLOCKER_PATTERN =
  /(?:conflict|merge conflict|rebase conflict)[\s\S]{0,220}(?:blocker|blocked|do not (?:open|update|prepare|publish)|must not (?:open|update|prepare|publish))|(?:do not (?:open|update|prepare|publish)|must not (?:open|update|prepare|publish)|blocker|blocked)[\s\S]{0,220}(?:conflict|merge conflict|rebase conflict)/i;

test("Technical Writer owns monthly guide review and topic discovery routines", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const guideReview = extension.routines?.["monthly-user-guide-review"];
  const guideTopic = extension.routines?.["monthly-guide-topic-discovery"];

  assert.equal(extension.routines?.["monthly-security-deep-scan"]?.triggers?.[0]?.cronExpression, "0 1 5 * *");
  assert.equal(extension.routines?.["monthly-ceo-self-improvement"]?.triggers?.[0]?.cronExpression, "0 3 20 * *");
  assert.equal(extension.routines?.training?.triggers?.[0]?.cronExpression, "0 2 25 * *");

  assert.equal(guideReview?.status, "active");
  assert.equal(guideReview?.triggers?.[0]?.label, "Monthly User Guide Review");
  assert.equal(guideReview?.triggers?.[0]?.cronExpression, "0 1 10 * *");
  assert.equal(guideReview?.triggers?.[0]?.timezone, "Europe/Madrid");

  assert.equal(guideTopic?.status, "active");
  assert.equal(guideTopic?.triggers?.[0]?.label, "Monthly Guide Topic Discovery");
  assert.equal(guideTopic?.triggers?.[0]?.cronExpression, "0 1 15 * *");
  assert.equal(guideTopic?.triggers?.[0]?.timezone, "Europe/Madrid");
});

test("Monthly User Guide Review task requires fact-checked guide validation", async () => {
  const taskMarkdown = await read("../tasks/monthly-user-guide-review/TASK.md");
  const { frontmatter, body } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Monthly User Guide Review");
  assert.equal(frontmatter.assignee, "technical-writer");
  assert.equal(frontmatter.project, "company-operations");
  assert.equal(frontmatter.recurring, true);
  assertContains(body, /Micronaut-related Paperclip projects/i, "User guide review should iterate Micronaut-related projects.");
  assertContains(body, /\.\/gradlew publishGuide/i, "User guide review should assemble the guide with publishGuide.");
  assertContains(body, /throwaway (?:applications|apps|projects)/i, "User guide review should fact-check with throwaway apps or projects.");
  assertContains(body, /fact-check[\s\S]{0,160}proposed/i, "User guide review should fact-check proposed changes.");
  assertContains(body, /first run[\s\S]{0,220}full guide review|full guide review[\s\S]{0,220}first run/i, "User guide review should do a full first pass.");
  assertContains(body, /prior routine report[\s\S]{0,260}(?:delta|diff|recent commits)|(?:delta|diff|recent commits)[\s\S]{0,260}prior routine report/i, "User guide review should use prior reports and deltas after the first run.");
  assertContains(body, ACTUAL_PROJECT_ROUTINE_SUBTASK_PATTERN, "User guide review should create project-specific subtasks in the actual project being reviewed.");
  assertContains(body, ROUTINE_OWNER_ASSIGNEE_PATTERN, "User guide review should assign project-specific subtasks to the Technical Writer.");
  assertContains(body, /PR/i, "User guide review project subtasks should be allowed to open or update PRs.");
});

test("Monthly Guide Topic Discovery task uses the Micronaut Guides skill", async () => {
  const taskMarkdown = await read("../tasks/monthly-guide-topic-discovery/TASK.md");
  const { frontmatter, body } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Monthly Guide Topic Discovery");
  assert.equal(frontmatter.assignee, "technical-writer");
  assert.equal(frontmatter.project, "company-operations");
  assert.equal(frontmatter.recurring, true);
  assertContains(body, /Micronaut-related Paperclip projects/i, "Guide topic discovery should iterate Micronaut-related projects.");
  assertContains(body, /`?guides`? skill/i, "Guide topic discovery should use the guides skill.");
  assertContains(body, /missing guide topics?/i, "Guide topic discovery should identify missing guide topics.");
  assertContains(body, /deduplic/i, "Guide topic discovery should deduplicate guide topics.");
  assertContains(body, /micronaut-guides/i, "Guide topic discovery should target micronaut-guides for standalone guides.");
  assertContains(body, /existing[\s\S]{0,180}(?:PR|pull request)[\s\S]{0,220}micronaut-guides|micronaut-guides[\s\S]{0,220}existing[\s\S]{0,180}(?:PR|pull request)/i, "Guide topic discovery should check existing micronaut-guides PRs.");
  assertContains(body, /assigned issue[\s\S]{0,220}(?:work in progress|avoid|do not create)|(?:work in progress|avoid|do not create)[\s\S]{0,220}assigned issue/i, "Guide topic discovery should treat assigned guide issues as work in progress.");
  assertContains(body, ACTUAL_PROJECT_ROUTINE_SUBTASK_PATTERN, "Guide topic discovery should create project-specific subtasks in the actual project being reviewed.");
  assertContains(body, ROUTINE_OWNER_ASSIGNEE_PATTERN, "Guide topic discovery should assign project-specific subtasks to the Technical Writer.");
  assertContains(body, /PR/i, "Guide topic discovery project subtasks should be allowed to open or update PRs.");
  assertContains(body, /PDF[\s\S]{0,160}(?:PR-visible|attachment|artifact)/i, "Guide topic discovery should require the generated PDF to be visible from the PR.");
  assertContains(body, /do not commit the PDF|PDF[\s\S]{0,120}not committed/i, "Guide topic discovery should keep generated PDFs out of repository commits.");
});

test("Technical Writer has guide-routine and CI-skip guidance", async () => {
  const writerMarkdown = await read("../agents/technical-writer/AGENTS.md");
  const { frontmatter, body } = parseFrontmatter(writerMarkdown);

  assert.ok(frontmatter.skills.includes("guides"));
  assertContains(body, /monthly-user-guide-review/i, "Technical Writer should know the user guide review mode.");
  assertContains(body, /monthly-guide-topic-discovery/i, "Technical Writer should know the guide topic discovery mode.");
  assertContains(body, /\.\/gradlew publishGuide/i, "Technical Writer should mention publishGuide.");
  assertContains(body, /throwaway (?:applications|apps|projects)/i, "Technical Writer should mention throwaway app fact-checking.");
  assertContains(body, /fact-check[\s\S]{0,160}proposed/i, "Technical Writer should fact-check proposed changes.");
  assertContains(body, /assigned issue[\s\S]{0,260}(?:work in progress|avoid|do not create)|(?:work in progress|avoid|do not create)[\s\S]{0,260}assigned issue/i, "Technical Writer should avoid duplicate guide work when assigned guide issues exist.");
  assertContains(body, /delta/i, "Technical Writer should mention delta review after the first run.");
  assertContains(body, ACTUAL_PROJECT_ROUTINE_SUBTASK_PATTERN, "Technical Writer should create weekly routine subtasks in the actual project being reviewed.");
  assertContains(body, ROUTINE_OWNER_ASSIGNEE_PATTERN, "Technical Writer should assign weekly routine subtasks to Technical Writer.");
  assertContains(body, /skip ci|\[skip ci\]/i, "Technical Writer should mention CI-skip guidance.");
  assertContains(body, /PDF[\s\S]{0,200}(?:PR-visible|attachment|artifact)/i, "Technical Writer should attach or link generated PDFs from standalone guide PRs.");

  const skillMarkdown = await read("../skills/guides/SKILL.md");
  const { frontmatter: skillFrontmatter } = parseFrontmatter(skillMarkdown);
  const source = skillFrontmatter.metadata?.sources?.[0];

  assert.equal(skillFrontmatter.name, "guides");
  assert.equal(source?.repo, "micronaut-projects/micronaut-project-template");
  assert.equal(source?.path, ".agents/skills/guides/SKILL.md");
  assert.equal(source?.usage, "referenced");
});

test("docs-only CI skip guidance is documented in shared package surfaces", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const repoOperations = await readGuidePolicy();

  for (const [label, markdown] of [
    ["README", readme],
    ["COMPANY", company],
    ["repo operations", repoOperations],
  ]) {
    assertContains(markdown, /skip ci|\[skip ci\]/i, `${label} should mention CI-skip keywords.`);
    assertContains(markdown, /documentation[\s\S]{0,220}(?:not exercised by the build|build does not exercise)|(?:not exercised by the build|build does not exercise)[\s\S]{0,220}documentation/i, `${label} should scope CI-skip guidance to docs not exercised by the build.`);
    assertContains(markdown, /(?:publishGuide|generated guides|executable examples|build-validated snippets)/i, `${label} should preserve validation for build-exercised docs.`);
  }
});

test("guide routines exclude non-user-facing infrastructure repositories", async () => {
  const guideReview = await read("../tasks/monthly-user-guide-review/TASK.md");
  const guideTopic = await read("../tasks/monthly-guide-topic-discovery/TASK.md");
  const writer = await read("../agents/technical-writer/AGENTS.md");
  const repoOperations = await readGuidePolicy();
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");

  for (const [label, markdown] of [
    ["monthly-user-guide-review", guideReview],
    ["monthly-guide-topic-discovery", guideTopic],
    ["Technical Writer", writer],
    ["repo operations", repoOperations],
    ["README", readme],
    ["COMPANY", company],
  ]) {
    assertContains(
      markdown,
      PROJECT_TEMPLATE_GUIDE_EXCLUSION_PATTERN,
      `${label} should exclude micronaut-project-template from user-guide and guide-topic routines.`,
    );
    assertContains(
      markdown,
      MICRONAUT_BUILD_GUIDE_EXCLUSION_PATTERN,
      `${label} should exclude micronaut-build from user-guide and guide-topic routines.`,
    );
  }
});

test("guide routine issues only coordinate project subtasks", async () => {
  const guideReview = await read("../tasks/monthly-user-guide-review/TASK.md");
  const guideTopic = await read("../tasks/monthly-guide-topic-discovery/TASK.md");
  const writer = await read("../agents/technical-writer/AGENTS.md");
  const repoOperations = await readGuidePolicy();

  for (const [label, markdown] of [
    ["monthly-user-guide-review", guideReview],
    ["monthly-guide-topic-discovery", guideTopic],
    ["Technical Writer", writer],
    ["repo operations", repoOperations],
  ]) {
    assertContains(
      markdown,
      ROUTINE_COORDINATOR_ONLY_PATTERN,
      `${label} should say the routine issue coordinates child work and must not open PRs itself.`,
    );
    assertContains(
      markdown,
      SUBTASK_PR_DECISION_PATTERN,
      `${label} should say PR decisions and PR creation happen only inside the project subtask.`,
    );
    assertContains(
      markdown,
      NO_TOP_LEVEL_ROUTINE_FOLLOWUP_PATTERN,
      `${label} should prevent top-level project-specific issues for guide-routine follow-up.`,
    );
  }
});

test("guide routine PRs publish only after exact-SHA QA and Code Reviewer approval", async () => {
  const guideReview = await read("../tasks/monthly-user-guide-review/TASK.md");
  const guideTopic = await read("../tasks/monthly-guide-topic-discovery/TASK.md");
  const writer = await read("../agents/technical-writer/AGENTS.md");
  const repoOperations = await readGuidePolicy();

  for (const [label, markdown] of [
    ["monthly-user-guide-review", guideReview],
    ["monthly-guide-topic-discovery", guideTopic],
    ["Technical Writer", writer],
    ["repo operations", repoOperations],
  ]) {
    assertContains(markdown, /unpublished exact SHA|unpublished immutable SHA/i, `${label} must prepare an unpublished exact SHA.`);
    assertContains(markdown, /publication-manifest/i, `${label} must bind publication metadata.`);
    assertContains(markdown, /QA[\s\S]{0,120}Code Reviewer/i, `${label} must route through QA and Code Reviewer.`);
    assertContains(markdown, /(?:only (?:Technical Writer )?publication mode|only that final handoff)[\s\S]{0,180}(?:open|create|publish)[\s\S]{0,80}(?:PR|pull request)/i, `${label} must delay PR creation until publication mode.`);
    assertContains(markdown, /(?:approved SHA|same SHA)[\s\S]{0,100}(?:metadata|unchanged)|metadata unchanged/i, `${label} must publish the approved candidate unchanged.`);
  }
});

test("guide-related pull requests are labeled type docs", async () => {
  const guideReview = await read("../tasks/monthly-user-guide-review/TASK.md");
  const guideTopic = await read("../tasks/monthly-guide-topic-discovery/TASK.md");
  const writer = await read("../agents/technical-writer/AGENTS.md");
  const repoOperations = await readGuidePolicy();
  const qualityGates = await read("../skills/micronaut-quality-gates/SKILL.md");

  for (const [label, markdown] of [
    ["monthly-user-guide-review", guideReview],
    ["monthly-guide-topic-discovery", guideTopic],
    ["Technical Writer", writer],
    ["repo operations", repoOperations],
    ["quality gates", qualityGates],
  ]) {
    assertContains(
      markdown,
      GUIDE_PR_TYPE_DOCS_PATTERN,
      `${label} should require guide-related PRs to carry type: docs.`,
    );
  }
});

test("guide and docs PR commits use skip ci when CI is not needed", async () => {
  const guideReview = await read("../tasks/monthly-user-guide-review/TASK.md");
  const guideTopic = await read("../tasks/monthly-guide-topic-discovery/TASK.md");
  const writer = await read("../agents/technical-writer/AGENTS.md");
  const repoOperations = await readGuidePolicy();
  const qualityGates = await read("../skills/micronaut-quality-gates/SKILL.md");
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");

  for (const [label, markdown] of [
    ["monthly-user-guide-review", guideReview],
    ["monthly-guide-topic-discovery", guideTopic],
    ["Technical Writer", writer],
    ["repo operations", repoOperations],
    ["quality gates", qualityGates],
    ["README", readme],
    ["COMPANY", company],
  ]) {
    assertContains(
      markdown,
      SKIP_CI_COMMIT_PATTERN,
      `${label} should require skip-ci commit messages for guide/docs PRs when CI is not needed.`,
    );
  }
});

test("guide and docs PR branches are current with the target branch before publication", async () => {
  const guideReview = await read("../tasks/monthly-user-guide-review/TASK.md");
  const guideTopic = await read("../tasks/monthly-guide-topic-discovery/TASK.md");
  const writer = await read("../agents/technical-writer/AGENTS.md");
  const repoOperations = await readGuidePolicy();
  const qualityGates = await read("../skills/micronaut-quality-gates/SKILL.md");
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");

  for (const [label, markdown] of [
    ["monthly-user-guide-review", guideReview],
    ["monthly-guide-topic-discovery", guideTopic],
    ["Technical Writer", writer],
    ["repo operations", repoOperations],
    ["quality gates", qualityGates],
    ["README", readme],
    ["COMPANY", company],
  ]) {
    assertContains(
      markdown,
      UPDATE_FROM_TARGET_BRANCH_PATTERN,
      `${label} should require guide/docs PR branches to be updated from the target branch before publication.`,
    );
    assertContains(
      markdown,
      CONFLICT_BLOCKER_PATTERN,
      `${label} should treat target-branch update conflicts as blockers instead of publishing conflicting PRs.`,
    );
  }
});
