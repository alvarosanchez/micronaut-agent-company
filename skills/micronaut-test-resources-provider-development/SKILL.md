---
name: micronaut-test-resources-provider-development
description: Develop, plan, verify, document, review, or secure Micronaut Test Resources providers, including resolver lifecycle, service-loader registration, build-tools inference, Testcontainers integration, default image manifests, provider docs, and PR follow-through.
license: MIT
metadata:
  sources:
    - kind: paperclip-evidence
      issue: DEV-1026
      summary: Training found recurring Micronaut Test Resources provider work without a suitable external skill.
      usage: owned
    - kind: paperclip-evidence
      issue: DEV-1044
      summary: Later Training evidence reinforced the same provider-contract gap and kept DEV-1027 as the single skill path.
      usage: owned
  intendedAgents:
    - architect
    - micronaut-engineer
    - qa-engineer
    - security-engineer
    - code-reviewer
    - technical-writer
---

# Micronaut Test Resources Provider Development

Use this skill when work touches Micronaut Test Resources provider behavior, especially resolver contracts, provider modules, Testcontainers-backed resources, build-tools inference, generated/default Docker images, provider docs, or provider PR follow-through.

## First Read

Before planning or editing:

1. Read the active issue, current execution stage, linked GitHub issue or PR, latest QA or Architect artifact, repo-local `AGENTS.md`, and any `.company-runtime/` overlay.
2. Identify the provider family: standalone provider module, JDBC/R2DBC/Hibernate Reactive database provider, LocalStack split service, build-tools inference, server/client behavior, docs-only provider work, or PR follow-through.
3. Inspect the nearest existing provider implementation and tests before inventing a new pattern.
4. Preserve the target branch, SemVer bar, and organization-project guidance from QA or Architect unless the stage is explicitly returning to planning.

## Provider Contract

Design the provider around the `TestResourcesResolver` lifecycle:

- service-load resolvers through `META-INF/services/io.micronaut.testresources.core.TestResourcesResolver`
- do not depend on normal Micronaut dependency injection; resolvers are loaded before the application context exists
- use `getRequiredPropertyEntries()` when the resolver must enumerate named entries such as datasources
- use `getResolvableProperties(...)` to publish only the properties this resolver can actually provide
- use `getRequiredProperties(String expression)` for prerequisite properties needed before resolving one expression
- make `resolve(...)` and `shouldAnswer(...)` defensive; return `Optional.empty()` for unsupported or insufficiently specified requests
- keep property names, generated values, and fallback behavior stable because build tools and docs consume them as contracts

For Testcontainers-backed providers, prefer `AbstractTestContainersProvider` unless a specialized lifecycle is justified. Define a stable `getSimpleName()`, useful display name, explicit default image, mapped ports, wait strategy, startup timeout, reuse key/query, and cleanup behavior. Use `DockerImageName` compatibility helpers when a Testcontainers module expects a canonical image family but the provider allows a compatible substitute.

## Module And Build Tools

When adding or changing a provider module:

- follow nearby module layout and Gradle convention plugins instead of hand-writing a new structure
- add only the dependencies needed by the provider and its tests
- update build-tools inference when a framework dependency should automatically add the provider to Gradle or Maven test resources
- cover both positive and negative inference cases, including classpath combinations that should not activate the provider
- update BOM or module metadata only when the repository's existing module pattern requires it

When adding a default Docker image, update the default-images manifest in `test-resources-core` and use the generated `DefaultTestResourceImages` constant from provider code. Keep image aliases and provider names aligned with metadata override properties such as `test-resources.containers.<name>.image-name`, and call out any digest, registry, architecture, license, or emulator caveat in the plan or docs.

## Verification

Use the smallest proof that covers the changed surface:

- provider tests for resolvable properties, `shouldAnswer`, required properties, fixed/generated values, metadata overrides, and unsupported-property fallthrough
- startup tests when behavior depends on a real container; if Docker is unavailable, record the exact skipped command and the narrowest non-Docker proof that still ran
- build-tools inference tests when provider activation depends on application dependencies
- service-loader or embedded/server tests when registration or cross-process resolution changed
- docs checks when provider docs, snippets, generated guides, or guide navigation changed
- PR follow-through checks for CI, Sonar, dependency convergence, nullness, flaky provisioning, and unresolved review threads

Do not treat a generic Testcontainers smoke test as enough when the Micronaut resolver contract, build-tools inference, or generated docs changed.

## Documentation

Update docs when users gain or lose provider behavior, configuration, caveats, or dependency requirements:

- add or update the provider module guide under the repository docs structure
- document the dependency coordinate and whether the scope is `testResourcesService`, test runtime, or build-tool inferred
- list the properties the provider resolves and the user-facing configuration overrides
- explain host, mapped-port, TLS/truststore, emulator, image, platform, and Docker requirements that affect successful local use
- include standalone guide follow-up only when the issue or routine asks for a guide path; otherwise keep docs with the provider PR

## Security Review

Treat provider work as security-sensitive when it touches containers, credentials, files, networking, or docs:

- never log real secrets, tokens, connection strings, account keys, truststore passwords, or generated credentials
- distinguish fixed emulator credentials from production credentials in docs and code comments
- avoid binding fixed public host ports; prefer mapped ports and local-only endpoints unless a plan explicitly justifies otherwise
- verify temporary files, truststores, certificates, and mounted resources are scoped and cleaned up
- assess Docker socket exposure, image provenance, registry trust, tag/digest pinning, compatible substitutes, and architecture support
- make reuse keys precise enough to prevent one test's state or credentials from leaking into another incompatible request
- document insecure emulator limitations instead of presenting them as production-safe defaults

## Role Use

- Architect: lock the provider contract, module impacts, docs impact, verification matrix, security-sensitive surfaces, and rollback path.
- Micronaut Engineer: implement the smallest provider, inference, tests, and docs diff that satisfies the approved contract.
- QA Engineer: verify the requested properties resolve through the intended activation path and that unsupported properties do not resolve accidentally.
- Security Engineer: focus on secrets, Docker/image risk, network exposure, filesystem/truststore handling, cleanup, and docs safety.
- Code Reviewer: check resolver lifecycle correctness, Testcontainers reuse/lifecycle details, test strength, docs accuracy, and PR metadata.
- Technical Writer: ensure provider docs describe actual dependencies, resolved properties, overrides, limitations, and guide follow-up.

## Trigger Examples

Use this skill for prompts like:

- "Plan Azure Cosmos emulator support as a Micronaut Test Resources provider."
- "Review the Docker Compose-backed Test Resources service discovery PR."
- "Verify the Kafka Test Resources provider retry and classpath behavior."

Do not use this skill for prompts like:

- "Write a generic Testcontainers tutorial for a standalone Java app."
- "Fix a Micronaut Control Panel UI layout bug."
- "Compare Gradle and Maven plugin parity when no Test Resources provider behavior is involved."

## Completion Checklist

Before handing off or approving provider work, confirm:

- resolver lifecycle methods and service-loader registration match the intended contract
- build-tools inference and dependency metadata are updated or explicitly out of scope
- default image manifest and provider constants are aligned
- provider, inference, startup, docs, and review-thread checks are recorded at the narrowest useful scope
- docs mention user-facing properties, dependencies, and caveats
- security-sensitive container, credential, file, host, and cleanup risks have been reviewed
