import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const AGENT_DISPLAY_NAMES = {
  ceo: "CEO",
  "product-manager": "Product Manager",
  architect: "Architect",
  "qa-engineer": "QA Engineer",
  "security-engineer": "Security Engineer",
  "micronaut-engineer": "Micronaut Engineer",
  "code-reviewer": "Code Reviewer",
  "technical-writer": "Technical Writer",
};

const CLAUDE_ADAPTER = "claude_local";
const CODEX_ADAPTER = "codex_local";
const CLAUDE_CHEAP_PROFILE = {
  enabled: true,
  label: "Claude Haiku 4.5",
  adapterConfig: { model: "claude-haiku-4-5", effort: "" },
};
const CODEX_CHEAP_PROFILE = {
  enabled: true,
  label: "GPT-5.6 Luna",
  adapterConfig: { model: "gpt-5.6-luna", modelReasoningEffort: "low" },
};

const PRIMARY_MODEL_CONFIG = {
  ceo: { adapter: CLAUDE_ADAPTER, model: "claude-opus-5", effort: "medium" },
  "product-manager": { adapter: CLAUDE_ADAPTER, model: "claude-opus-5", effort: "medium" },
  architect: { adapter: CLAUDE_ADAPTER, model: "claude-fable-5-1", effort: "high" },
  "qa-engineer": { adapter: CLAUDE_ADAPTER, model: "claude-opus-5", effort: "high" },
  "security-engineer": { adapter: CLAUDE_ADAPTER, model: "claude-opus-5", effort: "high" },
  "micronaut-engineer": { adapter: CLAUDE_ADAPTER, model: "claude-opus-5", effort: "high" },
  "code-reviewer": { adapter: CODEX_ADAPTER, model: "gpt-6-astra", effort: "high" },
  "technical-writer": { adapter: CLAUDE_ADAPTER, model: "claude-sonnet-5", effort: "medium" },
};

const CLAUDE_CONFIG_KEYS = ["engine", "model", "effort", "dangerouslySkipPermissions", "timeoutSec", "graceSec"];
const CODEX_CONFIG_KEYS = [
  "engine",
  "model",
  "modelReasoningEffort",
  "dangerouslyBypassApprovalsAndSandbox",
  "timeoutSec",
  "graceSec",
];

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

function rosterFromReadme(readme) {
  const marker = "<!-- operating-role-roster -->";
  const index = readme.indexOf(marker);
  assert.notEqual(index, -1, "README must keep the operating-role-roster marker.");
  const fence = readme.slice(index + marker.length).trimStart().match(/^```yaml\n([\s\S]*?)\n```/);
  assert.ok(fence, "README roster marker must be followed by a YAML fence.");
  return YAML.parse(fence[1]);
}

test("package adapter matrix pins the exact adapter, model, and effort per role", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const agents = Object.entries(extension.agents ?? {});
  assert.deepEqual(agents.map(([slug]) => slug).sort(), Object.keys(PRIMARY_MODEL_CONFIG).sort());

  for (const [agentSlug, agent] of agents) {
    const expected = PRIMARY_MODEL_CONFIG[agentSlug];
    const config = agent?.adapter?.config ?? {};
    assert.equal(agent?.adapter?.type, expected.adapter, `${agentSlug} must use ${expected.adapter}.`);
    assert.equal(config.engine, "auto", `${agentSlug} must leave engine selection to Paperclip (auto).`);
    assert.equal(config.model, expected.model, `${agentSlug} must use its approved primary model.`);
    assert.equal(config.timeoutSec, 7200, `${agentSlug} must set an explicit long run timeout.`);
    assert.equal(config.graceSec, 20, `${agentSlug} must set the termination grace period.`);

    if (expected.adapter === CODEX_ADAPTER) {
      assert.equal(config.modelReasoningEffort, expected.effort, `${agentSlug} must pin Codex reasoning effort.`);
      assert.equal(config.dangerouslyBypassApprovalsAndSandbox, true, `${agentSlug} must run Codex non-interactively.`);
      assert.deepEqual(Object.keys(config).sort(), [...CODEX_CONFIG_KEYS].sort(), `${agentSlug} must carry only the approved codex_local keys.`);
    } else {
      assert.equal(config.effort, expected.effort, `${agentSlug} must pin Claude effort.`);
      assert.equal(config.dangerouslySkipPermissions, true, `${agentSlug} must run Claude Code without permission prompts.`);
      assert.deepEqual(Object.keys(config).sort(), [...CLAUDE_CONFIG_KEYS].sort(), `${agentSlug} must carry only the approved claude_local keys.`);
    }
    for (const forbidden of ["cwd", "command", "env", "extraArgs", "toolsets", "hermesCommand", "provider"]) {
      assert.equal(config[forbidden], undefined, `${agentSlug} must not set ${forbidden}; Paperclip workspaces and deployment credentials own it.`);
    }
  }
});

test("only the Code Reviewer runs on the metered Codex adapter", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const codexAgents = Object.entries(extension.agents ?? {})
    .filter(([, agent]) => agent?.adapter?.type === CODEX_ADAPTER)
    .map(([slug]) => slug);
  assert.deepEqual(codexAgents, ["code-reviewer"]);
});

test("README roster and model matrix match the package adapter matrix", async () => {
  const readme = await read("../README.md");
  const roster = rosterFromReadme(readme);
  const rosterBySlug = new Map(roster.map((row) => [row.slug, row]));

  for (const [agentSlug, expected] of Object.entries(PRIMARY_MODEL_CONFIG)) {
    const displayName = AGENT_DISPLAY_NAMES[agentSlug];
    const row = rosterBySlug.get(agentSlug);
    assert.ok(row, `README roster must include ${agentSlug}.`);
    assert.deepEqual(
      row,
      { slug: agentSlug, name: displayName, source: "package", adapter: expected.adapter, model: expected.model, effort: expected.effort },
      `README roster row for ${agentSlug} must match .paperclip.yaml.`,
    );
    const effortKey = expected.adapter === CODEX_ADAPTER ? "modelReasoningEffort" : "effort";
    assert.ok(
      readme.includes(`- ${displayName}: \`${expected.adapter}\`, \`${expected.model}\`, \`${effortKey}: ${expected.effort}\``),
      `README model matrix must document ${displayName} adapter/model/effort.`,
    );
  }

  assert.deepEqual(rosterBySlug.get("ui-ux-designer"), {
    slug: "ui-ux-designer",
    name: "UI/UX Designer",
    source: "live-only",
    adapter: CLAUDE_ADAPTER,
    model: "claude-opus-5",
    effort: "medium",
  });
  assert.match(readme, /timeoutSec: 7200/);
  assert.match(readme, /graceSec: 20/);
  assert.match(readme, /engine: auto/);
  assert.match(readme, /dangerouslySkipPermissions: true/);
  assert.match(readme, /dangerouslyBypassApprovalsAndSandbox: true/);
  assert.match(readme, /Code Reviewer keeps `dangerouslyBypassApprovalsAndSandbox: true`[^\n]+read-only execution environment is the preferred future hardening/);
  assert.match(
    readme,
    /Paperclip project workspaces[\s\S]{0,260}do not set `cwd`/i,
    "README must document that package agents rely on Paperclip workspaces instead of adapter cwd.",
  );
  assert.match(
    readme,
    /claude-fable-5-1[\s\S]{0,120}gpt-6-astra[\s\S]{0,260}manual model ids/i,
    "README must note that the newer model ids pass through as manual ids.",
  );
  assert.match(
    readme,
    /CodeGraph is optional[\s\S]{0,200}exposes a CodeGraph MCP server[\s\S]{0,220}does not require agents to use it for every coding task/i,
    "README must keep CodeGraph optional and deployment-provided without a fixed path.",
  );
  assert.doesNotMatch(readme, /paperclip-codegraph-mcp|hermes/i);
});

test("repo operations guidance makes CodeGraph optional and gives use and skip criteria", async () => {
  const skill = await read("../skills/micronaut-repo-operations/SKILL.md");

  assert.match(skill, /CodeGraph is optional/i);
  assert.match(skill, /exposes a CodeGraph MCP server/i);
  assert.match(skill, /unfamiliar or large repositories/i);
  assert.match(skill, /cross-module dependency or call-chain analysis/i);
  assert.match(skill, /symbol exploration/i);
  assert.match(skill, /ordinary search\/read becomes repetitive or insufficient/i);
  assert.match(skill, /small localized fixes/i);
  assert.match(skill, /known files/i);
  assert.match(skill, /documentation or configuration changes/i);
  assert.match(skill, /tasks with a precise target/i);
  assert.doesNotMatch(skill, /CodeGraph[^\n]*(?:before broad search|use early|required)/i);
  assert.doesNotMatch(skill, /paperclip-codegraph-mcp|hermes/i);
});

test("role guidance does not require CodeGraph on coding tasks", async () => {
  const paths = [
    "../agents/architect/AGENTS.md",
    "../agents/security-engineer/AGENTS.md",
    "../agents/micronaut-engineer/AGENTS.md",
  ];

  for (const path of paths) {
    const instructions = await read(path);
    assert.doesNotMatch(instructions, /use CodeGraph(?: early| to)?/i, `${path} must not mandate CodeGraph usage.`);
  }
});

test("package agents configure the cheap model profile for their adapter", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const expectedProfile = agent?.adapter?.type === CODEX_ADAPTER ? CODEX_CHEAP_PROFILE : CLAUDE_CHEAP_PROFILE;
    assert.deepEqual(
      agent?.runtime?.modelProfiles?.cheap,
      expectedProfile,
      `${agentSlug} must configure the Paperclip cheap model profile for its adapter.`,
    );
    assert.equal(agent?.runtime?.heartbeat?.maxConcurrentRuns, 1, `${agentSlug} must keep the single-run heartbeat cap.`);
  }

  assert.match(
    readme,
    /cheap model profile[\s\S]{0,320}claude-haiku-4-5[\s\S]{0,320}gpt-5\.6-luna/i,
    "README must document both cheap model profiles.",
  );
});

test("Claude Haiku cheap profiles override the inherited effort with an empty string", async () => {
  const yaml = await readFile(new URL("../.paperclip.yaml", import.meta.url), "utf8");
  // The host merges the agent's base adapterConfig under the profile's adapterConfig, so a Haiku
  // profile inherits the primary model's `effort` unless it overrides it. The Claude ACP lane
  // rejects `effort` for Haiku 4.5 ("does not advertise config option 'effort'") but omits an
  // empty string, so every Haiku profile must carry `effort: ""` explicitly.
  const haikuProfiles = yaml.match(/model: claude-haiku-4-5\n(\s+)effort: ""/g) ?? [];
  const haikuModels = yaml.match(/model: claude-haiku-4-5\n/g) ?? [];
  assert.ok(haikuModels.length > 0, "expected Haiku cheap profiles");
  assert.equal(haikuProfiles.length, haikuModels.length, "every Haiku cheap profile must set effort to an empty string");
  assert.doesNotMatch(yaml, /model: claude-haiku-4-5\n\s+effort: "?(low|medium|high)"?/, "a Haiku cheap profile must not carry a real effort value");
});
