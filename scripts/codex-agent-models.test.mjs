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
