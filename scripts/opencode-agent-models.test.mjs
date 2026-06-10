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

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("README runtime defaults match the package Hermes adapter settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const displayName = AGENT_DISPLAY_NAMES[agentSlug];
    const config = agent?.adapter?.config ?? {};

    assert.ok(displayName, `Missing display name for ${agentSlug}.`);
    assert.equal(agent?.adapter?.type, "hermes_local", `${agentSlug} must use hermes_local.`);
    assert.equal(config.provider, "openai-codex", `${agentSlug} must use the OpenAI Codex Hermes provider.`);
    assert.equal(config.model, "gpt-5.5", `${agentSlug} must use gpt-5.5.`);
    assert.deepEqual(config.extraArgs, ["-p", "paperclip"], `${agentSlug} must select the dedicated Hermes paperclip profile.`);
    assert.ok(
      readme.includes("- " + displayName + ": `openai-codex`, `gpt-5.5`, profile `paperclip`"),
      `README should document ${displayName} Hermes provider/model/profile defaults.`,
    );
  }
});

test("Hermes local agents are bounded for unattended execution", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const config = agent?.adapter?.config ?? {};
    assert.equal(config.hermesCommand, "hermes", `${agentSlug} must invoke the Hermes CLI.`);
    assert.equal(config.timeoutSec, 3600, `${agentSlug} must set a one-hour Hermes run timeout.`);
    assert.equal(config.graceSec, 20, `${agentSlug} must set the Hermes termination grace period.`);
    assert.equal(config.cwd, undefined, `${agentSlug} must rely on Paperclip project workspaces instead of adapter cwd.`);
    assert.equal(config.toolsets, undefined, `${agentSlug} must allow Hermes to load its default/all toolsets.`);
  }

  assert.match(
    readme,
    /hermes_local[\s\S]{0,520}extraArgs:\s*\["-p",\s*"paperclip"\][\s\S]{0,260}timeoutSec:\s*3600[\s\S]{0,160}graceSec:\s*20/i,
    "README must document the explicit Hermes profile, timeout, and grace period.",
  );
  assert.match(
    readme,
    /Paperclip project workspaces[\s\S]{0,260}not set `cwd`[\s\S]{0,260}do not pin `toolsets`|not set `cwd`[\s\S]{0,260}Paperclip project workspaces[\s\S]{0,260}do not pin `toolsets`/i,
    "README must document that Hermes agents rely on Paperclip workspaces and default toolsets.",
  );
});

test("Hermes local agents configure the cheap model profile", async () => {
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
