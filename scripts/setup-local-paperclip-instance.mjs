#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_DATA_DIR = path.join(REPO_ROOT, ".paperclip-local");
const DEFAULT_PORT = 3100;
const DEFAULT_PAPERCLIP_PACKAGE = "paperclipai@latest";
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

Bootstraps an isolated local Paperclip instance, imports this company package,
installs the latest GitHub Sync and Micronaut plugins, and registers a GitHub
repository mapping in GitHub Sync.

Options:
  --data-dir <path>          Local Paperclip data dir (default: .paperclip-local)
  --port <number>            Paperclip port (default: 3100)
  --repo <owner/repo|url>    Repository to register (default: git origin)
  --project-name <name>      Paperclip project name for the registered repo
  --company-name <name>      Imported company name override
  --github-token <token>     Optional GitHub token for GitHub Sync fallback config
  --paperclip-package <pkg>  Paperclip CLI package (default: paperclipai@latest)
  --github-plugin <pkg>      GitHub plugin npm package (default: paperclip-github-plugin)
  --micronaut-plugin <pkg>   Micronaut plugin npm package (default: paperclip-micronaut-plugin)
  --reset                    Delete the data dir before setup
  --reuse                    Reuse an existing data dir instead of failing
  --stop-after-setup         Stop Paperclip after setup completes
  -h, --help                 Show this help

Environment:
  GITHUB_TOKEN or PAPERCLIP_GITHUB_TOKEN can provide the GitHub token.
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
    githubToken: process.env.PAPERCLIP_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    paperclipPackage: DEFAULT_PAPERCLIP_PACKAGE,
    githubPluginPackage: DEFAULT_GITHUB_PLUGIN_PACKAGE,
    micronautPluginPackage: DEFAULT_MICRONAUT_PLUGIN_PACKAGE,
    reset: false,
    reuse: false,
    stopAfterSetup: false,
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
      case "--github-token":
        opts.githubToken = readValue();
        break;
      case "--paperclip-package":
        opts.paperclipPackage = readValue();
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

function parseCliJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (lines[index].startsWith("{") || lines[index].startsWith("[")) {
        return JSON.parse(lines.slice(index).join("\n"));
      }
    }
    throw new Error(`Expected JSON output, received:\n${trimmed}`);
  }
}

function createRunner(opts) {
  return function runPaperclipCli(args) {
    const result = spawnSync("npx", ["--yes", opts.paperclipPackage, ...args], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PAPERCLIP_HOME: opts.dataDir,
        PAPERCLIP_OPEN_ON_LISTEN: "false",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0) {
      throw new Error(
        [
          `paperclipai ${args.join(" ")} failed with exit code ${result.status}`,
          result.stdout.trim(),
          result.stderr.trim(),
        ].filter(Boolean).join("\n"),
      );
    }
    return parseCliJson(result.stdout);
  };
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

async function startPaperclip(opts, configPath, logPath) {
  const logFd = fsSync.openSync(logPath, "a");
  const child = spawn(
    "npx",
    [
      "--yes",
      opts.paperclipPackage,
      "onboard",
      "--yes",
      "--data-dir",
      opts.dataDir,
      "--config",
      configPath,
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
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

async function importCompany(runPaperclipCli, opts, apiBase, configPath) {
  const result = runPaperclipCli([
    "company",
    "import",
    REPO_ROOT,
    "--target",
    "new",
    "--new-company-name",
    opts.companyName,
    "--yes",
    "--api-base",
    apiBase,
    "--data-dir",
    opts.dataDir,
    "--config",
    configPath,
    "--json",
  ]);
  const companyId = result?.company?.id;
  if (!companyId) {
    throw new Error(`Company import did not return company.id: ${JSON.stringify(result)}`);
  }
  return result.company;
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
  const tokenConfigPath = await writeGitHubTokenFallback(opts.dataDir, opts.githubToken);
  const runPaperclipCli = createRunner(opts);

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

    console.log(`Installing ${opts.githubPluginPackage} from npm`);
    await ensurePlugin(apiBase, opts.githubPluginPackage, DEFAULT_GITHUB_PLUGIN_KEY);

    console.log(`Installing ${opts.micronautPluginPackage} from npm`);
    await ensurePlugin(apiBase, opts.micronautPluginPackage, DEFAULT_MICRONAUT_PLUGIN_KEY);

    console.log("Importing this company package");
    const importedCompany = await importCompany(runPaperclipCli, opts, apiBase, configPath);
    const company = await apiRequest(apiBase, "GET", `/api/companies/${importedCompany.id}`);

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
      },
      plugins: {
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
