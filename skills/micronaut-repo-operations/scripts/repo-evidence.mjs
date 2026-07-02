#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const options = { base: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base") {
      options.base = argv[index + 1] ?? null;
      index += 1;
    } else if (value === "--help" || value === "-h") {
      process.stdout.write("Usage: repo-evidence.mjs [--base <git-ref>]\n");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return options;
}

function git(args, cwd, { allowFailure = false, encoding = "utf8" } = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    if (allowFailure) return null;
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }
}

function parseStatus(buffer) {
  const fields = buffer.toString("utf8").split("\0");
  const changes = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field) continue;
    const indexStatus = field[0];
    const worktreeStatus = field[1];
    const entry = {
      path: field.slice(3),
      index: indexStatus,
      worktree: worktreeStatus,
      untracked: indexStatus === "?" && worktreeStatus === "?",
    };
    if (indexStatus === "R" || indexStatus === "C") {
      entry.originalPath = fields[index + 1] || null;
      index += 1;
    }
    changes.push(entry);
  }
  return changes;
}

function parseNameStatus(buffer) {
  const fields = buffer.toString("utf8").split("\0");
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const status = fields[index];
    if (!status) continue;
    const entry = { status, path: fields[index + 1] ?? null };
    index += 1;
    if (status.startsWith("R") || status.startsWith("C")) {
      entry.previousPath = entry.path;
      entry.path = fields[index + 1] ?? null;
      index += 1;
    }
    entries.push(entry);
  }
  return entries;
}

function currentBranch(root) {
  return git(["symbolic-ref", "--quiet", "--short", "HEAD"], root, { allowFailure: true })?.trim() || null;
}

function upstream(root) {
  return git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], root, { allowFailure: true })?.trim() || null;
}

function projectMarkers(root) {
  const candidates = [
    "build.gradle",
    "build.gradle.kts",
    "settings.gradle",
    "settings.gradle.kts",
    "gradlew",
    "pom.xml",
    "package.json",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
  ];
  return candidates.filter((candidate) => existsSync(path.join(root, candidate)));
}

function instructionFiles(root) {
  const candidates = ["AGENTS.md", "CLAUDE.md", ".cursorrules"];
  return candidates.filter((candidate) => existsSync(path.join(root, candidate)));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const errors = [];
  const root = git(["rev-parse", "--show-toplevel"], process.cwd()).trim();
  const head = git(["rev-parse", "HEAD"], root).trim();
  const status = git(["status", "--porcelain=v1", "-z", "--untracked-files=all"], root, { encoding: "buffer" });

  const report = {
    schemaVersion: 1,
    repository: {
      root,
      name: path.basename(root),
    },
    git: {
      branch: currentBranch(root),
      head,
      upstream: upstream(root),
      clean: status.length === 0,
    },
    base: null,
    changes: parseStatus(status),
    projectMarkers: projectMarkers(root),
    instructionFiles: instructionFiles(root),
    errors,
  };

  if (options.base) {
    const baseCommit = git(["rev-parse", "--verify", `${options.base}^{commit}`], root, { allowFailure: true })?.trim() || null;
    if (!baseCommit) {
      errors.push({ code: "invalid_base", message: `Cannot resolve base ref ${options.base}.` });
    } else {
      const mergeBase = git(["merge-base", options.base, "HEAD"], root, { allowFailure: true })?.trim() || null;
      const counts = git(["rev-list", "--left-right", "--count", `${options.base}...HEAD`], root, { allowFailure: true })?.trim().split(/\s+/).map(Number) ?? [];
      const diff = git(["diff", "--name-status", "-z", `${options.base}...HEAD`], root, { allowFailure: true, encoding: "buffer" });
      report.base = {
        ref: options.base,
        commit: baseCommit,
        mergeBase,
        behind: Number.isFinite(counts[0]) ? counts[0] : null,
        ahead: Number.isFinite(counts[1]) ? counts[1] : null,
        committedChanges: diff ? parseNameStatus(diff) : [],
      };
    }
  }

  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (errors.length > 0) process.exitCode = 2;
}

try {
  main();
} catch (error) {
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, errors: [{ code: "fatal", message: error.message }] })}\n`);
  process.exitCode = 1;
}
