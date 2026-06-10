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

const HERMES_ACP_COMMAND = "/usr/local/bin/hermes -p paperclip acp --accept-hooks";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("README runtime defaults match the package ACPX/Hermes ACP adapter settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const displayName = AGENT_DISPLAY_NAMES[agentSlug];
    const config = agent?.adapter?.config ?? {};

    assert.ok(displayName, `Missing display name for ${agentSlug}.`);
    assert.equal(agent?.adapter?.type, "acpx_local", `${agentSlug} must use acpx_local.`);
    assert.equal(config.agent, "custom", `${agentSlug} must use a custom ACPX agent command.`);
    assert.equal(config.agentCommand, HERMES_ACP_COMMAND, `${agentSlug} must select the dedicated Hermes paperclip ACP profile.`);
    assert.ok(
      readme.includes("- " + displayName + ": `" + HERMES_ACP_COMMAND + "`"),
      `README should document ${displayName} ACPX/Hermes ACP command defaults.`,
    );
  }
});

test("ACPX/Hermes ACP agents are bounded by Paperclip ACP runtime settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const config = agent?.adapter?.config ?? {};
    assert.equal(config.mode, "persistent", `${agentSlug} must use persistent ACPX mode.`);
    assert.equal(config.permissionMode, "approve-all", `${agentSlug} must allow Paperclip-approved ACP tool execution.`);
    assert.equal(config.nonInteractivePermissions, "deny", `${agentSlug} must deny non-interactive permission prompts.`);
    assert.equal(config.timeoutSec, 0, `${agentSlug} must leave ACPX process timeout unbounded for persistent mode.`);
    assert.equal(config.graceSec, 20, `${agentSlug} must set the ACPX termination grace period.`);
    assert.equal(config.warmHandleIdleMs, 0, `${agentSlug} must keep the persistent ACP handle warm.`);
    assert.equal(config.cwd, undefined, `${agentSlug} must rely on Paperclip project workspaces instead of adapter cwd.`);
    assert.equal(config.toolsets, undefined, `${agentSlug} must allow Hermes to load its default/all toolsets.`);
    assert.equal(config.provider, undefined, `${agentSlug} must delegate model/provider selection to the Hermes paperclip profile.`);
    assert.equal(config.model, undefined, `${agentSlug} must delegate model/provider selection to the Hermes paperclip profile.`);
  }

  assert.match(
    readme,
    /acpx_local[\s\S]{0,520}agentCommand:\s*\/usr\/local\/bin\/hermes -p paperclip acp --accept-hooks[\s\S]{0,260}timeoutSec:\s*0[\s\S]{0,160}graceSec:\s*20/i,
    "README must document the explicit Hermes ACP command, timeout, and grace period.",
  );
  assert.match(
    readme,
    /Paperclip project workspaces[\s\S]{0,260}do not set `cwd`[\s\S]{0,260}do not pin `toolsets`|do not set `cwd`[\s\S]{0,260}Paperclip project workspaces[\s\S]{0,260}do not pin `toolsets`/i,
    "README must document that Hermes ACP agents rely on Paperclip workspaces and default toolsets.",
  );
});

test("ACPX/Hermes ACP agents configure the cheap model profile", async () => {
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
