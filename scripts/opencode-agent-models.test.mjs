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

const HERMES_CHAT_COMMAND = "/usr/local/bin/hermes-paperclip";
const PRIMARY_MODEL_CONFIG = {
  ceo: { model: "gpt-5.6-terra" },
  "product-manager": { model: "gpt-5.6-terra" },
  architect: { model: "gpt-5.6-sol" },
  "qa-engineer": { model: "gpt-5.6-terra" },
  "security-engineer": { model: "gpt-5.6-sol" },
  "micronaut-engineer": { model: "gpt-5.6-sol" },
  "code-reviewer": { model: "gpt-5.6-sol" },
  "technical-writer": { model: "gpt-5.6-luna" },
};

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("README runtime defaults match the package built-in Hermes adapter settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const displayName = AGENT_DISPLAY_NAMES[agentSlug];
    const config = agent?.adapter?.config ?? {};

    const expected = PRIMARY_MODEL_CONFIG[agentSlug];

    assert.ok(displayName, `Missing display name for ${agentSlug}.`);
    assert.ok(expected, `Missing primary model config for ${agentSlug}.`);
    assert.equal(agent?.adapter?.type, "hermes_local", `${agentSlug} must use hermes_local.`);
    assert.equal(config.hermesCommand, HERMES_CHAT_COMMAND, `${agentSlug} must select the dedicated Hermes paperclip chat command.`);
    assert.equal(config.provider, "openai-codex", `${agentSlug} must use the configured Hermes provider.`);
    assert.equal(config.model, expected.model, `${agentSlug} must use the configured primary Hermes model.`);
    assert.equal(config.extraArgs, undefined, `${agentSlug} must not pass unsupported Hermes CLI flags.`);
    assert.ok(
      readme.includes("- " + displayName + ": `hermes_local` via `" + HERMES_CHAT_COMMAND + "`, `" + expected.model + "`"),
      `README should document ${displayName} built-in Hermes command/model defaults.`,
    );
  }
});

test("built-in Hermes agents are bounded by Paperclip runtime settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const config = agent?.adapter?.config ?? {};
    assert.equal(config.hermesCommand, HERMES_CHAT_COMMAND, `${agentSlug} must use the deployment Hermes CLI wrapper.`);
    assert.equal(config.persistSession, true, `${agentSlug} must persist Hermes sessions across Paperclip wakes.`);
    assert.equal(config.quiet, true, `${agentSlug} must use quiet Hermes output for Paperclip transcripts.`);
    assert.equal(config.timeoutSec, 7200, `${agentSlug} must set an explicit long Hermes run timeout.`);
    assert.equal(config.graceSec, 20, `${agentSlug} must set the Hermes termination grace period.`);
    assert.equal(config.cwd, undefined, `${agentSlug} must rely on Paperclip project workspaces instead of adapter cwd.`);
    assert.equal(config.toolsets, undefined, `${agentSlug} must allow Hermes to load its default/all toolsets.`);
  }

  assert.match(
    readme,
    /hermes_local[\s\S]{0,520}hermesCommand:\s*\/usr\/local\/bin\/hermes-paperclip[\s\S]{0,260}timeoutSec:\s*7200[\s\S]{0,160}graceSec:\s*20/i,
    "README must document the explicit Hermes CLI command, timeout, and grace period.",
  );
  assert.match(
    readme,
    /Paperclip project workspaces[\s\S]{0,260}do not set `cwd`[\s\S]{0,260}do not pin `toolsets`|do not set `cwd`[\s\S]{0,260}Paperclip project workspaces[\s\S]{0,260}do not pin `toolsets`/i,
    "README must document that Hermes agents rely on Paperclip workspaces and default toolsets.",
  );
  assert.match(
    readme,
    /CodeGraph MCP[\s\S]{0,220}\/usr\/local\/bin\/paperclip-codegraph-mcp[\s\S]{0,220}PAPERCLIP_CODEGRAPH=off/i,
    "README must document the deployment-provided CodeGraph MCP default and opt-out.",
  );
});

test("repo operations guidance tells agents to use CodeGraph when available", async () => {
  const skill = await read("../skills/micronaut-repo-operations/SKILL.md");

  assert.match(skill, /CodeGraph query per hypothesis/i);
  assert.match(skill, /before broad search/i);
  assert.match(skill, /index may be stale/i);
});

test("built-in Hermes agents configure the cheap model profile", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    assert.deepEqual(
      agent?.runtime?.modelProfiles?.cheap,
      {
        enabled: true,
        label: "GPT-5.4 mini",
        adapterConfig: {
          provider: "openai-codex",
          model: "gpt-5.4-mini",
        },
      },
      `${agentSlug} must configure the Paperclip cheap model profile.`,
    );
  }

  assert.match(
    readme,
    /cheap model profile[\s\S]{0,220}provider:\s*openai-codex[\s\S]{0,120}model:\s*gpt-5\.4-mini/i,
    "README must document the configured cheap model profile for package agents.",
  );
});
