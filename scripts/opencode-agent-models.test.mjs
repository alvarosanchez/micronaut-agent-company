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

test("README runtime defaults match the package OpenCode model and variant settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const displayName = AGENT_DISPLAY_NAMES[agentSlug];
    const model = agent?.adapter?.config?.model;
    const variant = agent?.adapter?.config?.variant;

    assert.ok(displayName, `Missing display name for ${agentSlug}.`);
    assert.equal(agent?.adapter?.type, "opencode_local", `${agentSlug} must use opencode_local.`);
    assert.match(
      readme,
      new RegExp(`- ${displayName}: \`${model}\`, \`${variant}\``),
      `README should document ${displayName} ${model} with ${variant} OpenCode variant.`,
    );
  }
});

test("OpenCode local agents are bounded for unattended execution", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    assert.equal(
      agent?.adapter?.config?.dangerouslySkipPermissions,
      true,
      `${agentSlug} must skip interactive OpenCode permission prompts for unattended Paperclip runs.`,
    );
    assert.deepEqual(
      agent?.adapter?.config?.extraArgs,
      ["--dangerously-skip-permissions"],
      `${agentSlug} must pass OpenCode's non-interactive permission bypass flag.`,
    );
    assert.equal(
      agent?.adapter?.config?.timeoutSec,
      14400,
      `${agentSlug} must set a four-hour OpenCode run timeout.`,
    );
    assert.equal(
      agent?.adapter?.config?.graceSec,
      20,
      `${agentSlug} must set the OpenCode termination grace period.`,
    );
  }

  assert.match(
    readme,
    /opencode_local[\s\S]{0,520}extraArgs:\s*\["--dangerously-skip-permissions"\][\s\S]{0,260}timeoutSec:\s*14400[\s\S]{0,160}graceSec:\s*20/i,
    "README must document the explicit OpenCode timeout and grace period.",
  );
});

test("OpenCode local agents configure the cheap model profile", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    assert.deepEqual(
      agent?.runtime?.modelProfiles?.cheap,
      {
        enabled: true,
        label: "GPT-5.4 mini",
        adapterConfig: {
          model: "openai/gpt-5.4-mini",
          variant: "medium",
        },
      },
      `${agentSlug} must configure the Paperclip cheap model profile.`,
    );
  }

  assert.match(
    readme,
    /cheap model profile[\s\S]{0,220}openai\/gpt-5\.4-mini[\s\S]{0,120}variant:\s*medium/i,
    "README must document the configured cheap model profile for package agents.",
  );
});
