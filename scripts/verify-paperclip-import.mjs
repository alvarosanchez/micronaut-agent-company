import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { ROUTINE_VERIFIED_NO_OP_PATTERN } from "./routine-no-op-patterns.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const paperclipCliPath = path.join(
  repoRoot,
  "scripts",
  "run-paperclip-cli.mjs",
);
const paperclipPackageEntrypointPath = path.join(
  repoRoot,
  "node_modules",
  "paperclipai",
  "dist",
  "index.js",
);

const ROOT_PACKAGE_FILES = [".paperclip.yaml", "COMPANY.md", "README.md"];
const ROOT_PACKAGE_DIRS = ["agents", "projects", "tasks", "skills"];
const DISALLOWED_PACKAGE_DIRS = ["references"];
const DEFAULT_COMPANY_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const PAPERCLIP_ISSUE_LIST_DESCRIPTION_EXPORT_MAX_CHARS = 1200;
const PORTABLE_RUNTIME_FILE_PATTERNS = [
  /^agents\/[^/]+\/AGENTS\.md$/,
  /^skills\/[^/]+\/SKILL\.md$/,
  /^projects\/[^/]+\/PROJECT\.md$/,
  /^projects\/[^/]+\/tasks\/[^/]+\/TASK\.md$/,
  /^tasks\/[^/]+\/TASK\.md$/,
];
const REQUIRED_AGENT_INSTRUCTION_HEADINGS = [
  "## Session Start",
  "## Tool Use",
  "## Possible Outcomes",
  "## Finish Verification",
];
const REQUIRED_AGENT_TOOL_USE_PATTERNS = [
  /Paperclip built-ins:/i,
  /GitHub sync plugin tools:/i,
  /paperclip-github-plugin:/i,
];
const REQUIRED_AGENT_HANDOFF_PATTERNS = [
  /\b(?:returnAssignee|return assignee)\b/i,
  /`?status:\s*done`?|`status: done`|status `done`/i,
  /`?status:\s*in_progress`?|`status: in_progress`|status `in_progress`/i,
  /\bnon-policy (?:owner change|work phase)\b/i,
];
const FORBIDDEN_AGENT_HANDOFF_PATTERNS = [
  /\bWhen another agent should act next,\s*move the issue to `?TODO`?\b/i,
  /\bsafe handoff contract\b/i,
  /\blatest `?@`? mention\b/i,
];
const REQUIRED_AGENT_EXECUTION_POLICY_PATTERNS = [
  /\bcurrent execution stage\b/i,
  /\bcurrent stage participant\b/i,
  /\bchanges_requested\b/i,
];
const REQUIRED_SHARED_HANDOFF_PATTERNS = [
  /\b(?:currentParticipant|current participant)\b/i,
  /\b(?:returnAssignee|return assignee)\b/i,
  /\bin_review\b/i,
];
const FORBIDDEN_SHARED_WORKFLOW_PATTERNS = [
  /\bWhenever work moves from one agent to another[\s\S]{0,240}move the issue to `?TODO`?\b/i,
  /\bAfter every agent-to-agent transition[\s\S]{0,240}move the issue to `?TODO`?\b/i,
  /\bsafe handoff contract\b/i,
  /\blatest `?@`? mention\b/i,
];
const BOARD_APPROVAL_RECOMMENDED_ACTION_PATTERN =
  /\b(?:board approval|linked approval|approval requests?|approval request)\b[\s\S]{0,400}(?:exact (?:proposed )?(?:comment body|proposed comment body)[\s\S]{0,200}\brecommendedAction\b|\brecommendedAction\b[\s\S]{0,200}exact (?:proposed )?(?:comment body|proposed comment body))/i;
const COMMENT_BODY_RECOMMENDED_ACTION_PATTERN =
  /\bcommentBody\b[\s\S]{0,240}\brecommendedAction\b|\brecommendedAction\b[\s\S]{0,240}\bcommentBody\b/i;
const SINGLE_ASSIGNEE_GOVERNANCE_PATTERN =
  /single[- ]assignee[\s\S]{0,500}(?:linked (?:Paperclip )?approvals)[\s\S]{0,240}(?:not (?:a )?second assignee|not (?:a )?second assignment)|(?:linked (?:Paperclip )?approvals)[\s\S]{0,240}(?:not (?:a )?second assignee|not (?:a )?second assignment)[\s\S]{0,500}single[- ]assignee/i;
const CHECKOUT_RECOVERY_PATTERN =
  /(?:assigned agent|agent-owned)[\s\S]{0,700}in_progress[\s\S]{0,320}checkout[\s\S]{0,900}(?:liveness|continuation|watchdog)[\s\S]{0,500}(?:stranded|blocked|repair)|(?:liveness|continuation|watchdog)[\s\S]{0,900}(?:assigned agent|agent-owned)[\s\S]{0,700}in_progress[\s\S]{0,320}checkout/i;
const PARENT_BLOCKER_PATTERN =
  /parentId[\s\S]{0,500}(?:structural|structure|checklist)[\s\S]{0,700}(?:blockParentUntilDone|child issues?)[\s\S]{0,700}blockedByIssueIds[\s\S]{0,400}(?:dependency|blocker)|blockedByIssueIds[\s\S]{0,500}(?:dependency|blocker)[\s\S]{0,700}(?:blockParentUntilDone|child issues?)[\s\S]{0,700}parentId[\s\S]{0,400}(?:structural|structure|checklist)/i;
const ISSUE_THREAD_INTERACTION_PATTERN =
  /issue-thread interactions?[\s\S]{0,800}suggest_tasks[\s\S]{0,800}ask_user_questions[\s\S]{0,800}request_confirmation|suggest_tasks[\s\S]{0,800}ask_user_questions[\s\S]{0,800}request_confirmation[\s\S]{0,800}issue-thread interactions?/i;
const PLAN_CONFIRMATION_PATTERN =
  /plan[\s\S]{0,500}request_confirmation[\s\S]{0,500}confirmation:\{issueId\}:plan:\{revisionId\}[\s\S]{0,500}wake_assignee_on_accept|request_confirmation[\s\S]{0,500}confirmation:\{issueId\}:plan:\{revisionId\}[\s\S]{0,500}wake_assignee_on_accept[\s\S]{0,500}plan/i;
const RESUME_TRUE_PATTERN =
  /resume:\s*true[\s\S]{0,500}(?:completed|cancelled|done)[\s\S]{0,500}(?:assigned issue|assignee|wake)|(?:completed|cancelled|done)[\s\S]{0,500}resume:\s*true[\s\S]{0,500}(?:assigned issue|assignee|wake)/i;
const ENVIRONMENT_RUNTIME_PATTERN =
  /(?:Paperclip )?environments?[\s\S]{0,500}(?:local|SSH|sandbox)[\s\S]{0,500}(?:live|deployment|operator-owned)[\s\S]{0,500}(?:@paperclipai\/plugin-e2b|environment-driver|provider)|(?:@paperclipai\/plugin-e2b|environment-driver|provider)[\s\S]{0,500}(?:Paperclip )?environments?[\s\S]{0,500}(?:live|deployment|operator-owned)/i;
const APPROVAL_LINKAGE_VERIFICATION_PATTERN =
  /approvals\/\{approvalId\}\/issues[\s\S]{0,320}(?:issue\.linkedApprovalIds|linkedApprovalIds)|(?:issue\.linkedApprovalIds|linkedApprovalIds)[\s\S]{0,320}approvals\/\{approvalId\}\/issues/i;
const ACTIONABLE_PR_FOLLOW_THROUGH_PATTERN =
  /GitHub Sync[\s\S]{0,500}(?:reopen|reopens|reopened)[\s\S]{0,500}failing CI[\s\S]{0,500}unresolved review feedback[\s\S]{0,500}actionable PR follow-through[\s\S]{0,500}target branch[\s\S]{0,500}(?:Micronaut Engineer|make the PR mergeable)[\s\S]{0,500}(?:do not restore\s+`?(?:blocked|BLOCKED)`?|instead of restoring\s+`?(?:blocked|BLOCKED)`?)[\s\S]{0,240}baseline|failing CI[\s\S]{0,500}target branch[\s\S]{0,500}actionable PR follow-through[\s\S]{0,500}(?:do not restore\s+`?(?:blocked|BLOCKED)`?|instead of restoring\s+`?(?:blocked|BLOCKED)`?)[\s\S]{0,240}baseline/i;
const HEALTHY_PR_MAINTAINER_WAIT_PATTERN =
  /(?:open,?\s*non-draft[\s\S]{0,180}`?CLEAN`?[\s\S]{0,240}checks (?:are )?passing[\s\S]{0,320}no actionable unresolved internal review state[\s\S]{0,360}`?in_review`?[\s\S]{0,260}no internal assignee[\s\S]{0,260}normal maintainer review)|(?:normal maintainer review[\s\S]{0,360}`?in_review`?[\s\S]{0,260}no internal assignee[\s\S]{0,360}open,?\s*non-draft[\s\S]{0,180}`?CLEAN`?[\s\S]{0,240}checks (?:are )?passing)/i;
const COMPANY_ATTACHMENT_LIMIT_PATTERN =
  /attachmentMaxBytes[\s\S]{0,260}10 MiB[\s\S]{0,260}process-level (?:attachment )?cap[\s\S]{0,260}(?:ceiling|final ceiling)|10 MiB[\s\S]{0,260}attachmentMaxBytes[\s\S]{0,260}(?:ceiling|final ceiling)/i;
const NEW_HIRE_APPROVAL_POLICY_PATTERN =
  /requireBoardApprovalForNewAgents[\s\S]{0,260}false[\s\S]{0,260}(?:new-hire approval|hire approval|future hires)|new-hire approval[\s\S]{0,260}(?:opt-in|explicit)[\s\S]{0,260}requireBoardApprovalForNewAgents/i;
const PRODUCTIVITY_REVIEW_PATTERN =
  /productivity review[\s\S]{0,420}(?:issue_productivity_review|no-comment|long-active|high-churn|high churn|long active)[\s\S]{0,620}(?:source issue|source work|review issue|manager decision|queue-health|queue health)/i;
const PAPERCLIP_2026_512_ASSIGNED_STATUS_DEFAULT_PATTERN =
  /Paperclip (?:v|`?paperclipai@)2026\.512\.0[\s\S]{0,900}assigned[\s\S]{0,360}status[\s\S]{0,260}(?:todo|TODO)[\s\S]{0,360}(?:explicit|omitted)/i;
const PAPERCLIP_2026_512_PLANNING_MODE_PATTERN =
  /planning mode[\s\S]{0,700}(?:plan only|planning-only|do not write code|not start implementation)[\s\S]{0,700}(?:child implementation issues|standard delivery issues?|standard work mode)|(?:child implementation issues|standard delivery issues?|standard work mode)[\s\S]{0,700}planning mode[\s\S]{0,700}(?:plan only|planning-only|do not write code|not start implementation)/i;
const LIVE_INSTANCE_TEMPLATE_IDENTITY_PATTERN =
  /operator-selected live company names?, descriptions?, and issue prefixes? are valid import choices[\s\S]{0,240}(?:routing|governance visibility|package-owned entity mapping)|(?:routing|governance visibility|package-owned entity mapping)[\s\S]{0,240}operator-selected live company names?, descriptions?, and issue prefixes? are valid import choices/i;
const SOURCE_PACKAGE_PAPERCLIP_YAML_PATTERN =
  /references to `?\.paperclip\.yaml`? describe source-package defaults for future imports[\s\S]{0,240}(?:not a guarantee that every managed imported workspace exposes `?\.paperclip\.yaml`? locally)|(?:managed imported workspace exposes `?\.paperclip\.yaml`? locally)[\s\S]{0,240}references to `?\.paperclip\.yaml`? describe source-package defaults for future imports/i;
const ALREADY_IMPLEMENTED_DIRECT_CLOSE_PATTERN =
  /already-implemented[\s\S]*(?:without|do not need)(?: separate)? board approval[\s\S]*\bcit(?:e|es)\b[\s\S]*\bexact\b[\s\S]*\b(?:version|PR|release|documentation)\b|\bcit(?:e|es)\b[\s\S]*\bexact\b[\s\S]*\b(?:version|PR|release|documentation)\b[\s\S]*already-implemented[\s\S]*(?:without|do not need)(?: separate)? board approval/i;
const GITHUB_NOT_PLANNED_CLOSE_PATTERN =
  /Close as not planned[\s\S]{0,240}Close as completed|Close as completed[\s\S]{0,240}Close as not planned/i;
const GITHUB_DUPLICATE_CLOSE_PATTERN =
  /Close as duplicate[\s\S]{0,320}(?:superseding GitHub issue|duplicate link|link(?:ing)? the duplicate issue)|(?:superseding GitHub issue|duplicate link|link(?:ing)? the duplicate issue)[\s\S]{0,320}Close as duplicate/i;
const EVIDENCE_RICH_CLOSURE_COMMENT_PATTERN =
  /(?:closure comment|GitHub issue closure|public comment|GitHub closure)[\s\S]{0,700}(?:detailed,?\s*evidence-rich|detailed evidence)[\s\S]{0,260}(?:not short on details|exact facts that justify the closure|short generic close note)|(?:not short on details|exact facts that justify the closure|short generic close note)[\s\S]{0,700}(?:closure comment|GitHub issue closure|public comment|GitHub closure)/i;
const CLOSED_ISSUE_DEDUP_REASONING_PATTERN =
  /deduplicat(?:e|ion)[\s\S]{0,520}(?:open and closed|closed and open)[\s\S]{0,260}GitHub issues[\s\S]{0,520}(?:why they were closed|closure reason|closing reason|closure disposition|closure comments?)[\s\S]{0,360}(?:triage opinion|form an opinion|decide|decision|superseding|already implemented|stale|out-of-scope)|closed GitHub issues[\s\S]{0,520}(?:why they were closed|closure reason|closing reason|closure disposition|closure comments?)[\s\S]{0,520}deduplicat(?:e|ion)/i;
const REVIEW_THREAD_REPLY_POLICY_PATTERN =
  /review threads?[\s\S]{0,320}(?:reply(?:ing)?|repl(?:y|ied|ies))[\s\S]{0,320}(?:decision|committed the requested change|not applicable|disagreement with the feedback)[\s\S]{0,220}(?:before resolving|before the thread is resolved|before they are resolved|only then resolves|only then resolve)|(?:reply(?:ing)?|repl(?:y|ied|ies))[\s\S]{0,320}review threads?[\s\S]{0,320}(?:decision|committed the requested change|not applicable|disagreement with the feedback)[\s\S]{0,220}(?:before resolving|before the thread is resolved|before they are resolved|only then resolves|only then resolve)|(?:decision|committed the requested change|not applicable|disagreement with the feedback)[\s\S]{0,320}review threads?[\s\S]{0,320}(?:reply(?:ing)?|repl(?:y|ied|ies))/i;
const REVIEW_THREAD_REPLY_TOOLING_PATTERN =
  /reply_to_review_thread[\s\S]*resolve_review_thread[\s\S]*(?:reply before resolving|reply first|do not silently resolve|explain the decision)|(?:reply before resolving|reply first|do not silently resolve|explain the decision)[\s\S]*reply_to_review_thread[\s\S]*resolve_review_thread/i;
const REQUIRED_WORKFLOW_DOC_PATTERNS = [
  {
    relativePath: "README.md",
    pattern: /stateDiagram-v2/,
    message: "README.md must include a Mermaid lifecycle diagram for the issue workflow.",
  },
  {
    relativePath: "README.md",
    pattern: /heartbeat\/invoke/,
    message: "README.md must document explicit reviewer wakeups through the Paperclip heartbeat invoke API.",
  },
  {
    relativePath: "README.md",
    pattern: LIVE_INSTANCE_TEMPLATE_IDENTITY_PATTERN,
    message:
      "README.md must explain that operator-selected live company names, descriptions, and issue prefixes are valid import choices.",
  },
  {
    relativePath: "README.md",
    pattern: SOURCE_PACKAGE_PAPERCLIP_YAML_PATTERN,
    message:
      "README.md must explain that `.paperclip.yaml` references describe source-package defaults rather than required live-instance files.",
  },
  {
    relativePath: "README.md",
    pattern: COMPANY_ATTACHMENT_LIMIT_PATTERN,
    message:
      "README.md must document the explicit Paperclip company attachment cap.",
  },
  {
    relativePath: "README.md",
    pattern: NEW_HIRE_APPROVAL_POLICY_PATTERN,
    message:
      "README.md must document the explicit Paperclip new-hire approval policy.",
  },
  {
    relativePath: "README.md",
    pattern: PRODUCTIVITY_REVIEW_PATTERN,
    message:
      "README.md must explain Paperclip productivity review issues.",
  },
  {
    relativePath: "README.md",
    pattern: PAPERCLIP_2026_512_ASSIGNED_STATUS_DEFAULT_PATTERN,
    message:
      "README.md must explain Paperclip 2026.512 assigned-issue status defaults.",
  },
  {
    relativePath: "README.md",
    pattern: PAPERCLIP_2026_512_PLANNING_MODE_PATTERN,
    message:
      "README.md must explain Paperclip 2026.512 planning-mode issue semantics.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: PAPERCLIP_2026_512_ASSIGNED_STATUS_DEFAULT_PATTERN,
    message:
      "COMPANY.md must explain Paperclip 2026.512 assigned-issue status defaults.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: PAPERCLIP_2026_512_PLANNING_MODE_PATTERN,
    message:
      "COMPANY.md must explain Paperclip 2026.512 planning-mode issue semantics.",
  },
  {
    relativePath: "README.md",
    pattern:
      /currentParticipant[\s\S]*returnAssignee|returnAssignee[\s\S]*currentParticipant/i,
    message:
      "README.md must explain native execution-policy routing through `currentParticipant` and `returnAssignee`.",
  },
  {
    relativePath: "README.md",
    pattern: CLOSED_ISSUE_DEDUP_REASONING_PATTERN,
    message:
      "README.md must explain that QA deduplication considers open and closed GitHub issues and why closed issues were closed.",
  },
  {
    relativePath: "README.md",
    pattern:
      /normal `?TODO`? assignment only for non-policy owner changes|non-policy owner changes[\s\S]*`?TODO`?/i,
    message:
      "README.md must limit manual `TODO` handoffs to non-policy owner changes.",
  },
  {
    relativePath: "README.md",
    pattern: SINGLE_ASSIGNEE_GOVERNANCE_PATTERN,
    message:
      "README.md must explain that Paperclip issues stay single-assignee and linked approvals are not a second assignee.",
  },
  {
    relativePath: "README.md",
    pattern: CHECKOUT_RECOVERY_PATTERN,
    message:
      "README.md must explain checkout-backed agent `in_progress` work and the stranded-work recovery path.",
  },
  {
    relativePath: "README.md",
    pattern: PARENT_BLOCKER_PATTERN,
    message:
      "README.md must explain that `parentId` is structural and `blockedByIssueIds` carries dependency semantics.",
  },
  {
    relativePath: "README.md",
    pattern: ISSUE_THREAD_INTERACTION_PATTERN,
    message:
      "README.md must explain Paperclip issue-thread interactions for suggested tasks, structured questions, and request-confirmation cards.",
  },
  {
    relativePath: "README.md",
    pattern: PLAN_CONFIRMATION_PATTERN,
    message:
      "README.md must explain plan confirmation through a `request_confirmation` interaction with idempotency and continuation policy.",
  },
  {
    relativePath: "README.md",
    pattern: RESUME_TRUE_PATTERN,
    message:
      "README.md must explain structured `resume: true` when restarting follow-up on completed assigned issues.",
  },
  {
    relativePath: "README.md",
    pattern: ENVIRONMENT_RUNTIME_PATTERN,
    message:
      "README.md must explain Paperclip environments as live runtime configuration and mention sandbox provider installation when needed.",
  },
  {
    relativePath: "README.md",
    pattern: APPROVAL_LINKAGE_VERIFICATION_PATTERN,
    message:
      "README.md must explain that approval linkage is verified through `GET /api/approvals/{approvalId}/issues` instead of only `issue.linkedApprovalIds`.",
  },
  {
    relativePath: "README.md",
    pattern: ACTIONABLE_PR_FOLLOW_THROUGH_PATTERN,
    message:
      "README.md must explain that failing PR CI or unresolved review feedback is actionable PR follow-through even when the failure also reproduces on the target branch.",
  },
  {
    relativePath: "README.md",
    pattern:
      /linked PR[\s\S]*normal gates|normal gates[\s\S]*linked PR|external contributor[\s\S]*mergeable/i,
    message:
      "README.md must explain how imported issues with linked contributor PRs continue through the normal gates.",
  },
  {
    relativePath: "README.md",
    pattern:
      /leave(?:s|ing)?[\s\S]*contributor PR[\s\S]*open[\s\S]*(?:separate|replacement|maintainer-owned|new) PR|(?:separate|replacement|maintainer-owned|new) PR[\s\S]*leave(?:s|ing)?[\s\S]*contributor PR[\s\S]*open/i,
    message:
      "README.md must explain that inadequate imported issue PRs stay open while agents create a separate replacement PR.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: /same synced repository/i,
    message: "QA instructions must say that deduplication happens against GitHub issues in the same synced repository.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: CLOSED_ISSUE_DEDUP_REASONING_PATTERN,
    message:
      "QA instructions must require deduplication against open and closed GitHub issues and review why closed issues were closed.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /external contributor[\s\S]*normal gates|normal gates[\s\S]*external contributor/i,
    message:
      "QA instructions must explain that a good imported issue PR from an external contributor moves through the normal gates.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /leave(?:s|ing)?[\s\S]*contributor PR[\s\S]*open[\s\S]*(?:separate|replacement|maintainer-owned|new) PR|(?:separate|replacement|maintainer-owned|new) PR[\s\S]*leave(?:s|ing)?[\s\S]*contributor PR[\s\S]*open/i,
    message:
      "QA instructions must explain that inadequate imported issue PRs stay open while the pipeline creates a separate replacement PR.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /type:\s*question[\s\S]*closed:\s*question[\s\S]*close the issue|close the issue[\s\S]*type:\s*question[\s\S]*closed:\s*question/i,
    message:
      "QA instructions must explain that confident questions can be answered directly on GitHub with `type: question` and `closed: question` before QA closes the issue.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /status:\s*awaiting feedback[\s\S]*30 days[\s\S]*closed:\s*question|closed:\s*question[\s\S]*30 days[\s\S]*status:\s*awaiting feedback/i,
    message:
      "QA instructions must explain that clarification requests use `status: awaiting feedback` and may close after 30 days with `closed: question`.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: ALREADY_IMPLEMENTED_DIRECT_CLOSE_PATTERN,
    message:
      "QA instructions must explain that already-implemented issues can be closed directly by QA without board approval when the closure cites the exact version, PR, release, or documentation evidence.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: GITHUB_NOT_PLANNED_CLOSE_PATTERN,
    message:
      "QA instructions must explain that direct non-duplicate GitHub issue closures use native `Close as not planned` instead of `Close as completed`.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: GITHUB_DUPLICATE_CLOSE_PATTERN,
    message:
      "QA instructions must explain that duplicate closures use native `Close as duplicate` and link the superseding GitHub issue.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: EVIDENCE_RICH_CLOSURE_COMMENT_PATTERN,
    message:
      "QA instructions must require GitHub closure comments to contain detailed evidence and not be short on details.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: APPROVAL_LINKAGE_VERIFICATION_PATTERN,
    message:
      "QA instructions must explain that approval linkage is verified through `GET /api/approvals/{approvalId}/issues` instead of only `issue.linkedApprovalIds`.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: ACTIONABLE_PR_FOLLOW_THROUGH_PATTERN,
    message:
      "QA instructions must explain that failing PR CI or unresolved review feedback is actionable PR follow-through even when the failure also reproduces on the target branch.",
  },
  {
    relativePath: "README.md",
    pattern:
      /QA Engineer[\s\S]*default-branch and release-fact gathering[\s\S]*SemVer(?:-delta)?(?: targeting|-delta target-branch selection| target-branch selection)[\s\S]*organization-project (?:set )?selection/i,
    message:
      "README.md must explain that QA intake owns default-branch release facts, SemVer target-branch selection, and organization-project selection.",
  },
  {
    relativePath: "README.md",
    pattern:
      /Trust the repository's actual current default branch[\s\S]*PR target branch is not automatically the default branch[\s\S]*major\/minor\/patch release target/i,
    message:
      "README.md must explain that agents trust the live default branch as the next-release signal, but select the PR target branch from the major/minor/patch release target.",
  },
  {
    relativePath: "README.md",
    pattern:
      /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    message:
      "README.md must explain that milestones and release candidates are GitHub prereleases and do not count as the default branch having already shipped.",
  },
  {
    relativePath: "README.md",
    pattern: REVIEW_THREAD_REPLY_POLICY_PATTERN,
    message:
      "README.md must explain that review threads get a decision-explaining reply before they are resolved.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: LIVE_INSTANCE_TEMPLATE_IDENTITY_PATTERN,
    message:
      "COMPANY.md must explain that operator-selected live company names, descriptions, and issue prefixes are valid import choices.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: SOURCE_PACKAGE_PAPERCLIP_YAML_PATTERN,
    message:
      "COMPANY.md must explain that `.paperclip.yaml` references describe source-package defaults rather than required live-instance files.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: COMPANY_ATTACHMENT_LIMIT_PATTERN,
    message:
      "COMPANY.md must document the explicit Paperclip company attachment cap.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: NEW_HIRE_APPROVAL_POLICY_PATTERN,
    message:
      "COMPANY.md must document the explicit Paperclip new-hire approval policy.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: PRODUCTIVITY_REVIEW_PATTERN,
    message:
      "COMPANY.md must explain Paperclip productivity review issues.",
  },
  {
    relativePath: "COMPANY.md",
    pattern:
      /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    message:
      "COMPANY.md must explain that milestones and release candidates are GitHub prereleases and do not count as the default branch having already shipped.",
  },
  {
    relativePath: "tasks/verify-imported-company-instance/TASK.md",
    pattern: LIVE_INSTANCE_TEMPLATE_IDENTITY_PATTERN,
    message:
      "Bootstrap verification must explain that operator-selected live company names, descriptions, and issue prefixes are valid import choices.",
  },
  {
    relativePath: "tasks/verify-imported-company-instance/TASK.md",
    pattern: SOURCE_PACKAGE_PAPERCLIP_YAML_PATTERN,
    message:
      "Bootstrap verification must explain that `.paperclip.yaml` references describe source-package defaults rather than required live-instance files.",
  },
  {
    relativePath: "tasks/verify-imported-company-instance/TASK.md",
    pattern: PRODUCTIVITY_REVIEW_PATTERN,
    message:
      "Bootstrap verification must explain Paperclip productivity review issues.",
  },
  {
    relativePath: "agents/ceo/AGENTS.md",
    pattern: PRODUCTIVITY_REVIEW_PATTERN,
    message:
      "CEO instructions must explain how to handle Paperclip productivity review issues.",
  },
  {
    relativePath: "tasks/daily-ceo-self-improvement/TASK.md",
    pattern: PRODUCTIVITY_REVIEW_PATTERN,
    message:
      "Daily CEO self-improvement task must include productivity review queue-health work.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: PRODUCTIVITY_REVIEW_PATTERN,
    message:
      "Repo operations must explain Paperclip productivity review issues.",
  },
  {
    relativePath: "skills/micronaut-quality-gates/SKILL.md",
    pattern: PRODUCTIVITY_REVIEW_PATTERN,
    message:
      "Quality gates must explain Paperclip productivity review issues.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /actual current default branch[\s\S]*latest stable non-pre-release release[\s\S]*next release implied by that branch/i,
    message:
      "QA instructions must explain how to gather the current default-branch release facts.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    message:
      "QA instructions must explain that milestones and release candidates are GitHub prereleases and do not count as the default branch having already shipped.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /choose the recommended Micronaut organization project[\s\S]*best-fit project/i,
    message:
      "QA instructions must explain that QA chooses the best-fit Micronaut organization project even when ambiguity remains.",
  },
  {
    relativePath: "agents/architect/AGENTS.md",
    pattern:
      /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    message:
      "Architect instructions must preserve the rule that milestones and release candidates are GitHub prereleases and do not count as the default branch having already shipped.",
  },
  {
    relativePath: "agents/architect/AGENTS.md",
    pattern: SOURCE_PACKAGE_PAPERCLIP_YAML_PATTERN,
    message:
      "Architect instructions must explain that `.paperclip.yaml` references describe source-package defaults rather than required live-instance files.",
  },
  {
    relativePath: "agents/architect/AGENTS.md",
    pattern: APPROVAL_LINKAGE_VERIFICATION_PATTERN,
    message:
      "Architect instructions must explain that approval linkage is verified through `GET /api/approvals/{approvalId}/issues` instead of only `issue.linkedApprovalIds`.",
  },
  {
    relativePath: "agents/architect/AGENTS.md",
    pattern: ACTIONABLE_PR_FOLLOW_THROUGH_PATTERN,
    message:
      "Architect instructions must explain that failing PR CI or unresolved review feedback is actionable PR follow-through even when the failure also reproduces on the target branch.",
  },
  {
    relativePath: "agents/ceo/AGENTS.md",
    pattern: APPROVAL_LINKAGE_VERIFICATION_PATTERN,
    message:
      "CEO instructions must explain that approval linkage is verified through `GET /api/approvals/{approvalId}/issues` instead of only `issue.linkedApprovalIds`.",
  },
  {
    relativePath: "agents/ceo/AGENTS.md",
    pattern: ACTIONABLE_PR_FOLLOW_THROUGH_PATTERN,
    message:
      "CEO instructions must explain that failing PR CI or unresolved review feedback is actionable PR follow-through even when the failure also reproduces on the target branch.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /open,\s*public Micronaut organization projects[\s\S]*is:open is:public|is:open is:public[\s\S]*open,\s*public Micronaut organization projects/i,
    message:
      "QA instructions must explain that organization-project selection is limited to open, public Micronaut projects (`is:open is:public`).",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern:
      /If the current default branch has never been released[\s\S]*type:\s*bug[\s\S]*type:\s*improvement[\s\S]*type:\s*enhancement/i,
    message:
      "Repo operations must explain what kinds of work an unreleased default branch may accept.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern:
      /If the current default branch has already been released[\s\S]*type:\s*bug[\s\S]*type:\s*improvement[\s\S]*docs,\s*CI,\s*or build-only/i,
    message:
      "Repo operations must explain what kinds of work an already-released default branch may accept.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: APPROVAL_LINKAGE_VERIFICATION_PATTERN,
    message:
      "Shared repo operations guidance must explain that approval linkage is verified through `GET /api/approvals/{approvalId}/issues` instead of only `issue.linkedApprovalIds`.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: ACTIONABLE_PR_FOLLOW_THROUGH_PATTERN,
    message:
      "Shared repo operations guidance must explain that failing PR CI or unresolved review feedback is actionable PR follow-through even when the failure also reproduces on the target branch.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern:
      /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    message:
      "Repo operations must explain that milestones and release candidates are GitHub prereleases and do not count as the default branch having already shipped.",
  },
  {
    relativePath: "skills/micronaut-quality-gates/SKILL.md",
    pattern:
      /GitHub prereleases[\s\S]*milestones[\s\S]*release candidates[\s\S]*do not count as the default branch having already shipped/i,
    message:
      "Quality gates must explain that milestones and release candidates are GitHub prereleases and do not count as the default branch having already shipped.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: GITHUB_NOT_PLANNED_CLOSE_PATTERN,
    message:
      "Repo operations must explain that direct non-duplicate QA closures use native `Close as not planned` instead of `Close as completed`.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: CLOSED_ISSUE_DEDUP_REASONING_PATTERN,
    message:
      "Repo operations must require QA deduplication against open and closed GitHub issues and review why closed issues were closed.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: GITHUB_DUPLICATE_CLOSE_PATTERN,
    message:
      "Repo operations must explain that duplicate closures use native `Close as duplicate` and link the superseding GitHub issue.",
  },
  {
    relativePath: "skills/micronaut-quality-gates/SKILL.md",
    pattern: GITHUB_NOT_PLANNED_CLOSE_PATTERN,
    message:
      "Quality gates must explain that direct non-duplicate QA closures use native `Close as not planned` instead of `Close as completed`.",
  },
  {
    relativePath: "skills/micronaut-quality-gates/SKILL.md",
    pattern: CLOSED_ISSUE_DEDUP_REASONING_PATTERN,
    message:
      "Quality gates must require QA deduplication against open and closed GitHub issues and review why closed issues were closed.",
  },
  {
    relativePath: "skills/micronaut-quality-gates/SKILL.md",
    pattern: GITHUB_DUPLICATE_CLOSE_PATTERN,
    message:
      "Quality gates must explain that duplicate closures use native `Close as duplicate` and link the superseding GitHub issue.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: EVIDENCE_RICH_CLOSURE_COMMENT_PATTERN,
    message:
      "Repo operations must require GitHub closure comments to cite exact evidence and not be short generic close notes.",
  },
  {
    relativePath: "skills/micronaut-quality-gates/SKILL.md",
    pattern: EVIDENCE_RICH_CLOSURE_COMMENT_PATTERN,
    message:
      "Quality gates must explain that GitHub closure comments contain detailed evidence and are not short generic close notes.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: REVIEW_THREAD_REPLY_POLICY_PATTERN,
    message:
      "Repo operations must explain that review threads get decision-explaining replies before they are resolved.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: REVIEW_THREAD_REPLY_TOOLING_PATTERN,
    message:
      "Repo operations must explain that `reply_to_review_thread` is used before `resolve_review_thread` and silent resolves are not allowed.",
  },
  {
    relativePath: "skills/micronaut-quality-gates/SKILL.md",
    pattern: REVIEW_THREAD_REPLY_POLICY_PATTERN,
    message:
      "Quality gates must explain that review threads get decision-explaining replies before they are resolved.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern:
      /Do not invent or create another target branch during triage/i,
    message:
      "Repo operations must forbid inventing non-default target branches during triage just to fit SemVer.",
  },
  {
    relativePath: "README.md",
    pattern:
      /closed:\s*cannot reproduce[\s\S]*QA|QA[\s\S]*closed:\s*cannot reproduce/i,
    message:
      "README.md must explain that unreproducible issues can be closed by QA with `closed: cannot reproduce`.",
  },
  {
    relativePath: "README.md",
    pattern: ALREADY_IMPLEMENTED_DIRECT_CLOSE_PATTERN,
    message:
      "README.md must explain that already-implemented issues can be closed by QA without board approval when the closure cites the exact version, PR, release, or documentation evidence.",
  },
  {
    relativePath: "README.md",
    pattern: ROUTINE_VERIFIED_NO_OP_PATTERN,
    message:
      "README.md must explain that verified routine no-diff/no-PR work can close without board approval instead of routing through empty QA/Security/Review gates.",
  },
  {
    relativePath: "README.md",
    pattern: GITHUB_NOT_PLANNED_CLOSE_PATTERN,
    message:
      "README.md must explain that direct non-duplicate QA closures use native `Close as not planned` instead of `Close as completed`.",
  },
  {
    relativePath: "README.md",
    pattern:
      /closed:\s*duplicate[\s\S]*duplicate link|duplicate link[\s\S]*closed:\s*duplicate|link(?:ing)? the duplicate issue[\s\S]*closed:\s*duplicate/i,
    message:
      "README.md must explain that duplicate issues can be closed by QA with `closed: duplicate` and a duplicate link.",
  },
  {
    relativePath: "README.md",
    pattern: GITHUB_DUPLICATE_CLOSE_PATTERN,
    message:
      "README.md must explain that duplicate closures use native `Close as duplicate` and link the superseding GitHub issue.",
  },
  {
    relativePath: "README.md",
    pattern: EVIDENCE_RICH_CLOSURE_COMMENT_PATTERN,
    message:
      "README.md must explain that QA GitHub closure comments are detailed, evidence-rich, and not short on details.",
  },
  {
    relativePath: "README.md",
    pattern:
      /GitHub issue closure[\s\S]*syncs back[\s\S]*close the Paperclip item|syncs back[\s\S]*close the Paperclip item[\s\S]*GitHub issue closure|do(?:es)? not close the Paperclip issue directly[\s\S]*sync/i,
    message:
      "README.md must explain that GitHub issue closure syncs back to close the Paperclip item, so QA does not close the Paperclip issue directly.",
  },
  {
    relativePath: "README.md",
    pattern:
      /DONE[\s\S]*CANCELLED[\s\S]*closure disposition[\s\S]*sync|closure disposition[\s\S]*DONE[\s\S]*CANCELLED[\s\S]*sync/i,
    message:
      "README.md must explain that QA-published GitHub answers and closures reach `DONE` or `CANCELLED` based on the closure disposition after sync.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: BOARD_APPROVAL_RECOMMENDED_ACTION_PATTERN,
    message: "COMPANY.md must require board approvals for maintainer-visible GitHub comments to put the exact proposed comment body in `recommendedAction`.",
  },
  {
    relativePath: "COMPANY.md",
    pattern:
      /currentParticipant[\s\S]*returnAssignee|returnAssignee[\s\S]*currentParticipant/i,
    message:
      "COMPANY.md must explain native execution-policy routing through `currentParticipant` and `returnAssignee`.",
  },
  {
    relativePath: "COMPANY.md",
    pattern:
      /normal `?TODO`? assignment only for non-policy owner changes|non-policy owner changes[\s\S]*`?TODO`?/i,
    message:
      "COMPANY.md must limit manual `TODO` handoffs to non-policy owner changes.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: SINGLE_ASSIGNEE_GOVERNANCE_PATTERN,
    message:
      "COMPANY.md must explain that Paperclip issues stay single-assignee and linked approvals are not a second assignee.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: CHECKOUT_RECOVERY_PATTERN,
    message:
      "COMPANY.md must explain checkout-backed agent `in_progress` work and the stranded-work recovery path.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: PARENT_BLOCKER_PATTERN,
    message:
      "COMPANY.md must explain that `parentId` is structural and `blockedByIssueIds` carries dependency semantics.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: ISSUE_THREAD_INTERACTION_PATTERN,
    message:
      "COMPANY.md must explain Paperclip issue-thread interactions for suggested tasks, structured questions, and request-confirmation cards.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: PLAN_CONFIRMATION_PATTERN,
    message:
      "COMPANY.md must explain plan confirmation through a `request_confirmation` interaction with idempotency and continuation policy.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: RESUME_TRUE_PATTERN,
    message:
      "COMPANY.md must explain structured `resume: true` when restarting follow-up on completed assigned issues.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: ENVIRONMENT_RUNTIME_PATTERN,
    message:
      "COMPANY.md must explain Paperclip environments as live runtime configuration and mention sandbox provider installation when needed.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: APPROVAL_LINKAGE_VERIFICATION_PATTERN,
    message:
      "COMPANY.md must explain that approval linkage is verified through `GET /api/approvals/{approvalId}/issues` instead of only `issue.linkedApprovalIds`.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: ACTIONABLE_PR_FOLLOW_THROUGH_PATTERN,
    message:
      "COMPANY.md must explain that failing PR CI or unresolved review feedback is actionable PR follow-through even when the failure also reproduces on the target branch.",
  },
  {
    relativePath: "agents/code-reviewer/AGENTS.md",
    pattern: HEALTHY_PR_MAINTAINER_WAIT_PATTERN,
    message:
      "Code Reviewer instructions must keep healthy PR maintainer-wait issues in `in_review` with no internal assignee instead of routing another follow-through checkpoint.",
  },
  {
    relativePath: "agents/micronaut-engineer/AGENTS.md",
    pattern: HEALTHY_PR_MAINTAINER_WAIT_PATTERN,
    message:
      "Micronaut Engineer instructions must correct healthy PR maintainer-wait reopen noise back to `in_review` with no internal assignee instead of adding another follow-through checkpoint.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: COMMENT_BODY_RECOMMENDED_ACTION_PATTERN,
    message: "COMPANY.md must require GitHub action commentBody proposals to surface their public text in `recommendedAction`.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: ALREADY_IMPLEMENTED_DIRECT_CLOSE_PATTERN,
    message:
      "COMPANY.md must explain that already-implemented issues can be closed by QA without board approval when the closure cites the exact version, PR, release, or documentation evidence.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: ROUTINE_VERIFIED_NO_OP_PATTERN,
    message:
      "COMPANY.md must explain that verified routine no-diff/no-PR work can close without board approval instead of routing through empty QA/Security/Review gates.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: GITHUB_NOT_PLANNED_CLOSE_PATTERN,
    message:
      "COMPANY.md must explain that direct non-duplicate QA closures use native `Close as not planned` instead of `Close as completed`.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: GITHUB_DUPLICATE_CLOSE_PATTERN,
    message:
      "COMPANY.md must explain that duplicate closures use native `Close as duplicate` and link the superseding GitHub issue.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: EVIDENCE_RICH_CLOSURE_COMMENT_PATTERN,
    message:
      "COMPANY.md must explain that QA GitHub closure comments are detailed, evidence-rich, and not short on details.",
  },
  {
    relativePath: "COMPANY.md",
    pattern: REVIEW_THREAD_REPLY_POLICY_PATTERN,
    message:
      "COMPANY.md must explain that review threads get decision-explaining replies before they are resolved.",
  },
  {
    relativePath: "agents/micronaut-engineer/AGENTS.md",
    pattern: REVIEW_THREAD_REPLY_POLICY_PATTERN,
    message:
      "Micronaut Engineer instructions must require a decision-explaining reply before resolving review threads.",
  },
  {
    relativePath: "agents/micronaut-engineer/AGENTS.md",
    pattern: ROUTINE_VERIFIED_NO_OP_PATTERN,
    message:
      "Micronaut Engineer instructions must close verified routine no-diff/no-PR work without board approval instead of routing through empty QA/Security/Review gates.",
  },
  {
    relativePath: "agents/micronaut-engineer/AGENTS.md",
    pattern: REVIEW_THREAD_REPLY_TOOLING_PATTERN,
    message:
      "Micronaut Engineer instructions must explain that `reply_to_review_thread` is used before `resolve_review_thread` and silent resolves are not allowed.",
  },
  {
    relativePath: "agents/micronaut-engineer/AGENTS.md",
    pattern: ACTIONABLE_PR_FOLLOW_THROUGH_PATTERN,
    message:
      "Micronaut Engineer instructions must explain that failing PR CI or unresolved review feedback is actionable PR follow-through even when the failure also reproduces on the target branch.",
  },
  {
    relativePath: "agents/technical-writer/AGENTS.md",
    pattern: REVIEW_THREAD_REPLY_TOOLING_PATTERN,
    message:
      "Technical Writer instructions must explain that docs review threads get a decision-explaining reply before they are resolved.",
  },
  {
    relativePath: "agents/security-engineer/AGENTS.md",
    pattern: REVIEW_THREAD_REPLY_TOOLING_PATTERN,
    message:
      "Security Engineer instructions must explain that PR review threads get a decision-explaining reply before they are resolved.",
  },
  {
    relativePath: "README.md",
    pattern: BOARD_APPROVAL_RECOMMENDED_ACTION_PATTERN,
    message: "README.md must require board approvals for maintainer-visible GitHub comments to put the exact proposed comment body in `recommendedAction`.",
  },
  {
    relativePath: "README.md",
    pattern: COMMENT_BODY_RECOMMENDED_ACTION_PATTERN,
    message: "README.md must require GitHub action commentBody proposals to surface their public text in `recommendedAction`.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: BOARD_APPROVAL_RECOMMENDED_ACTION_PATTERN,
    message: "QA instructions must require board approvals for maintainer-visible GitHub comments to put the exact proposed comment body in `recommendedAction`.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: COMMENT_BODY_RECOMMENDED_ACTION_PATTERN,
    message: "QA instructions must require GitHub action commentBody proposals to surface their public text in `recommendedAction`.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern:
      /qa-intake[\s\S]*qa-verification|qa-verification[\s\S]*qa-intake/i,
    message:
      "QA instructions must require separate `qa-intake` and `qa-verification` issue documents for intake and verification.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern:
      /qa-intake[\s\S]*qa-verification|qa-verification[\s\S]*qa-intake/i,
    message:
      "Shared artifact guidance must name separate `qa-intake` and `qa-verification` issue documents for QA intake and verification.",
  },
  {
    relativePath: "README.md",
    pattern:
      /qa-intake[\s\S]*qa-verification|qa-verification[\s\S]*qa-intake/i,
    message:
      "README.md must explain that QA intake and QA verification use separate issue documents: `qa-intake` and `qa-verification`.",
  },
  {
    relativePath: "COMPANY.md",
    pattern:
      /qa-intake[\s\S]*qa-verification|qa-verification[\s\S]*qa-intake/i,
    message:
      "COMPANY.md must explain that QA intake and QA verification use separate issue documents: `qa-intake` and `qa-verification`.",
  },
  {
    relativePath: "agents/ceo/AGENTS.md",
    pattern: BOARD_APPROVAL_RECOMMENDED_ACTION_PATTERN,
    message: "CEO instructions must require board approvals for maintainer-visible GitHub comments to put the exact proposed comment body in `recommendedAction`.",
  },
  {
    relativePath: "agents/ceo/AGENTS.md",
    pattern:
      /daily self-improvement[\s\S]*(?:currentParticipant|current stage participant)[\s\S]*(?:returnAssignee|return assignee)[\s\S]*correct(?: those)? handoffs|correct(?: those)? handoffs[\s\S]*(?:currentParticipant|current stage participant)[\s\S]*(?:returnAssignee|return assignee)/i,
    message:
      "CEO instructions must require the daily self-improvement routine to review and correct broken handoffs using `currentParticipant` and `returnAssignee` when possible.",
  },
  {
    relativePath: "agents/ceo/AGENTS.md",
    pattern: COMMENT_BODY_RECOMMENDED_ACTION_PATTERN,
    message: "CEO instructions must require GitHub action commentBody proposals to surface their public text in `recommendedAction`.",
  },
  {
    relativePath: "agents/ceo/AGENTS.md",
    pattern:
      /company skill library[\s\S]*skill assignment model|skill assignment model[\s\S]*company skill library/i,
    message:
      "CEO instructions must prefer the live company skill library when a reusable external skill solves the gap better than package prose.",
  },
  {
    relativePath: "tasks/daily-ceo-self-improvement/TASK.md",
    pattern:
      /broken handoffs[\s\S]*(?:currentParticipant|current stage participant)[\s\S]*(?:returnAssignee|return assignee)[\s\S]*do not agree|stale handoff[\s\S]*(?:currentParticipant|current stage participant)[\s\S]*(?:returnAssignee|return assignee)/i,
    message:
      "The daily CEO self-improvement task must require reviewing broken handoffs against `currentParticipant` and `returnAssignee` and correcting routing when possible.",
  },
  {
    relativePath: "tasks/daily-ceo-self-improvement/TASK.md",
    pattern: ISSUE_THREAD_INTERACTION_PATTERN,
    message:
      "The daily CEO self-improvement task must review opportunities to use Paperclip issue-thread interactions.",
  },
  {
    relativePath: "README.md",
    pattern:
      /execution workspace[\s\S]*auto-start workspace services|auto-start workspace services[\s\S]*execution workspace/i,
    message:
      "README.md must explain that execution workspaces are live runtime surfaces and heartbeats do not auto-start workspace services.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern:
      /execution workspace[\s\S]*auto-start|project workspace services[\s\S]*do not auto-start|do not auto-start[\s\S]*project workspace services/i,
    message:
      "Shared repo operations guidance must explain that project and execution workspace services stay manual and are not auto-started by heartbeats.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: SINGLE_ASSIGNEE_GOVERNANCE_PATTERN,
    message:
      "Shared repo operations guidance must explain that issues stay single-assignee and approvals are not a second assignee.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: CHECKOUT_RECOVERY_PATTERN,
    message:
      "Shared repo operations guidance must explain checkout-backed agent `in_progress` work and stranded-work recovery.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: PARENT_BLOCKER_PATTERN,
    message:
      "Shared repo operations guidance must explain that `parentId` is structural and `blockedByIssueIds` carries dependency semantics.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: ISSUE_THREAD_INTERACTION_PATTERN,
    message:
      "Shared repo operations guidance must explain Paperclip issue-thread interactions for suggested tasks, structured questions, and request-confirmation cards.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: PLAN_CONFIRMATION_PATTERN,
    message:
      "Shared repo operations guidance must explain plan confirmation through a `request_confirmation` interaction with idempotency and continuation policy.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern: ENVIRONMENT_RUNTIME_PATTERN,
    message:
      "Shared repo operations guidance must explain Paperclip environments as live runtime configuration and mention sandbox provider installation when needed.",
  },
  {
    relativePath: "agents/architect/AGENTS.md",
    pattern: PLAN_CONFIRMATION_PATTERN,
    message:
      "Architect instructions must use request-confirmation interactions for non-governance plan confirmation.",
  },
  {
    relativePath: "agents/ceo/AGENTS.md",
    pattern: ISSUE_THREAD_INTERACTION_PATTERN,
    message:
      "CEO instructions must explain issue-thread interactions for non-governance board/user input.",
  },
  {
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: /ask_user_questions[\s\S]{0,500}(?:bounded|structured|options)[\s\S]{0,500}continuation/i,
    message:
      "QA instructions must use ask-user-questions interactions for bounded maintainer input.",
  },
  {
    relativePath: "skills/micronaut-repo-operations/SKILL.md",
    pattern:
      /inbox-lite[\s\S]*in_review|in_review[\s\S]*inbox-lite/i,
    message:
      "Shared repo operations guidance must use the Paperclip inbox model that includes `in_review` work.",
  },
  {
    relativePath: "skills/company-package-evolution/SKILL.md",
    pattern:
      /company skill library[\s\S]*skill assignment model|skill assignment model[\s\S]*company skill library/i,
    message:
      "Company package evolution guidance must prefer the live company skill library when a reusable external skill solves the gap better than package prose.",
  },
];
const PAPERCLIP_AGENT_ICONS = new Set([
  "bot",
  "cpu",
  "brain",
  "zap",
  "rocket",
  "code",
  "terminal",
  "shield",
  "eye",
  "search",
  "wrench",
  "hammer",
  "lightbulb",
  "sparkles",
  "star",
  "heart",
  "flame",
  "bug",
  "cog",
  "database",
  "globe",
  "lock",
  "mail",
  "message-square",
  "file-code",
  "git-branch",
  "package",
  "puzzle",
  "target",
  "wand",
  "atom",
  "circuit-board",
  "radar",
  "swords",
  "telescope",
  "microscope",
  "crown",
  "gem",
  "hexagon",
  "pentagon",
  "fingerprint",
]);
const PAPERCLIP_AGENT_ROLES = new Set([
  "ceo",
  "cto",
  "cmo",
  "cfo",
  "security",
  "engineer",
  "designer",
  "pm",
  "qa",
  "devops",
  "researcher",
  "general",
]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function normalizeText(value) {
  return value.replace(/\r\n/g, "\n").trim();
}

function parseFrontmatterMarkdown(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: normalized };
  }
  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertStringArrayEqual(actual, expected, message) {
  assert.deepEqual(sortStrings(actual), sortStrings(expected), message);
}

function assertImportedAdapterConfig(actualAgent, expectedAdapter, agentSlug) {
  assert.equal(
    actualAgent?.adapterType ?? null,
    expectedAdapter?.type ?? null,
    `Adapter type mismatch for imported agent ${agentSlug}`,
  );

  if (expectedAdapter?.type !== "opencode_local" && expectedAdapter?.type !== "hermes_local") {
    return;
  }

  const actualConfig = actualAgent?.adapterConfig ?? {};
  const expectedConfig = expectedAdapter?.config ?? {};
  const comparedKeys = expectedAdapter?.type === "hermes_local"
    ? [
        "provider",
        "model",
        "extraArgs",
        "hermesCommand",
        "cwd",
        "toolsets",
        "timeoutSec",
        "graceSec",
        "checkpoints",
        "persistSession",
      ]
    : [
        "model",
        "variant",
        "dangerouslySkipPermissions",
        "timeoutSec",
        "graceSec",
      ];

  for (const key of comparedKeys) {
    assert.deepEqual(
      actualConfig[key] ?? null,
      expectedConfig[key] ?? null,
      `${expectedAdapter.type} ${key} mismatch for imported agent ${agentSlug}`,
    );
  }
}

function assertImportedAgentRuntimeConfig(actualAgent, expectedRuntime, agentSlug) {
  const expectedHeartbeat = expectedRuntime?.heartbeat ?? null;
  if (expectedHeartbeat) {
    const actualHeartbeat = actualAgent?.runtimeConfig?.heartbeat ?? {};
    for (const [key, value] of Object.entries(expectedHeartbeat)) {
      assert.deepEqual(
        actualHeartbeat?.[key] ?? null,
        value,
        `Runtime heartbeat ${key} mismatch for imported agent ${agentSlug}`,
      );
    }
  }

  const expectedCheapProfile = expectedRuntime?.modelProfiles?.cheap ?? null;
  if (!expectedCheapProfile) {
    return;
  }

  assert.deepEqual(
    actualAgent?.runtimeConfig?.modelProfiles?.cheap ?? null,
    expectedCheapProfile,
    `Runtime cheap model profile config mismatch for imported agent ${agentSlug}`,
  );
}

function normalizeSkillReference(skillReference) {
  return skillReference.includes("/")
    ? skillReference.split("/").at(-1) ?? skillReference
    : skillReference;
}

function normalizeSkillSourceMetadataEntry(source) {
  return {
    repo: source?.repo ?? null,
    path: source?.path ?? null,
    commit: source?.commit ?? null,
  };
}

function normalizePaperclipAgentIcon(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function assertValidPaperclipAgentIcon(value, relativePath) {
  assert.ok(
    value,
    `Expected metadata.paperclip.agentIcon in ${relativePath}`,
  );
  assert.ok(
    PAPERCLIP_AGENT_ICONS.has(value),
    [
      `Expected metadata.paperclip.agentIcon in ${relativePath} to be a valid Paperclip icon id`,
      `Received: ${value}`,
      `Allowed: ${[...PAPERCLIP_AGENT_ICONS].join(", ")}`,
    ].join("\n"),
  );
}

function assertValidPaperclipAgentRole(value, relativePath) {
  assert.equal(
    typeof value,
    "string",
    `Expected role in ${relativePath}`,
  );
  assert.ok(
    PAPERCLIP_AGENT_ROLES.has(value),
    [
      `Expected role in ${relativePath} to be a valid Paperclip agent role`,
      `Received: ${value}`,
      `Allowed: ${[...PAPERCLIP_AGENT_ROLES].join(", ")}`,
    ].join("\n"),
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRoutineTriggerEntry(trigger) {
  if (!isPlainObject(trigger)) {
    return null;
  }
  return {
    kind: typeof trigger.kind === "string" ? trigger.kind : null,
    label: typeof trigger.label === "string" ? trigger.label : null,
    enabled: trigger.enabled !== false,
    cronExpression:
      typeof trigger.cronExpression === "string" ? trigger.cronExpression : null,
    timezone: typeof trigger.timezone === "string" ? trigger.timezone : null,
    signingMode:
      typeof trigger.signingMode === "string" ? trigger.signingMode : null,
    replayWindowSec:
      Number.isInteger(trigger.replayWindowSec) ? trigger.replayWindowSec : null,
  };
}

function normalizeRoutineDefinition(value) {
  if (!isPlainObject(value)) {
    return null;
  }
  return {
    status: typeof value.status === "string" ? value.status : null,
    priority: typeof value.priority === "string" ? value.priority : null,
    concurrencyPolicy:
      typeof value.concurrencyPolicy === "string" ? value.concurrencyPolicy : null,
    catchUpPolicy:
      typeof value.catchUpPolicy === "string" ? value.catchUpPolicy : null,
    triggers: Array.isArray(value.triggers)
      ? value.triggers
          .map(normalizeRoutineTriggerEntry)
          .filter((entry) => entry !== null)
      : [],
  };
}

function normalizeRoutineDefinitionForExport(value) {
  const normalized = normalizeRoutineDefinition(value);
  if (!normalized) {
    return null;
  }
  return {
    ...normalized,
    // Paperclip currently preserves live routine status on routine records,
    // but omits it from exported .paperclip.yaml routine definitions.
    status: null,
  };
}

function getTextFile(files, relativePath) {
  const entry = files[relativePath];
  assert.equal(
    typeof entry,
    "string",
    `Expected exported text file at ${relativePath}`,
  );
  return entry;
}

function bodyOfMarkdown(markdown) {
  return normalizeText(parseFrontmatterMarkdown(markdown).body);
}

function isPortableRuntimeFile(relativePath) {
  return PORTABLE_RUNTIME_FILE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function formatRuntimeReferenceViolations(violations) {
  return violations.map(({ relativePath, match }) => `${relativePath}: ${match}`).join("\n");
}

function assertPortableRuntimeFilesAvoidUnimportedPackageReferences(files) {
  const violations = [];

  for (const [relativePath, content] of Object.entries(files)) {
    if (!isPortableRuntimeFile(relativePath)) {
      continue;
    }

    const matches = content.match(/\breferences\/[A-Za-z0-9._/-]+/g) ?? [];
    for (const match of matches) {
      violations.push({ relativePath, match });
    }
  }

  assert.equal(
    violations.length,
    0,
    [
      "Portable runtime instruction files may not reference package files under references/, because those files are not available in imported company instances.",
      formatRuntimeReferenceViolations(violations),
    ].filter(Boolean).join("\n\n"),
  );
}

function assertPortableRuntimeFilesAvoidMissingRepoFiles(files, rootDir, relativePaths) {
  const violations = [];

  for (const [relativePath, content] of Object.entries(files)) {
    if (!isPortableRuntimeFile(relativePath)) {
      continue;
    }

    for (const referencedPath of relativePaths) {
      const pattern = new RegExp(`\\b${referencedPath.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "g");
      const absoluteReferencedPath = path.join(rootDir, referencedPath);
      if (existsSync(absoluteReferencedPath)) {
        continue;
      }

      const matches = [...content.matchAll(pattern)].filter((match) => {
        const start = match.index ?? -1;
        if (start < 0) {
          return false;
        }
        const prefix = content.slice(Math.max(0, start - 3), start);
        return prefix !== "://";
      });
      if (matches.length === 0) {
        continue;
      }

      for (const match of matches) {
        violations.push({ relativePath, match });
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    [
      "Portable runtime instruction files may not reference repo-local files that are not shipped with the package.",
      formatRuntimeReferenceViolations(violations),
    ].filter(Boolean).join("\n\n"),
  );
}

function assertAgentInstructionsUseExecutionPolicyWorkflow(files) {
  const agentInstructionPaths = Object.keys(files).filter((relativePath) =>
    /^agents\/[^/]+\/AGENTS\.md$/.test(relativePath)
  );

  for (const relativePath of agentInstructionPaths) {
    const content = files[relativePath];

    for (const heading of REQUIRED_AGENT_INSTRUCTION_HEADINGS) {
      assert.match(
        content,
        new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"),
        `${relativePath} must contain the heading "${heading}"`,
      );
    }

    for (const pattern of REQUIRED_AGENT_EXECUTION_POLICY_PATTERNS) {
      assert.match(
        content,
        pattern,
        `${relativePath} must describe the execution-policy-driven current stage contract.`,
      );
    }

    for (const pattern of REQUIRED_AGENT_TOOL_USE_PATTERNS) {
      assert.match(
        content,
        pattern,
        `${relativePath} must include explicit Tool Use guidance for Paperclip built-ins and GitHub sync plugin tools.`,
      );
    }

    for (const pattern of REQUIRED_AGENT_HANDOFF_PATTERNS) {
      assert.match(
        content,
        pattern,
        `${relativePath} must teach native execution-policy routing plus the limited manual handoff exception for non-policy owner changes.`,
      );
    }

    for (const pattern of FORBIDDEN_AGENT_HANDOFF_PATTERNS) {
      assert.doesNotMatch(
        content,
        pattern,
        `${relativePath} still contains the pre-handoff-contract wording: ${pattern}`,
      );
    }
  }
}

function assertSharedWorkflowDocsAvoidLegacyHandoffLanguage(files) {
  for (const relativePath of ["COMPANY.md", "README.md", "skills/micronaut-repo-operations/SKILL.md", "skills/micronaut-quality-gates/SKILL.md", "skills/micronaut-security-review/SKILL.md"]) {
    const content = files[relativePath];
    if (!content) {
      continue;
    }

    for (const pattern of REQUIRED_SHARED_HANDOFF_PATTERNS) {
      assert.match(
        content,
        pattern,
        `${relativePath} must describe native execution-policy routing through ` + "`currentParticipant` + `returnAssignee` + `in_review`.",
      );
    }

    for (const pattern of FORBIDDEN_SHARED_WORKFLOW_PATTERNS) {
      assert.doesNotMatch(
        content,
        pattern,
        `${relativePath} still contains the pre-handoff-contract wording: ${pattern}`,
      );
    }
  }
}

function assertWorkflowDocsMentionCurrentRuntimeExpectations(files) {
  for (const { relativePath, pattern, message } of REQUIRED_WORKFLOW_DOC_PATTERNS) {
    const content = files[relativePath];
    assert.ok(content, `Expected ${relativePath} in portable package files.`);
    assert.match(content, pattern, message);
  }
}

async function walkFiles(rootDir, relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  const output = [];
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const nextRelative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await walkFiles(rootDir, nextRelative)));
      continue;
    }
    output.push(toPosix(nextRelative));
  }
  return output;
}

async function collectPortableSourceFiles(rootDir) {
  const files = new Map();
  for (const relativePath of ROOT_PACKAGE_FILES) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }
    files.set(
      relativePath,
      await readFile(absolutePath, "utf8"),
    );
  }
  for (const relativeDir of ROOT_PACKAGE_DIRS) {
    const absoluteDir = path.join(rootDir, relativeDir);
    if (!existsSync(absoluteDir)) {
      continue;
    }
    for (const relativePath of await walkFiles(rootDir, relativeDir)) {
      files.set(relativePath, await readFile(path.join(rootDir, relativePath), "utf8"));
    }
  }
  return Object.fromEntries(
    [...files.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function loadSourceExpectations(rootDir) {
  for (const relativeDir of DISALLOWED_PACKAGE_DIRS) {
    const absoluteDir = path.join(rootDir, relativeDir);
    assert.equal(
      existsSync(absoluteDir),
      false,
      [
        `Portable package directory ${relativeDir}/ is not import-safe.`,
        "Paperclip company portability only preserves company, agents, skills, projects, issues, and the Paperclip extension surface.",
        "Move any required runtime guidance into imported files and remove this directory from the package.",
      ].join("\n"),
    );
  }

  const files = await collectPortableSourceFiles(rootDir);
  assertPortableRuntimeFilesAvoidUnimportedPackageReferences(files);
  assertPortableRuntimeFilesAvoidMissingRepoFiles(files, rootDir, ["skills.sh"]);
  assertAgentInstructionsUseExecutionPolicyWorkflow(files);
  assertSharedWorkflowDocsAvoidLegacyHandoffLanguage(files);
  assertWorkflowDocsMentionCurrentRuntimeExpectations(files);
  const companyMarkdown = files["COMPANY.md"];
  assert.ok(companyMarkdown, "Expected COMPANY.md in source package");
  const extensionYaml = files[".paperclip.yaml"];
  assert.ok(extensionYaml, "Expected .paperclip.yaml in source package");

  const { frontmatter: companyFrontmatter } = parseFrontmatterMarkdown(companyMarkdown);
  const extension = YAML.parse(extensionYaml) ?? {};
  assert.equal(
    extension?.company?.attachmentMaxBytes,
    DEFAULT_COMPANY_ATTACHMENT_MAX_BYTES,
    "Expected .paperclip.yaml to set the Paperclip company attachment cap to 10 MiB.",
  );
  assert.equal(
    extension?.company?.requireBoardApprovalForNewAgents,
    false,
    "Expected .paperclip.yaml to set the explicit new-hire approval policy.",
  );

  const agents = new Map();
  const skills = new Map();
  const projects = new Map();
  const issues = new Map();

  for (const [relativePath, content] of Object.entries(files)) {
    if (relativePath.startsWith("agents/") && relativePath.endsWith("/AGENTS.md")) {
      const slug = relativePath.split("/")[1];
      const { frontmatter, body } = parseFrontmatterMarkdown(content);
      const paperclipAgentIcon = normalizePaperclipAgentIcon(
        frontmatter.metadata?.paperclip?.agentIcon,
      );
      assertValidPaperclipAgentIcon(paperclipAgentIcon, relativePath);
      assertValidPaperclipAgentRole(frontmatter.role, relativePath);
      agents.set(slug, {
        slug,
        name: frontmatter.name,
        role: frontmatter.role,
        title: frontmatter.title ?? null,
        reportsTo: frontmatter.reportsTo ?? null,
        skills: Array.isArray(frontmatter.skills) ? frontmatter.skills : [],
        adapter: extension?.agents?.[slug]?.adapter ?? null,
        runtime: extension?.agents?.[slug]?.runtime ?? null,
        paperclipAgentIcon,
        path: relativePath,
        body: normalizeText(body),
      });
      continue;
    }

    if (relativePath.startsWith("skills/") && relativePath.endsWith("/SKILL.md")) {
      const slug = relativePath.split("/")[1];
      const { frontmatter, body } = parseFrontmatterMarkdown(content);
      skills.set(slug, {
        slug,
        name: frontmatter.name,
        description: frontmatter.description ?? null,
        metadataSources: (frontmatter.metadata?.sources ?? []).map(
          normalizeSkillSourceMetadataEntry,
        ),
        path: relativePath,
        body: normalizeText(body),
      });
      continue;
    }

    if (relativePath.startsWith("projects/") && relativePath.endsWith("/PROJECT.md")) {
      const slug = relativePath.split("/")[1];
      const { frontmatter, body } = parseFrontmatterMarkdown(content);
      projects.set(slug, {
        slug,
        name: frontmatter.name,
        description: frontmatter.description ?? null,
        owner: frontmatter.owner ?? null,
        path: relativePath,
        body: normalizeText(body),
      });
      continue;
    }

    if (relativePath.endsWith("/TASK.md")) {
      const { frontmatter, body } = parseFrontmatterMarkdown(content);
      const segments = relativePath.split("/");
      const isProjectTask = segments[0] === "projects";
      const slug = isProjectTask ? segments[3] : segments[1];
      const projectSlug = isProjectTask ? segments[1] : (frontmatter.project ?? null);
      const taskExtension = isPlainObject(extension?.tasks?.[slug])
        ? extension.tasks[slug]
        : null;
      const routine = normalizeRoutineDefinition(extension?.routines?.[slug]);
      issues.set(slug, {
        slug,
        title: frontmatter.name,
        assignee: frontmatter.assignee ?? null,
        projectSlug,
        status:
          (typeof taskExtension?.status === "string" ? taskExtension.status : null)
          ?? (routine ? routine.status ?? null : "backlog"),
        priority:
          (typeof taskExtension?.priority === "string" ? taskExtension.priority : null)
          ?? (routine ? null : "medium"),
        recurring: Boolean(frontmatter.schedule) || frontmatter.recurring === true || routine !== null,
        timezone: frontmatter.schedule?.timezone ?? null,
        routine,
        path: relativePath,
        body: normalizeText(body),
      });
    }
  }

  return {
    files,
    company: {
      name: companyFrontmatter.name,
      description: companyFrontmatter.description ?? null,
    },
    extension,
    agents,
    skills,
    projects,
    issues,
  };
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to determine allocated port")));
        return;
      }
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null) {
      resolve(child.exitCode);
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Process did not exit within ${timeoutMs}ms`));
    }, timeoutMs);
    const onExit = (code) => {
      cleanup();
      resolve(code ?? 0);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    function cleanup() {
      clearTimeout(timeout);
      child.off("exit", onExit);
      child.off("error", onError);
    }
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  try {
    await waitForExit(child, 15000);
  } catch {
    child.kill("SIGKILL");
    await waitForExit(child, 15000);
  }
}


function isolatedPaperclipEnv(overrides = {}) {
  const baseEnv = { ...process.env };
  for (const key of Object.keys(baseEnv)) {
    if (key.startsWith("PAPERCLIP_") || key === "DATABASE_URL" || key === "BETTER_AUTH_SECRET") {
      delete baseEnv[key];
    }
  }
  return {
    ...baseEnv,
    CI: "true",
    PAPERCLIP_OPEN_ON_LISTEN: "false",
    ...overrides,
  };
}

async function runCli(args, { env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [paperclipCliPath, ...args], {
      cwd: repoRoot,
      env: isolatedPaperclipEnv(env),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          [
            `paperclipai ${args.join(" ")} failed with exit code ${code}`,
            stdout.trim(),
            stderr.trim(),
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      );
    });
  });
}

async function waitForConfigFile(configPath, serverHandle, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (serverHandle.child.exitCode !== null && !existsSync(configPath)) {
      throw new Error(
        `paperclipai onboard exited before writing ${configPath}.\n\n${serverHandle.logs()}`,
      );
    }
    if (existsSync(configPath)) {
      try {
        const raw = await readFile(configPath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed?.server?.port && parsed?.database?.embeddedPostgresPort) {
          return parsed;
        }
      } catch {
        // keep polling until the config becomes valid JSON
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Timed out waiting for onboarding to write ${configPath}.\n\n${serverHandle.logs()}`,
  );
}

function spawnServer(args, { env = {}, cwd = repoRoot } = {}) {
  const child = spawn(process.execPath, [paperclipCliPath, ...args], {
    cwd,
    env: isolatedPaperclipEnv(env),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  const appendLog = (chunk) => {
    logs += chunk.toString();
    if (logs.length > 100_000) {
      logs = logs.slice(-100_000);
    }
  };

  child.stdout.on("data", appendLog);
  child.stderr.on("data", appendLog);

  return {
    child,
    logs: () => logs,
  };
}

async function apiJson(baseUrl, pathname, { method = "GET", body } = {}) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method,
    headers: {
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!response.ok) {
    throw new Error(
      `API ${method} ${pathname} failed with ${response.status}: ${text}`,
    );
  }
  return parsed;
}

async function waitForHealth(baseUrl, serverHandle, timeoutMs = 180_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (serverHandle.child.exitCode !== null) {
      throw new Error(
        `Paperclip exited before becoming healthy.\n\n${serverHandle.logs()}`,
      );
    }
    try {
      const health = await apiJson(baseUrl, "/api/health");
      if (health?.status === "ok") {
        return health;
      }
    } catch {
      // server is still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `Timed out waiting for Paperclip health endpoint.\n\n${serverHandle.logs()}`,
  );
}

async function configureIsolatedInstance(dataDir) {
  const configPath = path.join(dataDir, "instances", "default", "config.json");
  const onboardingHandle = spawnServer(["onboard", "-y", "-d", dataDir], { cwd: dataDir });
  const config = await waitForConfigFile(configPath, onboardingHandle);
  await stopServer(onboardingHandle.child);
  config.server.port = await getFreePort();
  config.database.embeddedPostgresPort = await getFreePort();
  config.telemetry = { enabled: false };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return {
    configPath,
    port: config.server.port,
  };
}

function assertExportedBody(exportFiles, relativePath, expectedBody, expectedSlug) {
  const exportedMarkdown = getTextFile(exportFiles, relativePath);
  const actualBody = bodyOfMarkdown(exportedMarkdown);
  if (expectedSlug === "verify-imported-company-instance") {
    // Paperclip exports all issues through the issue list path, whose description
    // projection is capped at 1200 chars. The import remains correct, so keep the
    // source text human-readable and accept exactly that prefix-only export.
    const expectedTruncatedPrefix = normalizeText(
      expectedBody.slice(0, PAPERCLIP_ISSUE_LIST_DESCRIPTION_EXPORT_MAX_CHARS),
    );
    const minimumExpectedLength = Math.min(
      expectedBody.length,
      expectedTruncatedPrefix.length,
    );
    assert.ok(
      actualBody.length >= minimumExpectedLength,
      `Expected exported body for ${relativePath} to retain at least ${minimumExpectedLength} characters despite the current Paperclip export truncation for this bootstrap task, but found ${actualBody.length}`,
    );
    assert.ok(
      expectedBody.startsWith(actualBody),
      `Expected exported body for ${relativePath} to remain a prefix of the source package despite the current Paperclip export truncation for this bootstrap task`,
    );
    return;
  }
  assert.equal(
    actualBody,
    expectedBody,
    `Expected exported body for ${relativePath} to match the source package`,
  );
}

async function main() {
  assert.ok(
    existsSync(paperclipPackageEntrypointPath),
    "paperclipai is not installed. Run `npm install` first.",
  );
  assert.ok(
    existsSync(paperclipCliPath),
    "Paperclip CLI wrapper is missing.",
  );

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  assert.ok(
    nodeMajor >= 20,
    `Node ${process.version} is unsupported for Paperclip. Use Node 20-22.`,
  );

  const expected = await loadSourceExpectations(repoRoot);
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "micronaut-agent-company-"));
  let serverHandle = null;

  try {
    console.log("Bootstrapping isolated Paperclip instance...");
    const { port } = await configureIsolatedInstance(dataDir);
    const baseUrl = `http://127.0.0.1:${port}`;

    console.log(`Starting Paperclip on ${baseUrl}...`);
    serverHandle = spawnServer(["run", "-d", dataDir], {
      cwd: dataDir,
      env: {
        PORT: String(port),
      },
    });
    await waitForHealth(baseUrl, serverHandle);

    console.log("Verifying the instance starts empty...");
    const companiesBeforeImport = await apiJson(baseUrl, "/api/companies");
    assert.deepEqual(companiesBeforeImport, [], "Expected an empty Paperclip instance");

    console.log("Importing the Micronaut company package through the Paperclip API...");
    const importResult = await apiJson(baseUrl, "/api/companies/import", {
      method: "POST",
      body: {
        source: {
          type: "inline",
          rootPath: "micronaut-agent-company",
          files: expected.files,
        },
        include: {
          company: true,
          agents: true,
          projects: true,
          issues: true,
          skills: true,
        },
        target: {
          mode: "new_company",
        },
        agents: "all",
        collisionStrategy: "rename",
      },
    });

    assert.ok(importResult?.company?.id, "Import did not return a company id");
    assert.deepEqual(importResult.warnings ?? [], [], "Import should not emit warnings");
    const importedCompanyId = importResult.company.id;

    console.log("Checking created entities through company, agent, project, and issue APIs...");
    const companiesAfterImport = await apiJson(baseUrl, "/api/companies");
    assert.equal(companiesAfterImport.length, 1, "Expected exactly one company after import");

    const company = await apiJson(baseUrl, `/api/companies/${importedCompanyId}`);
    assert.equal(company.name, expected.company.name);
    assert.equal(company.description, expected.company.description);
    if ("attachmentMaxBytes" in company) {
      assert.equal(
        company.attachmentMaxBytes,
        DEFAULT_COMPANY_ATTACHMENT_MAX_BYTES,
        "Imported company attachment cap did not match the package default.",
      );
    } else {
      console.warn(
        "Skipping imported company attachment cap API assertion; this Paperclip runtime does not expose attachmentMaxBytes on GET /api/companies/{id}.",
      );
    }
    assert.equal(
      company.requireBoardApprovalForNewAgents,
      false,
      "Imported company new-hire approval policy did not match the package default.",
    );

    const importedAgents = await apiJson(baseUrl, `/api/companies/${importedCompanyId}/agents`);
    assert.equal(importedAgents.length, expected.agents.size);
    assertStringArrayEqual(
      importedAgents.map((agent) => agent.name),
      [...expected.agents.values()].map((agent) => agent.name),
      "Imported agent names did not match the source package",
    );
    const importedAgentIdBySlug = new Map(
      [...expected.agents.values()].map((expectedAgent) => {
        const importedAgent = importedAgents.find(
          (agent) => agent.name === expectedAgent.name,
        );
        assert.ok(importedAgent, `Missing imported agent ${expectedAgent.slug}`);
        assert.equal(
          importedAgent.role,
          expectedAgent.role,
          `Role mismatch for imported agent ${expectedAgent.slug}`,
        );
        assertImportedAdapterConfig(
          importedAgent,
          expectedAgent.adapter,
          expectedAgent.slug,
        );
        assertImportedAgentRuntimeConfig(
          importedAgent,
          expectedAgent.runtime,
          expectedAgent.slug,
        );
        return [expectedAgent.slug, importedAgent.id];
      }),
    );

    const importedProjects = await apiJson(baseUrl, `/api/companies/${importedCompanyId}/projects`);
    assert.equal(importedProjects.length, expected.projects.size);
    assertStringArrayEqual(
      importedProjects.map((project) => project.name),
      [...expected.projects.values()].map((project) => project.name),
      "Imported project names did not match the source package",
    );
    const importedProjectIdBySlug = new Map(
      [...expected.projects.values()].map((expectedProject) => {
        const importedProject = importedProjects.find(
          (project) => project.name === expectedProject.name,
        );
        assert.ok(importedProject, `Missing imported project ${expectedProject.slug}`);
        return [expectedProject.slug, importedProject.id];
      }),
    );

    const expectedOpenIssues = [...expected.issues.values()].filter((issue) => !issue.recurring);
    const expectedRoutines = [...expected.issues.values()].filter((issue) => issue.recurring);

    const importedIssues = await apiJson(baseUrl, `/api/companies/${importedCompanyId}/issues`);
    assert.equal(importedIssues.length, expectedOpenIssues.length);
    assertStringArrayEqual(
      importedIssues.map((issue) => issue.title),
      expectedOpenIssues.map((issue) => issue.title),
      "Imported issue titles did not match the source package",
    );
    for (const expectedIssue of expectedOpenIssues) {
      const actualIssue = importedIssues.find((issue) => issue.title === expectedIssue.title);
      assert.ok(actualIssue, `Missing imported issue ${expectedIssue.slug}`);
      const issueDetail = await apiJson(baseUrl, `/api/issues/${actualIssue.id}`);
      assert.equal(issueDetail.title, expectedIssue.title);
      assert.equal(
        issueDetail.projectId ?? null,
        expectedIssue.projectSlug ? importedProjectIdBySlug.get(expectedIssue.projectSlug) : null,
        `Issue project mismatch for ${expectedIssue.slug}`,
      );
      assert.equal(
        issueDetail.assigneeAgentId ?? null,
        expectedIssue.assignee ? importedAgentIdBySlug.get(expectedIssue.assignee) : null,
        `Issue assignee mismatch for ${expectedIssue.slug}`,
      );
      if (expectedIssue.status !== null) {
        assert.equal(
          issueDetail.status ?? null,
          expectedIssue.status,
          `Issue status mismatch for ${expectedIssue.slug}`,
        );
      }
      if (expectedIssue.priority !== null) {
        assert.equal(
          issueDetail.priority ?? null,
          expectedIssue.priority,
          `Issue priority mismatch for ${expectedIssue.slug}`,
        );
      }
      assert.equal(
        normalizeText(issueDetail.description ?? ""),
        expectedIssue.body,
        `Issue description mismatch for ${expectedIssue.slug}`,
      );
    }

    const importedRoutines = await apiJson(
      baseUrl,
      `/api/companies/${importedCompanyId}/routines`,
    );
    assert.equal(importedRoutines.length, expectedRoutines.length);
    assertStringArrayEqual(
      importedRoutines.map((routine) => routine.title),
      expectedRoutines.map((issue) => issue.title),
      "Imported routine titles did not match the recurring task package entries",
    );
    for (const expectedRoutine of expectedRoutines) {
      const actualRoutine = importedRoutines.find(
        (routine) => routine.title === expectedRoutine.title,
      );
      assert.ok(actualRoutine, `Missing imported routine ${expectedRoutine.slug}`);
      const routineDetail = await apiJson(baseUrl, `/api/routines/${actualRoutine.id}`);
      assert.equal(routineDetail.title, expectedRoutine.title);
      assert.equal(
        routineDetail.projectId,
        importedProjectIdBySlug.get(expectedRoutine.projectSlug),
        `Routine project mismatch for ${expectedRoutine.slug}`,
      );
      assert.equal(
        routineDetail.assigneeAgentId,
        importedAgentIdBySlug.get(expectedRoutine.assignee),
        `Routine assignee mismatch for ${expectedRoutine.slug}`,
      );
      assert.equal(
        normalizeText(routineDetail.description ?? ""),
        expectedRoutine.body,
        `Routine description mismatch for ${expectedRoutine.slug}`,
      );
      if (expectedRoutine.routine) {
        if (expectedRoutine.routine.status !== null) {
          assert.equal(
            routineDetail.status ?? null,
            expectedRoutine.routine.status,
            `Routine status mismatch for ${expectedRoutine.slug}`,
          );
        }
        assert.deepEqual(
          routineDetail.triggers.map(normalizeRoutineTriggerEntry),
          expectedRoutine.routine.triggers,
          `Routine triggers mismatch for ${expectedRoutine.slug}`,
        );
      } else if (expectedRoutine.timezone) {
        assert.ok(
          routineDetail.triggers.some(
            (trigger) => trigger.timezone === expectedRoutine.timezone,
          ),
          `Expected routine timezone ${expectedRoutine.timezone} for ${expectedRoutine.slug}`,
        );
      }
    }

    console.log("Exporting the imported company through the Paperclip API for round-trip verification...");
    const exportResult = await apiJson(baseUrl, `/api/companies/${importedCompanyId}/export`, {
      method: "POST",
      body: {
        include: {
          company: true,
          agents: true,
          projects: true,
          issues: true,
          skills: true,
        },
      },
    });

    assert.deepEqual(exportResult.warnings ?? [], [], "Export should not emit warnings");
    assert.ok(exportResult.manifest, "Export did not include a manifest");
    assert.ok(exportResult.files, "Export did not include file contents");
    assert.ok(
      typeof exportResult.files["README.md"] === "string",
      "Export should include a generated README.md",
    );

    assert.equal(exportResult.manifest.company?.name, expected.company.name);
    assert.equal(exportResult.manifest.company?.description ?? null, expected.company.description);

    assert.equal(exportResult.manifest.agents.length, expected.agents.size);
    for (const expectedAgent of expected.agents.values()) {
      const actualAgent = exportResult.manifest.agents.find(
        (agent) => agent.slug === expectedAgent.slug,
      );
      assert.ok(actualAgent, `Missing exported agent ${expectedAgent.slug}`);
      assert.equal(actualAgent.name, expectedAgent.name);
      assert.equal(actualAgent.role, expectedAgent.role);
      assert.equal(actualAgent.title ?? null, expectedAgent.title);
      assert.equal(actualAgent.reportsToSlug ?? null, expectedAgent.reportsTo);
      assert.equal(actualAgent.path, expectedAgent.path);
      assertStringArrayEqual(
        (actualAgent.skills ?? []).map(normalizeSkillReference),
        expectedAgent.skills.map(normalizeSkillReference),
        `Skill list mismatch for agent ${expectedAgent.slug}`,
      );
      assertExportedBody(exportResult.files, actualAgent.path, expectedAgent.body);
    }

    assert.ok(
      exportResult.manifest.skills.length >= expected.skills.size,
      "Exported skills should include all custom Micronaut company skills",
    );
    for (const expectedSkill of expected.skills.values()) {
      const actualSkill = exportResult.manifest.skills.find(
        (skill) => skill.slug === expectedSkill.slug,
      );
      assert.ok(actualSkill, `Missing exported skill ${expectedSkill.slug}`);
      assert.equal(actualSkill.name, expectedSkill.name);
      assert.equal(actualSkill.description ?? null, expectedSkill.description);
      assert.ok(
        actualSkill.path === expectedSkill.path ||
          actualSkill.path.endsWith(`/${expectedSkill.slug}/SKILL.md`),
        `Unexpected export path for skill ${expectedSkill.slug}: ${actualSkill.path}`,
      );
      const exportedSkillMarkdown = getTextFile(exportResult.files, actualSkill.path);
      const { frontmatter: exportedSkillFrontmatter } = parseFrontmatterMarkdown(
        exportedSkillMarkdown,
      );
      assert.deepEqual(
        (exportedSkillFrontmatter.metadata?.sources ?? []).map(
          normalizeSkillSourceMetadataEntry,
        ),
        expectedSkill.metadataSources,
        `Source metadata mismatch for skill ${expectedSkill.slug}`,
      );
      assertExportedBody(exportResult.files, actualSkill.path, expectedSkill.body);
    }

    assert.equal(exportResult.manifest.projects.length, expected.projects.size);
    for (const expectedProject of expected.projects.values()) {
      const actualProject = exportResult.manifest.projects.find(
        (project) => project.slug === expectedProject.slug,
      );
      assert.ok(actualProject, `Missing exported project ${expectedProject.slug}`);
      assert.equal(actualProject.name, expectedProject.name);
      assert.equal(actualProject.description ?? null, expectedProject.description);
      assert.equal(actualProject.path, expectedProject.path);
    }

    assert.equal(exportResult.manifest.issues.length, expected.issues.size);
    for (const expectedIssue of expected.issues.values()) {
      const actualIssue = exportResult.manifest.issues.find(
        (issue) => issue.title === expectedIssue.title,
      );
      assert.ok(actualIssue, `Missing exported issue ${expectedIssue.title}`);
      assert.equal(actualIssue.title, expectedIssue.title);
      assert.equal(actualIssue.assigneeAgentSlug ?? null, expectedIssue.assignee);
      assert.equal(actualIssue.projectSlug ?? null, expectedIssue.projectSlug);
      assert.equal(actualIssue.recurring, expectedIssue.recurring);
      if (expectedIssue.status !== null && !expectedIssue.recurring) {
        assert.equal(actualIssue.status ?? null, expectedIssue.status);
      }
      if (expectedIssue.priority !== null) {
        assert.equal(actualIssue.priority ?? null, expectedIssue.priority);
      }
      assert.ok(
        actualIssue.path.startsWith("tasks/") && actualIssue.path.endsWith("/TASK.md"),
        `Unexpected export path for issue ${expectedIssue.title}: ${actualIssue.path}`,
      );
      if (expectedIssue.recurring) {
        assert.ok(actualIssue.routine, `Expected routine metadata for ${expectedIssue.slug}`);
        assert.ok(
          Array.isArray(actualIssue.routine.triggers) &&
            actualIssue.routine.triggers.length > 0,
          `Expected at least one routine trigger for ${expectedIssue.slug}`,
        );
        if (expectedIssue.timezone) {
          assert.ok(
            actualIssue.routine.triggers.some(
              (trigger) => trigger.timezone === expectedIssue.timezone,
            ),
            `Expected routine timezone ${expectedIssue.timezone} for ${expectedIssue.slug}`,
          );
        }
      }
      assertExportedBody(
        exportResult.files,
        actualIssue.path,
        expectedIssue.body,
        expectedIssue.slug,
      );
    }

    const exportedExtension = YAML.parse(
      getTextFile(exportResult.files, exportResult.paperclipExtensionPath ?? ".paperclip.yaml"),
    );
    assertStringArrayEqual(
      Object.keys(exportedExtension?.agents ?? {}),
      Object.keys(expected.extension?.agents ?? {}),
      "Agent adapter entries were not preserved in the exported Paperclip extension",
    );
    for (const [agentSlug, expectedAgentConfig] of Object.entries(
      expected.extension?.agents ?? {},
    )) {
      assert.deepEqual(
        exportedExtension?.agents?.[agentSlug]?.adapter ?? null,
        expectedAgentConfig?.adapter ?? null,
        `Adapter config was not preserved for ${agentSlug}`,
      );
      for (const [key, value] of Object.entries(
        expectedAgentConfig?.runtime?.heartbeat ?? {},
      )) {
        assert.deepEqual(
          exportedExtension?.agents?.[agentSlug]?.runtime?.heartbeat?.[key] ?? null,
          value,
          `Runtime heartbeat ${key} was not preserved for ${agentSlug}`,
        );
      }
    }
    assertStringArrayEqual(
      Object.keys(exportedExtension?.routines ?? {}),
      Object.keys(expected.extension?.routines ?? {}),
      "Routine extension entries were not preserved in the exported Paperclip extension",
    );
    for (const [routineSlug, expectedRoutineConfig] of Object.entries(
      expected.extension?.routines ?? {},
    )) {
      assert.deepEqual(
        normalizeRoutineDefinitionForExport(exportedExtension?.routines?.[routineSlug]),
        normalizeRoutineDefinitionForExport(expectedRoutineConfig),
        `Routine extension config was not preserved for ${routineSlug}`,
      );
    }

    console.log("Paperclip import verification passed.");
  } finally {
    if (serverHandle) {
      await stopServer(serverHandle.child);
    }
    await rm(dataDir, { recursive: true, force: true });
    assert.equal(existsSync(dataDir), false, "Expected the temporary Paperclip data directory to be removed");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
