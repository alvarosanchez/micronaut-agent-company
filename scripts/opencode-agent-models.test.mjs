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

test("README runtime defaults match the package Hermes ACP adapter settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const displayName = AGENT_DISPLAY_NAMES[agentSlug];
    assert.ok(displayName, `Missing display name for ${agentSlug}.`);
    assert.equal(agent?.adapter?.type, "acpx_local", `${agentSlug} must use acpx_local.`);
    assert.match(readme, /acpx_local[\s\S]{0,240}hermes -p paperclip acp --accept-hooks/i);
  }
});

test("Hermes ACP agents are bounded for unattended execution without deprecated cwd or toolsets", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    assert.equal(agent?.adapter?.config?.agentCommand, "/usr/local/bin/hermes -p paperclip acp --accept-hooks", `${agentSlug} must use the Hermes paperclip ACP command.`);
    assert.equal(agent?.adapter?.config?.permissionMode, "approve-all", `${agentSlug} must avoid interactive permission prompts.`);
    assert.equal(agent?.adapter?.config?.nonInteractivePermissions, "deny", `${agentSlug} must deny non-interactive escalations.`);
    assert.equal(agent?.adapter?.config?.timeoutSec, 0, `${agentSlug} must not set an adapter hard timeout.`);
    assert.equal(agent?.adapter?.config?.graceSec, 20, `${agentSlug} must set the termination grace period.`);
    assert.equal(Object.hasOwn(agent?.adapter?.config ?? {}, "cwd"), false, `${agentSlug} must not set deprecated adapter cwd.`);
    assert.equal(Object.hasOwn(agent?.adapter?.config ?? {}, "toolsets"), false, `${agentSlug} must not hardcode Hermes toolsets.`);
  }

  assert.match(readme, /does \*\*not\*\* set deprecated adapter `cwd` or hardcoded `toolsets`/i);
});

test("Hermes ACP agents leave model selection to the paperclip Hermes profile", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    assert.equal(agent?.runtime?.modelProfiles, undefined, `${agentSlug} must not configure OpenCode model profiles.`);
    assert.equal(Object.hasOwn(agent?.adapter?.config ?? {}, "model"), false, `${agentSlug} must not pin a model in adapter config.`);
    assert.equal(Object.hasOwn(agent?.adapter?.config ?? {}, "variant"), false, `${agentSlug} must not pin an OpenCode variant.`);
  }

  assert.match(readme, /active model\/provider are owned by the Hermes `paperclip` profile/i);
});
