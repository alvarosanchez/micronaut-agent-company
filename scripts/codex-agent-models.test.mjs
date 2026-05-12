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

test("README runtime defaults match the package agent model and reasoning settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const displayName = AGENT_DISPLAY_NAMES[agentSlug];
    const model = agent?.adapter?.config?.model;
    const reasoning = agent?.adapter?.config?.modelReasoningEffort;

    assert.ok(displayName, `Missing display name for ${agentSlug}.`);
    assert.match(
      readme,
      new RegExp(`- ${displayName}: \`${model}\`, \`${reasoning}\``),
      `README should document ${displayName} ${model} with ${reasoning} reasoning effort.`,
    );
  }
});

test("Codex local agents explicitly bypass the git repository trust check", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    assert.deepEqual(
      agent?.adapter?.config?.extraArgs,
      ["--skip-git-repo-check"],
      `${agentSlug} must explicitly set the Paperclip 2026.512 Codex import argument.`,
    );
  }

  assert.match(
    readme,
    /--skip-git-repo-check[\s\S]{0,260}(?:Codex|codex_local|git repository trust check)/i,
    "README must document the explicit Codex git repository trust check argument.",
  );
});
