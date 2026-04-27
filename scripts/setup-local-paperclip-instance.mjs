#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_DATA_DIR = path.join(REPO_ROOT, ".paperclip-local");
const DEFAULT_PORT = 3100;
const DEFAULT_PAPERCLIP_PACKAGE = "paperclipai@latest";
const DEFAULT_AGENT_COMPANIES_PLUGIN_PACKAGE = "paperclip-agent-companies-plugin";
const DEFAULT_AGENT_COMPANIES_PLUGIN_KEY = "paperclip-agent-companies-plugin";
const DEFAULT_GITHUB_PLUGIN_PACKAGE = "paperclip-github-plugin";
const DEFAULT_GITHUB_PLUGIN_KEY = "paperclip-github-plugin";
const DEFAULT_MICRONAUT_PLUGIN_PACKAGE = "paperclip-micronaut-plugin";
const DEFAULT_MICRONAUT_PLUGIN_KEY = "paperclip-micronaut-plugin";
const DEFAULT_COMPANY_NAME = "Micronaut Agent Company (local)";

function usage() {
  return `
Usage:
  npm run setup:local-paperclip -- [options]
  node scripts/setup-local-paperclip-instance.mjs [options]

Bootstraps an isolated local Paperclip instance, imports this company package
through the Agent Companies plugin with headless Playwright, installs the latest
GitHub Sync and Micronaut plugins, and registers a GitHub repository mapping in
GitHub Sync.

Options:
  --data-dir <path>          Local Paperclip data dir (default: .paperclip-local)
  --port <number>            Paperclip port (default: 3100)
  --repo <owner/repo|url>    Repository to register (default: git origin)
  --project-name <name>      Paperclip project name for the registered repo
  --company-name <name>      Imported company name override
  --company-source <source>  Agent Companies source path/repo (default: current checkout)
  --github-token <token>     Optional GitHub token for GitHub Sync fallback config
  --paperclip-package <pkg>  Paperclip CLI package (default: paperclipai@latest)
  --agent-companies-plugin <pkg>
                             Agent Companies plugin npm package (default: paperclip-agent-companies-plugin)
  --github-plugin <pkg>      GitHub plugin npm package (default: paperclip-github-plugin)
  --micronaut-plugin <pkg>   Micronaut plugin npm package (default: paperclip-micronaut-plugin)
  --reset                    Delete the data dir before setup
  --reuse                    Reuse an existing data dir instead of failing
  --stop-after-setup         Stop Paperclip after setup completes
  --no-open                  Do not open the imported company dashboard
  -h, --help                 Show this help

Environment:
  GITHUB_TOKEN or PAPERCLIP_GITHUB_TOKEN can provide the GitHub token.
  PAPERCLIP_LOCAL_COMPANY_SOURCE can override --company-source.
  PAPERCLIP_LOCAL_REPO can override --repo.
  PAPERCLIP_LOCAL_PORT can override --port.
`.trim();
}

function parseArgs(argv) {
  const opts = {
    dataDir: DEFAULT_DATA_DIR,
    port: Number(process.env.PAPERCLIP_LOCAL_PORT || DEFAULT_PORT),
    repo: process.env.PAPERCLIP_LOCAL_REPO || "",
    projectName: "",
    companyName: DEFAULT_COMPANY_NAME,
    companySource: process.env.PAPERCLIP_LOCAL_COMPANY_SOURCE || REPO_ROOT,
    companySourceExplicit: Boolean(process.env.PAPERCLIP_LOCAL_COMPANY_SOURCE),
    githubToken: process.env.PAPERCLIP_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    paperclipPackage: DEFAULT_PAPERCLIP_PACKAGE,
    agentCompaniesPluginPackage: DEFAULT_AGENT_COMPANIES_PLUGIN_PACKAGE,
    githubPluginPackage: DEFAULT_GITHUB_PLUGIN_PACKAGE,
    micronautPluginPackage: DEFAULT_MICRONAUT_PLUGIN_PACKAGE,
    reset: false,
    reuse: false,
    stopAfterSetup: false,
    openDashboard: true,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "--data-dir":
        opts.dataDir = path.resolve(readValue());
        break;
      case "--port":
        opts.port = Number(readValue());
        break;
      case "--repo":
        opts.repo = readValue();
        break;
      case "--project-name":
        opts.projectName = readValue();
        break;
      case "--company-name":
        opts.companyName = readValue();
        break;
      case "--company-source":
        opts.companySource = readValue();
        opts.companySourceExplicit = true;
        break;
      case "--github-token":
        opts.githubToken = readValue();
        break;
      case "--paperclip-package":
        opts.paperclipPackage = readValue();
        break;
      case "--agent-companies-plugin":
        opts.agentCompaniesPluginPackage = readValue();
        break;
      case "--github-plugin":
        opts.githubPluginPackage = readValue();
        break;
      case "--micronaut-plugin":
        opts.micronautPluginPackage = readValue();
        break;
      case "--reset":
        opts.reset = true;
        break;
      case "--reuse":
        opts.reuse = true;
        break;
      case "--stop-after-setup":
        opts.stopAfterSetup = true;
        break;
      case "--no-open":
        opts.openDashboard = false;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isInteger(opts.port) || opts.port < 1 || opts.port > 65535) {
    throw new Error(`Invalid port: ${opts.port}`);
  }
  if (opts.reset && opts.reuse) {
    throw new Error("Use either --reset or --reuse, not both.");
  }
  opts.companySource = normalizeCompanySource(opts.companySource);

  return opts;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    return "";
  }
  return result.stdout.trim();
}

function normalizeGitHubRepositoryUrl(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  const sshMatch = input.match(/^git@github\.com:([^/\s]+)\/(.+?)(?:\.git)?$/i);
  if (sshMatch) {
    return `https://github.com/${sshMatch[1]}/${sshMatch[2].replace(/\.git$/i, "")}`;
  }

  const shorthandMatch = input.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthandMatch) {
    return `https://github.com/${shorthandMatch[1]}/${shorthandMatch[2].replace(/\.git$/i, "")}`;
  }

  try {
    const url = new URL(input);
    if (url.hostname.toLowerCase() === "github.com") {
      const parts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
      if (parts.length >= 2) {
        return `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
      }
    }
  } catch {
    return input;
  }

  return input.replace(/\.git$/i, "");
}

function looksLikeLocalPath(input) {
  return input.startsWith("/")
    || input.startsWith("./")
    || input.startsWith("../")
    || input.startsWith("~/")
    || /^[A-Za-z]:[\\/]/u.test(input);
}

function normalizeCompanySource(value) {
  const input = String(value || "").trim();
  if (!input) {
    return REPO_ROOT;
  }
  if (input.startsWith("~/")) {
    return path.resolve(os.homedir(), input.slice(2));
  }
  return looksLikeLocalPath(input) ? path.resolve(input) : input;
}

function deriveProjectName(repoUrl) {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    return parts[1]?.replace(/\.git$/i, "") || "Registered Repository";
  } catch {
    const tail = repoUrl.split("/").filter(Boolean).pop();
    return tail?.replace(/\.git$/i, "") || "Registered Repository";
  }
}

async function readLogTail(logPath) {
  try {
    const text = await fs.readFile(logPath, "utf8");
    return text.split(/\r?\n/).slice(-80).join("\n");
  } catch {
    return "";
  }
}

async function apiRequest(apiBase, method, apiPath, body) {
  const headers = {
    accept: "application/json",
  };
  const apiKey = process.env.PAPERCLIP_API_KEY?.trim();
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`${apiBase}${apiPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${apiPath} failed (${response.status}): ${text}`);
  }
  if (!text.trim()) {
    return null;
  }
  return JSON.parse(text);
}

async function waitForHealth(apiBase, child, logPath) {
  const startedAt = Date.now();
  const timeoutMs = 120_000;
  let lastError = "";

  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      const tail = await readLogTail(logPath);
      throw new Error(`Paperclip exited before becoming healthy.\n${tail}`);
    }
    try {
      const health = await apiRequest(apiBase, "GET", "/api/health");
      if (health?.status === "ok") {
        return health;
      }
      lastError = JSON.stringify(health);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const tail = await readLogTail(logPath);
  throw new Error(`Timed out waiting for Paperclip health. Last error: ${lastError}\n${tail}`);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find an available port near ${startPort}.`);
}

async function writeFileIfMissing(filePath, contents, options = {}) {
  if (await pathExists(filePath)) {
    return;
  }
  await fs.writeFile(filePath, contents, options);
}

async function ensureLocalPaperclipConfig(opts, configPath) {
  if (await pathExists(configPath)) {
    return;
  }

  const instanceDir = path.join(opts.dataDir, "instances", "default");
  const dbDir = path.join(instanceDir, "db");
  const dataDir = path.join(instanceDir, "data");
  const backupDir = path.join(dataDir, "backups");
  const storageDir = path.join(dataDir, "storage");
  const logDir = path.join(instanceDir, "logs");
  const secretsDir = path.join(instanceDir, "secrets");
  const masterKeyPath = path.join(secretsDir, "master.key");
  const envPath = path.join(opts.dataDir, ".env");

  await fs.mkdir(dbDir, { recursive: true });
  await fs.mkdir(backupDir, { recursive: true });
  await fs.mkdir(storageDir, { recursive: true });
  await fs.mkdir(logDir, { recursive: true });
  await fs.mkdir(secretsDir, { recursive: true });

  await writeFileIfMissing(
    envPath,
    `PAPERCLIP_AGENT_JWT_SECRET=${randomBytes(32).toString("hex")}\n`,
    { mode: 0o600 },
  );
  await writeFileIfMissing(masterKeyPath, `${randomBytes(32).toString("base64")}\n`, {
    mode: 0o600,
  });

  const embeddedPostgresPort = await findAvailablePort(54329);
  const config = {
    $meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      source: "configure",
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: dbDir,
      embeddedPostgresPort,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: backupDir,
      },
    },
    logging: {
      mode: "file",
      logDir,
    },
    server: {
      deploymentMode: "local_trusted",
      exposure: "private",
      bind: "loopback",
      host: "127.0.0.1",
      port: opts.port,
      allowedHostnames: [],
      serveUi: true,
    },
    auth: {
      baseUrlMode: "auto",
      disableSignUp: false,
    },
    telemetry: {
      enabled: true,
    },
    storage: {
      provider: "local_disk",
      localDisk: {
        baseDir: storageDir,
      },
      s3: {
        bucket: "paperclip",
        region: "us-east-1",
        prefix: "",
        forcePathStyle: false,
      },
    },
    secrets: {
      provider: "local_encrypted",
      strictMode: false,
      localEncrypted: {
        keyFilePath: masterKeyPath,
      },
    },
  };

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

async function startPaperclip(opts, configPath, logPath) {
  const logFd = fsSync.openSync(logPath, "a");
  const child = spawn(
    "npx",
    [
      "--yes",
      opts.paperclipPackage,
      "run",
      "--data-dir",
      opts.dataDir,
      "--config",
      configPath,
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        BROWSER: "none",
        PORT: String(opts.port),
        PAPERCLIP_HOME: opts.dataDir,
        PAPERCLIP_OPEN_ON_LISTEN: "false",
      },
      stdio: ["ignore", logFd, logFd],
    },
  );

  await fs.writeFile(path.join(opts.dataDir, "paperclip.pid"), `${child.pid}\n`);
  return child;
}

async function stopPaperclip(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function ensurePlugin(apiBase, packageName, pluginKey) {
  const installed = await apiRequest(apiBase, "GET", "/api/plugins");
  const existing = installed.find((plugin) => plugin.pluginKey === pluginKey);
  if (!existing) {
    await apiRequest(apiBase, "POST", "/api/plugins/install", { packageName });
  } else if (existing.status !== "ready") {
    await apiRequest(apiBase, "POST", `/api/plugins/${pluginKey}/enable`, {});
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const health = await apiRequest(apiBase, "GET", `/api/plugins/${pluginKey}/health`);
    if (health?.healthy) {
      return health;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Plugin ${pluginKey} did not become ready.`);
}

function createDefaultCompanyImportSelection() {
  return {
    agents: { mode: "all" },
    projects: { mode: "all" },
    tasks: { mode: "all" },
    issues: { mode: "all" },
    skills: { mode: "all" },
  };
}

function hasSelectedImportItems(selection) {
  if (selection?.mode === "all") {
    return true;
  }
  if (selection?.mode === "selected") {
    return (selection.itemPaths?.length ?? 0) > 0;
  }
  return false;
}

function buildPaperclipImportInclude(selection, targetMode, includeIssues) {
  return {
    company: targetMode === "new_company" && !includeIssues,
    agents: !includeIssues && hasSelectedImportItems(selection.agents),
    projects: !includeIssues && hasSelectedImportItems(selection.projects),
    issues: includeIssues
      && (hasSelectedImportItems(selection.tasks) || hasSelectedImportItems(selection.issues)),
    skills: !includeIssues && hasSelectedImportItems(selection.skills),
  };
}

function hasEnabledPaperclipImportStage(include) {
  return include.company || include.agents || include.projects || include.issues || include.skills;
}

function findPortablePaperclipExtensionPath(files) {
  for (const filePath of [".paperclip.yaml", ".paperclip.yml"]) {
    if (Object.prototype.hasOwnProperty.call(files, filePath)) {
      return filePath;
    }
  }
  return null;
}

function buildStagedPaperclipImportSource(source, stage) {
  const extensionPath = findPortablePaperclipExtensionPath(source.files);
  if (!extensionPath) {
    return source;
  }
  const extension = source.files[extensionPath];
  if (typeof extension !== "string") {
    return source;
  }

  let parsedExtension;
  try {
    parsedExtension = parseYaml(extension);
  } catch {
    return source;
  }
  if (!parsedExtension || typeof parsedExtension !== "object" || Array.isArray(parsedExtension)) {
    return source;
  }

  const nextExtension = { ...parsedExtension };
  let didChange = false;
  if (stage === "pre_issues" && Object.prototype.hasOwnProperty.call(nextExtension, "routines")) {
    delete nextExtension.routines;
    didChange = true;
  }
  if (stage === "issues" && Object.prototype.hasOwnProperty.call(nextExtension, "agents")) {
    delete nextExtension.agents;
    didChange = true;
  }
  if (!didChange) {
    return source;
  }

  const nextFiles = { ...source.files };
  if (Object.keys(nextExtension).length === 0) {
    delete nextFiles[extensionPath];
  } else {
    nextFiles[extensionPath] = `${stringifyYaml(nextExtension).trimEnd()}\n`;
  }
  return {
    ...source,
    files: nextFiles,
  };
}

function normalizePaperclipSlug(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || null;
}

function getSelectedCompanyContentSlugs(items, selection) {
  const selectedSlugs = new Set();
  const addSlug = (itemPath) => {
    const slug = normalizePaperclipSlug(itemPath.split("/").filter(Boolean).at(-2));
    if (slug) {
      selectedSlugs.add(slug);
    }
  };

  if (selection.mode === "all") {
    for (const item of items) {
      addSlug(item.path);
    }
  } else if (selection.mode === "selected") {
    for (const itemPath of selection.itemPaths ?? []) {
      addSlug(itemPath);
    }
  }
  return [...selectedSlugs];
}

function runRequiredCommand(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function loadPlaywrightChromium() {
  try {
    const playwright = await import("playwright");
    return playwright.chromium;
  } catch (error) {
    throw new Error(
      [
        "Playwright is required for the Agent Companies plugin import flow.",
        "Run npm install, then rerun setup:local-paperclip.",
        error instanceof Error ? error.message : String(error),
      ].join("\n"),
    );
  }
}

async function launchChromiumHeadless() {
  const chromium = await loadPlaywrightChromium();
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|playwright install/i.test(message)) {
      throw error;
    }
    console.log("Installing Playwright Chromium browser");
    runRequiredCommand("npx", ["playwright", "install", "chromium"], "playwright install chromium");
    return chromium.launch({ headless: true });
  }
}

async function importCompanyWithAgentCompaniesPlugin(apiBase, opts) {
  const browser = await launchChromiumHeadless();
  try {
    const page = await browser.newPage();
    await page.goto(`${apiBase}/api/health`, { waitUntil: "domcontentloaded" });

    const prepared = await page.evaluate(
      async ({ apiBase: pageApiBase, companySource, pluginKey }) => {
        function apiErrorMessage(payload) {
          if (!payload || typeof payload !== "object") {
            return null;
          }
          for (const key of ["message", "error", "details"]) {
            const value = payload[key];
            if (typeof value === "string" && value.trim()) {
              return value.trim();
            }
          }
          return null;
        }

        async function fetchJson(input, init = {}) {
          const headers = {
            accept: "application/json",
            ...(init.headers ?? {}),
          };
          if (typeof init.body === "string" && !headers["content-type"]) {
            headers["content-type"] = "application/json";
          }
          const response = await fetch(input, {
            ...init,
            headers,
            credentials: init.credentials ?? "same-origin",
          });
          const rawBody = await response.text();
          const body = rawBody.trim() ? JSON.parse(rawBody) : null;
          if (!response.ok) {
            throw new Error(apiErrorMessage(body) ?? `Request failed with status ${response.status}.`);
          }
          return body;
        }

        async function pluginAction(action, params) {
          const payload = await fetchJson(`/api/plugins/${pluginKey}/actions/${encodeURIComponent(action)}`, {
            method: "POST",
            body: JSON.stringify({ params }),
          });
          if (payload && typeof payload === "object") {
            if (Object.prototype.hasOwnProperty.call(payload, "result")) {
              return payload.result;
            }
            if (Object.prototype.hasOwnProperty.call(payload, "data")) {
              return payload.data;
            }
          }
          return payload;
        }

        await pluginAction("paperclip-runtime.set-api-base", { apiBase: pageApiBase });

        let catalog;
        try {
          catalog = await pluginAction("catalog.add-repository", { url: companySource });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!/already been added/i.test(message)) {
            throw error;
          }
          catalog = await pluginAction("catalog.scan-all-repositories", {});
        }

        const normalizeSource = (value) => String(value ?? "").trim().replace(/\/+$/u, "");
        const normalizedCompanySource = normalizeSource(companySource);
        const sourceRepository = catalog.repositories.find(
          (repository) => normalizeSource(repository.url) === normalizedCompanySource
            || normalizeSource(repository.normalizedUrl) === normalizedCompanySource,
        ) ?? null;
        if (sourceRepository?.lastScanError) {
          throw new Error(`Agent Companies source scan failed: ${sourceRepository.lastScanError}`);
        }

        const candidateCompanies = sourceRepository
          ? catalog.companies.filter((company) => company.repositoryId === sourceRepository.id)
          : catalog.companies;
        const sourceCompany = candidateCompanies.find((company) => company.manifestPath === "COMPANY.md")
          ?? candidateCompanies.find((company) => company.relativePath === "")
          ?? candidateCompanies[0]
          ?? null;
        if (!sourceCompany) {
          throw new Error(`No Agent Companies package was discovered in ${companySource}.`);
        }

        const preparedImport = await pluginAction("catalog.prepare-company-import", {
          companyId: sourceCompany.id,
        });
        return { sourceCompany, preparedImport };
      },
      {
        apiBase,
        companySource: opts.companySource,
        pluginKey: DEFAULT_AGENT_COMPANIES_PLUGIN_KEY,
      },
    );

    const selection = prepared.preparedImport.selection ?? createDefaultCompanyImportSelection();
    const selectedAgentSlugs = getSelectedCompanyContentSlugs(
      prepared.sourceCompany.contents?.agents ?? [],
      selection.agents,
    );
    const preIssueInclude = buildPaperclipImportInclude(selection, "new_company", false);
    const issueOnlyInclude = buildPaperclipImportInclude(selection, "new_company", true);
    const preIssueSource = buildStagedPaperclipImportSource(prepared.preparedImport.source, "pre_issues");
    const issueOnlySource = buildStagedPaperclipImportSource(prepared.preparedImport.source, "issues");

    const imported = await page.evaluate(
      async ({
        companyName,
        issueOnlyInclude: pageIssueOnlyInclude,
        issueOnlySource: pageIssueOnlySource,
        pluginKey,
        preIssueInclude: pagePreIssueInclude,
        preIssueSource: pagePreIssueSource,
        selectedAgentSlugs: pageSelectedAgentSlugs,
        selection: pageSelection,
        sourceCompanyId,
      }) => {
        function apiErrorMessage(payload) {
          if (!payload || typeof payload !== "object") {
            return null;
          }
          for (const key of ["message", "error", "details"]) {
            const value = payload[key];
            if (typeof value === "string" && value.trim()) {
              return value.trim();
            }
          }
          return null;
        }

        async function fetchJson(input, init = {}) {
          const headers = {
            accept: "application/json",
            ...(init.headers ?? {}),
          };
          if (typeof init.body === "string" && !headers["content-type"]) {
            headers["content-type"] = "application/json";
          }
          const response = await fetch(input, {
            ...init,
            headers,
            credentials: init.credentials ?? "same-origin",
          });
          const rawBody = await response.text();
          const body = rawBody.trim() ? JSON.parse(rawBody) : null;
          if (!response.ok) {
            throw new Error(apiErrorMessage(body) ?? `Request failed with status ${response.status}.`);
          }
          return body;
        }

        async function pluginAction(action, params) {
          const payload = await fetchJson(`/api/plugins/${pluginKey}/actions/${encodeURIComponent(action)}`, {
            method: "POST",
            body: JSON.stringify({ params }),
          });
          if (payload && typeof payload === "object") {
            if (Object.prototype.hasOwnProperty.call(payload, "result")) {
              return payload.result;
            }
            if (Object.prototype.hasOwnProperty.call(payload, "data")) {
              return payload.data;
            }
          }
          return payload;
        }

        function hasEnabledStage(include) {
          return include.company || include.agents || include.projects || include.issues || include.skills;
        }

        function normalizeSlug(value) {
          if (typeof value !== "string") {
            return null;
          }
          const normalized = value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          return normalized || null;
        }

        const target = {
          mode: "new_company",
          newCompanyName: companyName,
        };
        let importedPhaseOneResult = null;
        if (hasEnabledStage(pagePreIssueInclude)) {
          importedPhaseOneResult = await fetchJson("/api/companies/import", {
            method: "POST",
            body: JSON.stringify({
              source: pagePreIssueSource,
              include: pagePreIssueInclude,
              target,
              collisionStrategy: "replace",
            }),
          });
        }

        const importedCompanyId = importedPhaseOneResult?.company?.id?.trim();
        if (!importedCompanyId) {
          throw new Error("Paperclip did not return a company id after importing the selected company.");
        }

        if (pageSelectedAgentSlugs.length > 0) {
          const selectedSlugSet = new Set(pageSelectedAgentSlugs);
          const agents = await fetchJson(`/api/companies/${encodeURIComponent(importedCompanyId)}/agents`);
          for (const agent of Array.isArray(agents) ? agents : []) {
            const agentSlug = normalizeSlug(agent.urlKey ?? agent.name);
            if (agent.status !== "pending_approval" || !agentSlug || !selectedSlugSet.has(agentSlug)) {
              continue;
            }
            const approval = await fetchJson(`/api/companies/${encodeURIComponent(importedCompanyId)}/approvals`, {
              method: "POST",
              body: JSON.stringify({
                type: "hire_agent",
                payload: {
                  agentId: agent.id,
                  name: agent.name,
                  role: agent.role,
                  title: agent.title,
                },
              }),
            });
            if (!approval?.id) {
              throw new Error(`Paperclip did not return an approval id for ${agent.name}.`);
            }
            await fetchJson(`/api/approvals/${encodeURIComponent(approval.id)}/approve`, {
              method: "POST",
              body: JSON.stringify({
                decisionNote: `Approved automatically after importing "${agent.name}" so assigned tasks can wake the agent immediately.`,
              }),
            });
          }
        }

        let importedPhaseTwoResult = null;
        if (hasEnabledStage(pageIssueOnlyInclude)) {
          importedPhaseTwoResult = await fetchJson("/api/companies/import", {
            method: "POST",
            body: JSON.stringify({
              source: pageIssueOnlySource,
              include: pageIssueOnlyInclude,
              target: {
                mode: "existing_company",
                companyId: importedCompanyId,
              },
              collisionStrategy: "replace",
            }),
          });
        }

        const company = await fetchJson(`/api/companies/${encodeURIComponent(importedCompanyId)}`);
        await pluginAction("catalog.record-company-import", {
          sourceCompanyId,
          importedCompanyId,
          importedCompanyName: company.name?.trim() || companyName,
          importedCompanyIssuePrefix: company.issuePrefix?.trim() || null,
          selection: pageSelection,
          syncCollisionStrategy: "replace",
          issuesBeforeImport: [],
        });

        return {
          company,
          importedPhaseOneResult,
          importedPhaseTwoResult,
        };
      },
      {
        companyName: opts.companyName,
        issueOnlyInclude,
        issueOnlySource,
        pluginKey: DEFAULT_AGENT_COMPANIES_PLUGIN_KEY,
        preIssueInclude,
        preIssueSource,
        selectedAgentSlugs,
        selection,
        sourceCompanyId: prepared.sourceCompany.id,
      },
    );

    return imported.company;
  } finally {
    await browser.close();
  }
}

async function ensureRepositoryProject(apiBase, companyId, repoUrl, projectName, cwd) {
  const projects = await apiRequest(apiBase, "GET", `/api/companies/${companyId}/projects`);
  const existing = projects.find((project) => {
    const primaryRepo = project.primaryWorkspace?.repoUrl;
    return primaryRepo && normalizeGitHubRepositoryUrl(primaryRepo) === repoUrl;
  });
  if (existing) {
    return existing;
  }

  return apiRequest(apiBase, "POST", `/api/companies/${companyId}/projects`, {
    name: projectName,
    description: `GitHub Sync mapping for ${repoUrl}.`,
    status: "backlog",
    workspace: {
      name: projectName,
      ...(cwd ? { cwd } : {}),
      repoUrl,
      repoRef: "main",
      isPrimary: true,
    },
  });
}

async function saveGitHubMapping(apiBase, companyId, project, repoUrl) {
  const currentConfig = await apiRequest(
    apiBase,
    "GET",
    `/api/plugins/${DEFAULT_GITHUB_PLUGIN_KEY}/config`,
  );
  await apiRequest(apiBase, "POST", `/api/plugins/${DEFAULT_GITHUB_PLUGIN_KEY}/config`, {
    configJson: {
      ...(currentConfig?.configJson ?? {}),
      paperclipApiBaseUrl: apiBase,
    },
  });

  const mapping = {
    id: `mapping-${project.id}`,
    repositoryUrl: repoUrl,
    paperclipProjectName: project.name,
    paperclipProjectId: project.id,
    companyId,
  };
  return apiRequest(
    apiBase,
    "POST",
    `/api/plugins/${DEFAULT_GITHUB_PLUGIN_KEY}/actions/settings.saveRegistration`,
    {
      companyId,
      params: {
        companyId,
        mappings: [mapping],
        paperclipApiBaseUrl: apiBase,
      },
    },
  );
}

async function writeGitHubTokenFallback(dataDir, githubToken) {
  const token = githubToken.trim();
  if (!token) {
    return null;
  }
  const configDir = path.join(dataDir, "plugins", "github-sync");
  const configPath = path.join(configDir, "config.json");
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify({ githubToken: token }, null, 2)}\n`, {
    mode: 0o600,
  });
  return configPath;
}

function listPortableCompanySourceFiles() {
  const result = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      cwd: REPO_ROOT,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr.toString("utf8").trim()}`);
  }
  return result.stdout
    .toString("utf8")
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => !entry.startsWith(".git/"));
}

async function prepareDefaultCompanySource(opts) {
  if (opts.companySourceExplicit || opts.companySource !== REPO_ROOT) {
    return opts.companySource;
  }

  const sourceDir = path.join(opts.dataDir, "company-source");
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.mkdir(sourceDir, { recursive: true });

  for (const relativePath of listPortableCompanySourceFiles()) {
    const sourcePath = path.join(REPO_ROOT, relativePath);
    const targetPath = path.join(sourceDir, relativePath);
    const sourceStat = await fs.lstat(sourcePath);
    if (!sourceStat.isFile() && !sourceStat.isSymbolicLink()) {
      continue;
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
  }

  return sourceDir;
}

async function prepareDataDir(opts) {
  const exists = await pathExists(opts.dataDir);
  if (exists && opts.reset) {
    await fs.rm(opts.dataDir, { recursive: true, force: true });
  } else if (exists && !opts.reuse) {
    throw new Error(
      [
        `Data dir already exists: ${opts.dataDir}`,
        "Pass --reset to recreate it from scratch, or --reuse to add to the existing instance.",
      ].join("\n"),
    );
  }
  await fs.mkdir(opts.dataDir, { recursive: true });
}

async function writeSummary(opts, summary) {
  const summaryPath = path.join(opts.dataDir, "setup-summary.json");
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summaryPath;
}

function buildCompanyDashboardUrl(apiBase, company) {
  const prefix = company.issuePrefix?.trim();
  if (!prefix) {
    return apiBase;
  }
  return `${apiBase}/${encodeURIComponent(prefix)}/dashboard`;
}

function openUrl(url) {
  const candidates = process.platform === "darwin"
    ? [["open", [url]]]
    : process.platform === "win32"
      ? [["cmd", ["/c", "start", "", url]]]
      : [["xdg-open", [url]]];

  for (const [command, args] of candidates) {
    const result = spawnSync(command, args, {
      stdio: "ignore",
      detached: true,
    });
    if (result.status === 0) {
      return true;
    }
  }
  return false;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(usage());
    return;
  }

  const originRepo = normalizeGitHubRepositoryUrl(runGit(["remote", "get-url", "origin"]));
  const repoUrl = normalizeGitHubRepositoryUrl(opts.repo || originRepo);
  if (!repoUrl || !repoUrl.startsWith("https://github.com/")) {
    throw new Error(
      "Could not determine a GitHub repository to register. Pass --repo owner/repo or --repo https://github.com/owner/repo.",
    );
  }

  const projectName = opts.projectName || deriveProjectName(repoUrl);
  const configPath = path.join(opts.dataDir, "paperclip.config.json");
  const logPath = path.join(opts.dataDir, "paperclip.log");
  const apiBase = `http://127.0.0.1:${opts.port}`;
  const currentRepoMatches = originRepo && normalizeGitHubRepositoryUrl(originRepo) === repoUrl;

  await prepareDataDir(opts);
  opts.companySource = await prepareDefaultCompanySource(opts);
  await ensureLocalPaperclipConfig(opts, configPath);
  const tokenConfigPath = await writeGitHubTokenFallback(opts.dataDir, opts.githubToken);

  console.log(`Starting Paperclip ${opts.paperclipPackage} at ${apiBase}`);
  const child = await startPaperclip(opts, configPath, logPath);
  let shouldStop = opts.stopAfterSetup;

  const shutdown = async () => {
    shouldStop = true;
    await stopPaperclip(child);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  try {
    await waitForHealth(apiBase, child, logPath);

    console.log(`Installing ${opts.agentCompaniesPluginPackage} from npm`);
    await ensurePlugin(
      apiBase,
      opts.agentCompaniesPluginPackage,
      DEFAULT_AGENT_COMPANIES_PLUGIN_KEY,
    );

    console.log(`Installing ${opts.githubPluginPackage} from npm`);
    await ensurePlugin(apiBase, opts.githubPluginPackage, DEFAULT_GITHUB_PLUGIN_KEY);

    console.log(`Installing ${opts.micronautPluginPackage} from npm`);
    await ensurePlugin(apiBase, opts.micronautPluginPackage, DEFAULT_MICRONAUT_PLUGIN_KEY);

    console.log(`Importing this company package from ${opts.companySource} with headless Playwright`);
    const importedCompany = await importCompanyWithAgentCompaniesPlugin(apiBase, opts);
    const company = await apiRequest(apiBase, "GET", `/api/companies/${importedCompany.id}`);
    const dashboardUrl = buildCompanyDashboardUrl(apiBase, company);

    console.log(`Creating or reusing project for ${repoUrl}`);
    const project = await ensureRepositoryProject(
      apiBase,
      company.id,
      repoUrl,
      projectName,
      currentRepoMatches ? REPO_ROOT : "",
    );

    console.log("Saving GitHub Sync repository mapping");
    await saveGitHubMapping(apiBase, company.id, project, repoUrl);

    const summaryPath = await writeSummary(opts, {
      apiBase,
      dataDir: opts.dataDir,
      configPath,
      logPath,
      company: {
        id: company.id,
        name: company.name,
        issuePrefix: company.issuePrefix,
        dashboardUrl,
        source: opts.companySource,
      },
      plugins: {
        agentCompanies: DEFAULT_AGENT_COMPANIES_PLUGIN_KEY,
        github: DEFAULT_GITHUB_PLUGIN_KEY,
        micronaut: DEFAULT_MICRONAUT_PLUGIN_KEY,
      },
      registeredRepository: {
        repoUrl,
        projectId: project.id,
        projectName: project.name,
      },
      githubTokenFallbackConfigPath: tokenConfigPath,
    });

    console.log("");
    console.log("Local Paperclip setup complete.");
    console.log(`Paperclip: ${apiBase}`);
    console.log(`Company: ${company.name}${company.issuePrefix ? ` (${company.issuePrefix})` : ""}`);
    console.log(`Dashboard: ${dashboardUrl}`);
    console.log(`Registered repository: ${repoUrl}`);
    console.log(`Summary: ${summaryPath}`);
    if (!tokenConfigPath) {
      console.log("GitHub token: not configured. Set GITHUB_TOKEN or pass --github-token, then rerun with --reset or configure the plugin UI.");
    }
    console.log(`Logs: ${logPath}`);

    if (opts.stopAfterSetup) {
      await stopPaperclip(child);
      return;
    }

    if (opts.openDashboard) {
      if (openUrl(dashboardUrl)) {
        console.log("Opened imported company dashboard.");
      } else {
        console.log("Could not open the dashboard automatically.");
      }
    }

    console.log("");
    console.log("Paperclip is still running. Press Ctrl+C to stop it.");
    await new Promise((resolve) => child.once("exit", resolve));
  } catch (error) {
    shouldStop = true;
    await stopPaperclip(child);
    throw error;
  } finally {
    if (shouldStop) {
      await stopPaperclip(child);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
