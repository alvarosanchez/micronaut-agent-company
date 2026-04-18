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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const paperclipCliPath = path.join(
  repoRoot,
  "node_modules",
  "paperclipai",
  "dist",
  "index.js",
);

const ROOT_PACKAGE_FILES = [".paperclip.yaml", "COMPANY.md", "README.md"];
const ROOT_PACKAGE_DIRS = ["agents", "projects", "tasks", "skills"];
const DISALLOWED_PACKAGE_DIRS = ["references"];
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
const FORBIDDEN_AGENT_HANDOFF_PATTERNS = [
  /\bassign the issue to\b/i,
  /\breassign the (?:issue|item)\b/i,
  /\bchange ownership\b/i,
  /\bassignee and status\b/i,
  /\bupdate the assignee\b/i,
  /\bupdate the status\b/i,
  /\bhand work off\b/i,
  /\bhand review feedback\b/i,
  /\bhand security-cleared work\b/i,
];
const REQUIRED_AGENT_EXECUTION_POLICY_PATTERNS = [
  /\bcurrent execution stage\b/i,
  /\bcurrent stage participant\b/i,
];
const FORBIDDEN_SHARED_WORKFLOW_PATTERNS = [
  /\bchange assignee and status together\b/i,
  /\bupdate the Paperclip issue to match the written handoff\b/i,
  /\bevery handoff must update the Paperclip item\b/i,
];
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
    relativePath: "agents/qa-engineer/AGENTS.md",
    pattern: /same synced repository/i,
    message: "QA instructions must say that deduplication happens against GitHub issues in the same synced repository.",
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

function assertImportedCodexAdapterConfig(actualAgent, expectedAdapter, agentSlug) {
  assert.equal(
    actualAgent?.adapterType ?? null,
    expectedAdapter?.type ?? null,
    `Adapter type mismatch for imported agent ${agentSlug}`,
  );

  if (expectedAdapter?.type !== "codex_local") {
    return;
  }

  const actualConfig = actualAgent?.adapterConfig ?? {};
  const expectedConfig = expectedAdapter?.config ?? {};

  assert.equal(
    actualConfig.model ?? null,
    expectedConfig.model ?? null,
    `Codex model mismatch for imported agent ${agentSlug}`,
  );
  assert.equal(
    actualConfig.modelReasoningEffort ?? null,
    expectedConfig.modelReasoningEffort ?? null,
    `Codex reasoning effort mismatch for imported agent ${agentSlug}`,
  );
  assert.equal(
    actualConfig.search ?? null,
    expectedConfig.search ?? null,
    `Codex search flag mismatch for imported agent ${agentSlug}`,
  );
  assert.equal(
    actualConfig.dangerouslyBypassApprovalsAndSandbox ?? null,
    expectedConfig.dangerouslyBypassApprovalsAndSandbox ?? null,
    `Codex bypass flag mismatch for imported agent ${agentSlug}`,
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

    for (const pattern of FORBIDDEN_AGENT_HANDOFF_PATTERNS) {
      assert.doesNotMatch(
        content,
        pattern,
        `${relativePath} still contains legacy assignee/comment handoff language: ${pattern}`,
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

    for (const pattern of FORBIDDEN_SHARED_WORKFLOW_PATTERNS) {
      assert.doesNotMatch(
        content,
        pattern,
        `${relativePath} still contains legacy assignee/status handoff language: ${pattern}`,
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
      agents.set(slug, {
        slug,
        name: frontmatter.name,
        title: frontmatter.title ?? null,
        reportsTo: frontmatter.reportsTo ?? null,
        skills: Array.isArray(frontmatter.skills) ? frontmatter.skills : [],
        adapter: extension?.agents?.[slug]?.adapter ?? null,
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

async function runCli(args, { env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [paperclipCliPath, ...args], {
      cwd: repoRoot,
      env: {
        ...process.env,
        CI: "true",
        PAPERCLIP_OPEN_ON_LISTEN: "false",
        ...env,
      },
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

function spawnServer(args, { env = {} } = {}) {
  const child = spawn(process.execPath, [paperclipCliPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      CI: "true",
      PAPERCLIP_OPEN_ON_LISTEN: "false",
      ...env,
    },
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
  const onboardingHandle = spawnServer(["onboard", "-y", "-d", dataDir]);
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

function assertExportedBody(exportFiles, relativePath, expectedBody) {
  const exportedMarkdown = getTextFile(exportFiles, relativePath);
  const actualBody = bodyOfMarkdown(exportedMarkdown);
  assert.equal(
    actualBody,
    expectedBody,
    `Expected exported body for ${relativePath} to match the source package`,
  );
}

async function main() {
  assert.ok(
    existsSync(paperclipCliPath),
    "paperclipai is not installed. Run `npm install` first.",
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
    serverHandle = spawnServer(["run", "-d", dataDir]);
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
        assertImportedCodexAdapterConfig(
          importedAgent,
          expectedAgent.adapter,
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
      assertExportedBody(exportResult.files, actualIssue.path, expectedIssue.body);
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
