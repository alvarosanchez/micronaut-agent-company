import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const SKILL_NAME = "micronaut-test-resources-provider-development";
const TARGET_AGENT_FILES = [
  "architect",
  "micronaut-engineer",
  "qa-engineer",
  "technical-writer",
];

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(match, "Expected Markdown file to include frontmatter.");
  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

test("Micronaut Test Resources provider development skill is concrete and evidenced", async () => {
  const source = await readFile(
    new URL(`../skills/${SKILL_NAME}/SKILL.md`, import.meta.url),
    "utf8",
  );
  const { frontmatter, body } = parseFrontmatter(source);

  assert.equal(frontmatter.name, SKILL_NAME);
  assert.match(frontmatter.description, /Micronaut Test Resources providers/i);
  assert.match(frontmatter.description, /Testcontainers/i);
  assert.match(frontmatter.description, /build-tools inference/i);
  assert.match(frontmatter.description, /default image manifests/i);

  assert.deepEqual(frontmatter.metadata?.intendedAgents, TARGET_AGENT_FILES);
  assert.equal(frontmatter.metadata?.sources?.[0]?.issue, "DEV-1026");
  assert.equal(frontmatter.metadata?.sources?.[1]?.issue, "DEV-1044");
  assert.equal(frontmatter.metadata?.sources?.[0]?.usage, "owned");

  for (const pattern of [
    /TestResourcesResolver/,
    /META-INF\/services\/io\.micronaut\.testresources\.core\.TestResourcesResolver/,
    /getRequiredPropertyEntries/,
    /getResolvableProperties/,
    /getRequiredProperties/,
    /Optional\.empty/,
    /AbstractTestContainersProvider/,
    /DockerImageName/,
    /DefaultTestResourceImages/,
    /test-resources\.containers\.<name>\.image-name/,
    /build-tools inference/,
    /service-loader/,
    /mapped ports/,
    /truststore/,
    /Docker socket/,
    /Trigger Examples/,
    /Do not use this skill/,
  ]) {
    assert.match(body, pattern);
  }
});

test("target agents include the Micronaut Test Resources provider skill", async () => {
  for (const agent of TARGET_AGENT_FILES) {
    const source = await readFile(
      new URL(`../agents/${agent}/AGENTS.md`, import.meta.url),
      "utf8",
    );
    const { frontmatter } = parseFrontmatter(source);

    assert.ok(
      frontmatter.skills.includes(SKILL_NAME),
      `${agent} should include ${SKILL_NAME}`,
    );
  }
});
