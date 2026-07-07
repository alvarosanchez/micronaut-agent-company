import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import YAML from "yaml";

const SKILL_NAME = "micronaut-graalvm-native-development";
const TARGET_AGENT_FILES = ["micronaut-engineer", "qa-engineer"];

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  assert.ok(match, "Expected Markdown file to include frontmatter.");
  return {
    frontmatter: YAML.parse(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

test("Micronaut GraalVM native development skill is concrete and evidenced", async () => {
  const source = await readFile(
    new URL(`../skills/${SKILL_NAME}/SKILL.md`, import.meta.url),
    "utf8",
  );
  const { frontmatter, body } = parseFrontmatter(source);

  assert.equal(frontmatter.name, SKILL_NAME);
  assert.match(frontmatter.description, /Micronaut-specific GraalVM native-image work/i);
  assert.match(frontmatter.description, /Native Build Tools/i);
  assert.match(frontmatter.description, /reachability metadata/i);
  assert.match(frontmatter.description, /micronaut-graal/i);
  assert.match(frontmatter.description, /micronaut-build/i);

  assert.deepEqual(frontmatter.metadata?.intendedAgents, TARGET_AGENT_FILES);
  assert.equal(frontmatter.metadata?.sources?.[0]?.issue, "DEV-917");
  assert.equal(frontmatter.metadata?.sources?.[1]?.issue, "DEV-841");
  assert.equal(frontmatter.metadata?.sources?.[2]?.issue, "DEV-872");
  assert.equal(frontmatter.metadata?.sources?.[3]?.issue, "DEV-819");
  assert.equal(frontmatter.metadata?.sources?.[4]?.issue, "DEV-794");
  assert.equal(frontmatter.metadata?.sources?.[5]?.approval, "ea2a0d1b-8bc6-4b0b-a5d7-f26d9ab00296");
  assert.equal(frontmatter.metadata?.sources?.[5]?.usage, "owned");

  for (const pattern of [
    /Native Build Tools/,
    /nativeCompile/,
    /nativeTest/,
    /metadataCopy/,
    /collectReachabilityMetadata/,
    /META-INF\/native-image/,
    /reflection, resource, serialization, proxy, or JNI/,
    /micronaut-graal/,
    /GRAAL\.md/,
    /micronaut-build/,
    /NativeImageSupportPlugin|Native Build Tools/,
    /Micronaut AOT/,
    /build\/reports\/native-image/,
    /native-image\.args/,
    /native-image\.properties/,
    /build-time initialization/,
    /Do not use this skill/,
    /Completion Checklist/,
  ]) {
    assert.match(body, pattern);
  }
});

test("target agents include the Micronaut GraalVM native development skill", async () => {
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
