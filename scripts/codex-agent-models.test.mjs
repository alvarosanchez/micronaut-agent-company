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

test("high-reasoning Codex agents use the pro model", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));

  const highReasoningEfforts = new Set(["high", "xhigh"]);
  const mismatchedAgents = Object.entries(extension.agents ?? {})
    .filter(([, agent]) => agent?.adapter?.type === "codex_local")
    .filter(([, agent]) => highReasoningEfforts.has(agent?.adapter?.config?.modelReasoningEffort))
    .filter(([, agent]) => agent?.adapter?.config?.model !== "gpt-5.5-pro")
    .map(([slug]) => slug);

  assert.deepEqual(mismatchedAgents, []);
});

test("README runtime defaults match the package agent reasoning settings", async () => {
  const extension = YAML.parse(await read("../.paperclip.yaml"));
  const readme = await read("../README.md");

  for (const [agentSlug, agent] of Object.entries(extension.agents ?? {})) {
    const displayName = AGENT_DISPLAY_NAMES[agentSlug];
    const reasoning = agent?.adapter?.config?.modelReasoningEffort;

    assert.ok(displayName, `Missing display name for ${agentSlug}.`);
    assert.match(
      readme,
      new RegExp(`- ${displayName}: \`${reasoning}\``),
      `README should document ${displayName} ${reasoning} reasoning effort.`,
    );
  }
});
