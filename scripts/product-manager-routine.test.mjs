import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
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

const PROJECT_DISCOVERY_SUBTASK_PATTERN =
  /(?:one|1)[\s\S]{0,120}(?:Paperclip )?(?:sub-issue|child issue|subtask)[\s\S]{0,180}(?:per|for each)[\s\S]{0,160}Micronaut-related[\s\S]{0,120}project|Micronaut-related[\s\S]{0,120}project[\s\S]{0,180}(?:per|for each)[\s\S]{0,160}(?:Paperclip )?(?:sub-issue|child issue|subtask)/i;
const ACTUAL_PROJECT_SUBTASK_PATTERN =
  /(?:sub-issue|child issue|subtask)[\s\S]{0,220}(?:actual|corresponding)[\s\S]{0,120}(?:Paperclip )?project|(?:actual|corresponding)[\s\S]{0,120}(?:Paperclip )?project[\s\S]{0,220}(?:sub-issue|child issue|subtask)/i;
const PRODUCT_MANAGER_ASSIGNEE_PATTERN =
  /(?:sub-issue|child issue|subtask)[\s\S]{0,220}(?:assigned|assignee)[\s\S]{0,120}(?:Product Manager|product-manager|self|yourself)|(?:assigned|assignee)[\s\S]{0,120}(?:Product Manager|product-manager|self|yourself)[\s\S]{0,220}(?:sub-issue|child issue|subtask)/i;
const DEEP_REVIEW_IN_SUBTASK_PATTERN =
  /(?:deep review|repository review|market[\s\S]{0,80}research|competitor[\s\S]{0,80}research)[\s\S]{0,260}(?:inside|in)[\s\S]{0,120}(?:sub-issue|child issue|subtask)|(?:sub-issue|child issue|subtask)[\s\S]{0,260}(?:deep review|repository review|market[\s\S]{0,80}research|competitor[\s\S]{0,80}research)/i;
const QA_ASSIGNED_BACKLOG_PRODUCT_ISSUE_PATTERN =
  /(?:top-level Paperclip (?:product development|feature request|product) issue|top-level Paperclip issue)[\s\S]{0,320}(?:status `backlog`|`status: backlog`)[\s\S]{0,260}(?:workMode:\s*standard|`workMode: standard`)[\s\S]{0,260}(?:assigned|assignee)[\s\S]{0,120}(?:QA|qa-engineer)|(?:assigned|assignee)[\s\S]{0,120}(?:QA|qa-engineer)[\s\S]{0,260}(?:status `backlog`|`status: backlog`)[\s\S]{0,260}(?:workMode:\s*standard|`workMode: standard`)[\s\S]{0,320}(?:top-level Paperclip (?:product development|feature request|product) issue|top-level Paperclip issue)/i;
const PROJECT_TEMPLATE_PRODUCT_EXCLUSION_PATTERN =
  /micronaut-project-template[\s\S]{0,260}(?:not an actual Micronaut project|repository template|file sync|sync files)[\s\S]{0,260}(?:skip|exclude|not eligible|do not)[\s\S]{0,260}(?:product discovery|product development|feature request|Product Manager)|(?:skip|exclude|not eligible|do not)[\s\S]{0,260}micronaut-project-template[\s\S]{0,260}(?:product discovery|product development|feature request|Product Manager)/i;
const PRODUCT_DISCOVERY_COORDINATOR_ONLY_PATTERN =
  /routine issue[\s\S]{0,260}(?:coordinator|coordination)[\s\S]{0,260}(?:does not|must not|do not)[\s\S]{0,200}(?:deep review|market research|product development issue|feature request)|(?:does not|must not|do not)[\s\S]{0,200}(?:deep review|market research|product development issue|feature request)[\s\S]{0,260}routine issue/i;
const EXISTING_DISCOVERY_SUBTASK_DEDUP_PATTERN =
  /(?:search|check|look for|reuse|update)[\s\S]{0,260}(?:existing|open|already-created)[\s\S]{0,220}(?:product-discovery|Product discovery|discovery)[\s\S]{0,220}(?:sub-issue|child issue|subtask)|(?:do not|must not|never)[\s\S]{0,160}(?:duplicate|create another)[\s\S]{0,220}(?:product-discovery|Product discovery|discovery)[\s\S]{0,220}(?:sub-issue|child issue|subtask)/i;
const ORPHAN_DISCOVERY_ISSUE_DEDUP_PATTERN =
  /(?:orphan|top-level)[\s\S]{0,180}(?:product-discovery|Product discovery|discovery)[\s\S]{0,220}(?:reuse|update|reparent|record a blocker|do not create another)|(?:reuse|update|reparent|record a blocker|do not create another)[\s\S]{0,220}(?:orphan|top-level)[\s\S]{0,180}(?:product-discovery|Product discovery|discovery)/i;
const SELF_CONTAINED_DISCOVERY_CHILD_PATTERN =
  /(?:child issue|subtask|sub-issue)[\s\S]{0,220}(?:description|body)[\s\S]{0,220}(?:self-contained|complete|full)[\s\S]{0,260}product-discovery skill|product-discovery skill[\s\S]{0,260}(?:child issue|subtask|sub-issue)[\s\S]{0,220}(?:description|body)[\s\S]{0,220}(?:self-contained|complete|full)/i;
const PRODUCT_DISCOVERY_SKILL_MODE_PATTERN =
  /coordinator[\s\S]{0,260}project subtask|project subtask[\s\S]{0,260}coordinator/i;
const PREVIOUS_PRODUCT_DISCOVERY_RUN_PATTERN =
  /(?:previous|prior|latest)[\s\S]{0,200}(?:Product Manager report|product-discovery report|discovery run|routine run|project subtask report)[\s\S]{0,320}(?:created product issue|created issue|no-create|no issue|rejected|duplicate|candidate)|(?:created product issue|created issue|no-create|no issue|rejected|duplicate|candidate)[\s\S]{0,320}(?:previous|prior|latest)[\s\S]{0,200}(?:Product Manager report|product-discovery report|discovery run|routine run|project subtask report)/i;
const REPEATED_FEATURE_AVOIDANCE_PATTERN =
  /(?:do not|avoid|must not|never)[\s\S]{0,240}(?:propos(?:e|ing)|open|create)[\s\S]{0,240}(?:same|repeat(?:ed)?|previously proposed|already proposed)[\s\S]{0,240}(?:feature|candidate|gap)|(?:same|repeat(?:ed)?|previously proposed|already proposed)[\s\S]{0,240}(?:feature|candidate|gap)[\s\S]{0,240}(?:new evidence|materially changed|do not|avoid|must not|never)/i;

test("Product Manager agent is configured for product discovery", async () => {
  const agentMarkdown = await read("../agents/product-manager/AGENTS.md");
  const { frontmatter, body } = parseFrontmatter(agentMarkdown);

  assert.equal(frontmatter.name, "Product Manager");
  assert.equal(frontmatter.role, "pm");
  assert.equal(frontmatter.title, "Product Manager");
  assert.equal(frontmatter.reportsTo, "ceo");
  assert.deepEqual(frontmatter.skills, [
    "product-discovery",
    "micronaut-repo-operations",
    "docs",
    "gh-cli",
  ]);
  assert.equal(frontmatter.metadata?.paperclip?.agentIcon, "radar");
  assertContains(body, /market[\s\S]{0,160}competitor|competitor[\s\S]{0,160}market/i, "Product Manager instructions should mention market and competitor research.");
  assertContains(body, PROJECT_DISCOVERY_SUBTASK_PATTERN, "Product Manager instructions should create one product-discovery sub-issue per Micronaut-related project.");
  assertContains(body, ACTUAL_PROJECT_SUBTASK_PATTERN, "Product Manager instructions should place discovery subtasks in the actual project being reviewed.");
  assertContains(body, PRODUCT_MANAGER_ASSIGNEE_PATTERN, "Product Manager instructions should assign project-specific discovery subtasks to Product Manager.");
  assertContains(body, DEEP_REVIEW_IN_SUBTASK_PATTERN, "Product Manager instructions should perform deep project review inside each discovery subtask.");
  assertContains(body, QA_ASSIGNED_BACKLOG_PRODUCT_ISSUE_PATTERN, "Product Manager instructions should create resulting product development issues in backlog assigned to QA.");
  assertContains(body, /human review|reviewed by (?:a )?human|human-reviewed/i, "Product Manager instructions should keep product-discovery issues waiting for human review.");
  assert.doesNotMatch(body, /direct(?:ly)?[\s\S]{0,180}GitHub issue|GitHub issue[\s\S]{0,180}direct(?:ly)?/i, "Product Manager instructions should not require direct GitHub issue creation.");
  assertContains(body, /type: enhancement/i, "Product Manager instructions should mention type: enhancement.");
  assertContains(body, /acceptance criteria/i, "Product Manager instructions should include acceptance criteria guidance.");
  assertContains(body, /duplicate|deduplic/i, "Product Manager instructions should require duplicate checks.");
  assertContains(body, PREVIOUS_PRODUCT_DISCOVERY_RUN_PATTERN, "Product Manager instructions should require reviewing previous product-discovery runs.");
  assertContains(body, REPEATED_FEATURE_AVOIDANCE_PATTERN, "Product Manager instructions should avoid proposing the same feature from prior runs without new evidence.");
  assertContains(body, /outside the managed Micronaut-related boundary/i, "Product Manager instructions should record out-of-bound project skips.");
});

test("Weekly Product Discovery routine is active and owned by Product Manager", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const adapter = extension.agents?.["product-manager"]?.adapter;
  const routine = extension.routines?.["weekly-product-discovery"];
  const trigger = routine?.triggers?.[0];

  assert.equal(adapter?.type, "acpx_local");
  assert.equal(adapter?.config?.agent, "custom");
  assert.equal(adapter?.config?.agentCommand, "/usr/local/bin/hermes -p paperclip acp --accept-hooks");
  assert.equal(adapter?.config?.mode, "persistent");
  assert.equal(adapter?.config?.timeoutSec, 0);
  assert.equal(adapter?.config?.graceSec, 20);

  assert.equal(routine?.status, "active");
  assert.equal(trigger?.kind, "schedule");
  assert.equal(trigger?.label, "Weekly Product Discovery");
  assert.equal(trigger?.cronExpression, "0 1 * * 1");
  assert.equal(trigger?.timezone, "Europe/Madrid");

  const taskMarkdown = await read("../tasks/weekly-product-discovery/TASK.md");
  const { frontmatter, body } = parseFrontmatter(taskMarkdown);

  assert.equal(frontmatter.name, "Weekly Product Discovery");
  assert.equal(frontmatter.assignee, "product-manager");
  assert.equal(frontmatter.project, "company-operations");
  assert.equal(frontmatter.recurring, true);
  assertContains(body, /Micronaut-related Paperclip projects/i, "Weekly Product Discovery task should mention Micronaut-related projects.");
  assertContains(body, /research[\s\S]{0,160}(?:market|competitor|framework|technolog)/i, "Weekly Product Discovery task should require market, competitor, framework, or technology research.");
  assertContains(body, PROJECT_DISCOVERY_SUBTASK_PATTERN, "Weekly Product Discovery should create one product-discovery sub-issue per Micronaut-related project.");
  assertContains(body, ACTUAL_PROJECT_SUBTASK_PATTERN, "Weekly Product Discovery should place discovery subtasks in the actual project being reviewed.");
  assertContains(body, PRODUCT_MANAGER_ASSIGNEE_PATTERN, "Weekly Product Discovery should assign project-specific discovery subtasks to Product Manager.");
  assertContains(body, DEEP_REVIEW_IN_SUBTASK_PATTERN, "Weekly Product Discovery should perform deep project review inside each discovery subtask.");
  assertContains(body, QA_ASSIGNED_BACKLOG_PRODUCT_ISSUE_PATTERN, "Weekly Product Discovery should create resulting product development issues in backlog assigned to QA.");
  assertContains(body, /human review|reviewed by (?:a )?human|human-reviewed/i, "Weekly Product Discovery task should leave created issues for human review.");
  assert.doesNotMatch(body, /create(?:s)?[\s\S]{0,180}GitHub issue[\s\S]{0,180}direct/i, "Weekly Product Discovery task should not require direct GitHub issue creation.");
  assertContains(body, /comprehensive[\s\S]{0,220}feature request|detailed[\s\S]{0,220}feature request/i, "Weekly Product Discovery task should require comprehensive or detailed feature requests.");
  assertContains(body, /acceptance criteria/i, "Weekly Product Discovery task should include acceptance criteria guidance.");
  assertContains(body, /duplicate|deduplic/i, "Weekly Product Discovery task should require duplicate checks.");
  assertContains(body, PREVIOUS_PRODUCT_DISCOVERY_RUN_PATTERN, "Weekly Product Discovery should require reviewing previous product-discovery runs.");
  assertContains(body, REPEATED_FEATURE_AVOIDANCE_PATTERN, "Weekly Product Discovery should avoid proposing the same feature from prior runs without new evidence.");
});

test("Product Manager role and routine are documented", async () => {
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");
  const team = await read("../teams/engineering/TEAM.md");

  assertContains(readme, /Product Manager: `\/usr\/local\/bin\/hermes -p paperclip acp --accept-hooks`/, "README should document Product Manager ACPX/Hermes ACP command.");
  assertContains(readme, /\| Product Manager \| `radar` \|/, "README should document the Product Manager radar icon.");
  assertContains(readme, /\| Product Manager \| `pm` \|/, "README should document the Product Manager pm role.");
  assertContains(readme, /\| `Weekly Product Discovery` \| Product Manager \| Mondays at 01:00 `Europe\/Madrid` \|/, "README should document the Weekly Product Discovery schedule.");
  assertContains(readme, /\| Product Manager \| Product Manager \| `ceo` \|/, "README should document Product Manager reporting to the CEO.");
  assertContains(readme, /research(?:es)?[\s\S]{0,160}(?:market|competitor|framework|technolog)[\s\S]{0,260}Paperclip issue/i, "README should describe Product Manager research leading to Paperclip issues.");
  assertContains(readme, /Weekly Product Discovery[\s\S]{0,260}backlog/i, "README should describe Product Manager routine issues as backlog work.");

  assertContains(company, /Product Manager/i, "COMPANY.md should mention the Product Manager.");
  assertContains(company, /Weekly Product Discovery/i, "COMPANY.md should mention Weekly Product Discovery.");
  assertContains(company, /top-level Paperclip issue[\s\S]{0,220}backlog|backlog[\s\S]{0,220}top-level Paperclip issue/i, "COMPANY.md should describe backlog Paperclip product-discovery issues.");

  assertContains(team, /agents\/product-manager\/AGENTS\.md/, "Engineering team docs should link the Product Manager agent file.");
  assertContains(team, /Product Manager|product discovery/i, "Engineering team docs should mention Product Manager or product discovery.");
});

test("Product Manager is covered by internal company maintenance routines", async () => {
  const trainingMarkdown = await read("../tasks/training/TASK.md");
  const { body: trainingBody } = parseFrontmatter(trainingMarkdown);
  const bootstrapMarkdown = await read("../tasks/verify-imported-company-instance/TASK.md");
  const { body: bootstrapBody } = parseFrontmatter(bootstrapMarkdown);

  assertContains(trainingBody, /Inspect every non-CEO agent:[\s\S]*Product Manager/i, "Training should inspect Product Manager as a non-CEO agent.");
  assertContains(bootstrapBody, /Product Manager[\s\S]{0,220}role `pm`[\s\S]{0,220}icon `radar`/i, "Bootstrap verification should check Product Manager role and icon.");
  assertContains(bootstrapBody, /Weekly Product Discovery[\s\S]{0,120}active routine owned by `product-manager`/i, "Bootstrap verification should check the Weekly Product Discovery routine.");
});

test("Product discovery excludes the Micronaut project template repository", async () => {
  const agentMarkdown = await read("../agents/product-manager/AGENTS.md");
  const taskMarkdown = await read("../tasks/weekly-product-discovery/TASK.md");
  const repoOperations = await read("../skills/micronaut-repo-operations/SKILL.md");
  const readme = await read("../README.md");
  const company = await read("../COMPANY.md");

  for (const [label, markdown] of [
    ["Product Manager", agentMarkdown],
    ["Weekly Product Discovery", taskMarkdown],
    ["repo operations", repoOperations],
    ["README", readme],
    ["COMPANY", company],
  ]) {
    assertContains(
      markdown,
      PROJECT_TEMPLATE_PRODUCT_EXCLUSION_PATTERN,
      `${label} should exclude micronaut-project-template from Product Manager discovery.`,
    );
  }
});

test("Product Manager uses a product-discovery skill for coordinator and subtask modes", async () => {
  const agentMarkdown = await read("../agents/product-manager/AGENTS.md");
  const { frontmatter: agentFrontmatter, body: agentBody } = parseFrontmatter(agentMarkdown);
  const taskMarkdown = await read("../tasks/weekly-product-discovery/TASK.md");
  const { body: taskBody } = parseFrontmatter(taskMarkdown);
  const skillMarkdown = await read("../skills/product-discovery/SKILL.md");
  const { frontmatter: skillFrontmatter, body: skillBody } = parseFrontmatter(skillMarkdown);
  const repoOperations = await read("../skills/micronaut-repo-operations/SKILL.md");

  assert.ok(agentFrontmatter.skills.includes("product-discovery"), "Product Manager should include the product-discovery skill.");
  assert.equal(skillFrontmatter.name, "product-discovery");
  assertContains(skillBody, PRODUCT_DISCOVERY_SKILL_MODE_PATTERN, "product-discovery skill should describe coordinator and project-subtask modes.");

  for (const [label, markdown] of [
    ["Product Manager", agentBody],
    ["Weekly Product Discovery", taskBody],
    ["product-discovery skill", skillBody],
    ["repo operations", repoOperations],
  ]) {
    assertContains(
      markdown,
      PRODUCT_DISCOVERY_COORDINATOR_ONLY_PATTERN,
      `${label} should keep the routine issue coordinator-only for Product Manager discovery.`,
    );
    assertContains(
      markdown,
      EXISTING_DISCOVERY_SUBTASK_DEDUP_PATTERN,
      `${label} should require reusing existing product-discovery subtasks instead of creating duplicates.`,
    );
    assertContains(
      markdown,
      ORPHAN_DISCOVERY_ISSUE_DEDUP_PATTERN,
      `${label} should detect orphan top-level product-discovery issues before creating another duplicate.`,
    );
    assertContains(
      markdown,
      SELF_CONTAINED_DISCOVERY_CHILD_PATTERN,
      `${label} should require self-contained product-discovery child issue descriptions that invoke the skill.`,
    );
    assertContains(
      markdown,
      PREVIOUS_PRODUCT_DISCOVERY_RUN_PATTERN,
      `${label} should require checking previous product-discovery runs before proposing a feature.`,
    );
    assertContains(
      markdown,
      REPEATED_FEATURE_AVOIDANCE_PATTERN,
      `${label} should avoid repeating feature proposals from prior runs without new evidence.`,
    );
  }
});
