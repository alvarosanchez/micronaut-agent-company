---
name: micronaut-graalvm-native-development
description: Diagnose, plan, implement, verify, and review Micronaut-specific GraalVM native-image work across Native Build Tools, reachability metadata, micronaut-graal, micronaut-build GraalVM support, generated AOT/native assets, and CI reports.
license: MIT
metadata:
  sources:
    - kind: paperclip-evidence
      issue: DEV-917
      summary: Training found recurring Micronaut GraalVM/native-image diagnostics and CI interpretation needs since the DEV-828 boundary.
      usage: owned
    - kind: paperclip-evidence
      issue: DEV-841
      summary: Shared micronaut-projects/github-actions GraalVM pre-build action needed native-image job reports for better CI diagnostics.
      usage: owned
    - kind: paperclip-evidence
      issue: DEV-872
      summary: Micronaut Gradle Plugin GraalVM workflow diagnostics and native-image options needed Micronaut-specific follow-through.
      usage: owned
    - kind: paperclip-evidence
      issue: DEV-819
      summary: Native-test error reporting needed recurring Micronaut native-image diagnostic guidance.
      usage: owned
    - kind: paperclip-evidence
      issue: DEV-794
      summary: Micronaut AOT guide review required native/GraalVM CI evidence interpretation.
      usage: owned
    - kind: board-decision
      approval: ea2a0d1b-8bc6-4b0b-a5d7-f26d9ab00296
      summary: Board rejected a generic external GraalVM skill and requested Micronaut-specific internal guidance covering Native Build Tools, reachability metadata, micronaut-graal, and micronaut-build.
      usage: owned
  intendedAgents:
    - micronaut-engineer
    - qa-engineer
---

# Micronaut GraalVM Native Development

Use this skill when work touches Micronaut native-image behavior, Micronaut AOT/native generated assets, GraalVM Native Build Tools configuration, reachability metadata, `micronaut-graal`, `micronaut-build` GraalVM support, native-test failures, or GitHub Actions diagnostics for native-image jobs.

This is not a generic GraalVM tutorial. It captures Micronaut project conventions and PR follow-through expectations so agents can interpret native-image failures without losing Micronaut-specific context.

## First Read

Before planning, editing, verifying, or reviewing:

1. Read the active Paperclip issue, linked GitHub issue or PR, latest QA or Architect artifact, repo-local `AGENTS.md`, and any `.company-runtime/` overlay.
2. Identify the affected repository and surface:
   - application/library code that must compile into a native image
   - `micronaut-graal` or Micronaut core reachability metadata
   - Micronaut Gradle Plugin or Maven Plugin Native Build Tools integration
   - `micronaut-build` GraalVM support such as native-image properties or common Gradle convention plugins
   - documentation, guide snippets, or generated examples that describe native usage
   - CI/shared-action diagnostics for native-image jobs
3. Preserve the approved target branch, SemVer bar, organization-project guidance, and non-breaking requirement from QA or Architect unless the issue is explicitly returned to planning.
4. Inspect the closest existing Micronaut native-image test, build plugin test, reachability metadata entry, or CI workflow before creating a new pattern.

## Micronaut Native Surfaces

### Native Build Tools

For Gradle work, expect Micronaut projects to integrate with the GraalVM Native Build Tools plugin and expose native behavior through tasks such as `nativeCompile`, `nativeTest`, `metadataCopy`, `collectReachabilityMetadata`, or repository-specific lifecycle tasks. Do not add ad hoc `native-image` shell invocations when the repository already uses Native Build Tools or Micronaut build conventions.

For Maven work, check Micronaut Maven Plugin and Native Build Tools configuration before changing command-line flags. Keep generated plugin configuration and sample commands aligned across docs, tests, and build files.

When changing Native Build Tools options:

- prefer repository extension points and convention plugins over per-module duplication
- distinguish build-time initialization, runtime initialization, reflection/resource/proxy metadata, and command-line diagnostics
- preserve test behavior for JVM tests, native tests, and metadata-copy tasks separately
- record whether the change affects end-user build configuration or only internal CI diagnostics

### Reachability Metadata

Reachability metadata is a compatibility surface. Before adding or changing metadata:

- search for existing metadata in the module, `META-INF/native-image`, generated native-image assets, and any repository-specific reachability metadata directories
- prefer the narrowest reflection, resource, serialization, proxy, or JNI entry that matches the observed failure
- avoid broad package-wide reflection unless the failure proves it is required
- include a native-image or metadata-oriented regression test when the repository has an established pattern
- explain whether the metadata belongs in the library module, `micronaut-graal`, Native Build Tools metadata, or documentation

Treat metadata removals or broadened reflection as compatibility-sensitive. They can change native-image reachability, image size, startup behavior, or security exposure.

### `micronaut-graal`

When work mentions `micronaut-graal` or Micronaut core native support:

- inspect `GRAAL.md`, the relevant Micronaut core module, and nearby native-image metadata before changing behavior
- keep Micronaut runtime, inject, serialization, HTTP, validation, and AOT behavior aligned with the metadata being changed
- verify whether failures reproduce only in native-image builds or also under JVM/AOT tests
- avoid moving support out of `micronaut-graal` unless the owning repository already has a more specific metadata location

### `micronaut-build`

When work touches `micronaut-build`, look for existing GraalVM support under `micronaut-gradle-plugins`, including native-image properties writers, extensions, and convention plugins. Changes here affect many Micronaut repositories, so:

- keep APIs and generated files backward compatible unless a human-approved breaking path exists
- update unit or functional tests that validate generated `native-image.properties`, plugin extension behavior, or convention plugin wiring
- avoid repository-specific fixes in `micronaut-build` unless they are truly reusable across Micronaut projects
- document downstream impact and rollback because a bad convention change can break many native CI jobs

### Micronaut AOT And Generated Assets

Native-image failures often involve Micronaut AOT output, generated bean definitions, resource indexing, service descriptors, or build-time initialization. When diagnosing:

- collect the failing generated asset path and the task that produced it
- compare JVM, AOT, and native behavior when practical
- check whether the issue belongs to an annotation processor, AOT optimizer, build plugin, or runtime metadata
- do not paper over a generated-code bug with broad reachability metadata unless the narrower generated-code fix is not viable

## Native Failure Triage

For a native-image or native-test failure, capture enough evidence for another agent to reproduce the diagnosis:

1. Repository, branch, JDK/GraalVM version, Native Build Tools version if visible, and exact task or workflow job.
2. The first native-image error, not only the final non-zero exit line.
3. Generated reports or diagnostics such as `build/reports/native-image`, `reports/native`, `native-image.args`, `native-image.properties`, build scan links, or uploaded job artifacts.
4. Whether the failure happens during analysis, image build, image run, or native tests.
5. The smallest related JVM/AOT test that still passes or fails.

Common diagnosis buckets:

- missing reflection/resource/proxy/JNI metadata
- class initialization at build time vs runtime
- unsupported dynamic class loading, proxies, resources, or serialization
- service-loader/resource packaging drift
- Native Build Tools task configuration or generated args mismatch
- CI environment issues such as GraalVM distribution, architecture, memory, container limits, or missing artifacts

## Verification Strategy

Use the smallest proof that covers the changed surface:

- Native Build Tools integration: targeted Gradle or Maven plugin tests, generated args/properties assertions, or a focused sample `nativeCompile`/`nativeTest` when feasible
- reachability metadata: metadata-copy/merge checks plus a native-image regression test or documented CI artifact when native compilation is too expensive locally
- `micronaut-graal`: nearby Micronaut core native/AOT tests and metadata assertions
- `micronaut-build`: unit or functional tests for the GraalVM plugin/convention behavior and generated files
- CI diagnostics: verify the workflow/action emits the requested report paths, artifact names, and actionable first-error content
- docs/guides: verify commands, plugin snippets, and caveats match the repository's actual Gradle/Maven setup

If native-image compilation is skipped because it is too expensive or the environment lacks GraalVM/Docker/resources, record the exact skipped command and the narrower proof that did run. Do not claim native compatibility from JVM-only tests.

## Documentation Impact

Update documentation when users gain or lose a native-image capability, configuration flag, metadata requirement, or troubleshooting path:

- keep Gradle and Maven snippets aligned with Micronaut plugin conventions
- call out Native Build Tools task names and generated report/artifact locations precisely
- document reachability metadata caveats only when users need to act on them
- preserve guide examples that target the latest stable Micronaut behavior unless the issue explicitly targets prerelease docs
- avoid recommending broad reflection metadata or unsafe flags as generic fixes

## Security And Compatibility Risks

Native-image work can change security and compatibility even when the code diff is small:

- broad reflection/resource metadata can expose classes, resources, serializers, or endpoints unexpectedly
- build-time initialization can freeze configuration, environment values, randomness, or secrets into an image
- native test logs and CI artifacts can leak system properties, tokens, credentials, certificate paths, or connection strings
- plugin convention changes can affect many repositories that inherit `micronaut-build`
- GraalVM version, architecture, and base-image changes can alter support windows or binary compatibility

State whether the change must remain non-breaking. For normal Micronaut delivery, keep it non-breaking unless a linked board approval or maintainer request explicitly authorizes a breaking release-policy path.

## Role Use

- Micronaut Engineer: implement the smallest Micronaut-native diff, preserve Native Build Tools and `micronaut-build` conventions, add focused tests, and keep CI diagnostics actionable.
- QA Engineer: verify the failing native-image path or CI report is covered, distinguish JVM/AOT/native evidence, and record skipped native compilation honestly.
- Code Reviewer: check metadata minimality, initialization safety, plugin convention compatibility, report usefulness, docs accuracy, and whether native-image claims are backed by native-specific evidence.

## Trigger Examples

Use this skill for prompts like:

- "Diagnose the failing nativeTest job in micronaut-gradle-plugin."
- "Add native-image reports to the shared GraalVM pre-build action."
- "Review a reachability metadata fix for Micronaut serialization."
- "Plan a micronaut-build GraalVM convention change."
- "Verify Micronaut AOT guide claims against native-image CI evidence."

Do not use this skill for prompts like:

- "Explain GraalVM Native Image for a non-Micronaut Java app."
- "Tune generic JVM performance without native-image involvement."
- "Change Docker or CI unrelated to GraalVM/native jobs."
- "Add a generic external GraalVM skill without Micronaut internal guidance."

## Completion Checklist

Before handing off or approving Micronaut native work, confirm:

- the affected Micronaut native surface is named: Native Build Tools, reachability metadata, `micronaut-graal`, `micronaut-build`, AOT/generated assets, docs, or CI diagnostics
- the plan or artifact records whether the change must remain non-breaking
- metadata changes are narrow and covered by the best available native-specific proof
- Native Build Tools task wiring and generated args/properties are tested or explicitly out of scope
- CI artifacts/reports expose the first actionable native-image error without leaking secrets
- docs, guides, and command snippets match the actual repository plugin setup
- rollback is clear, especially for `micronaut-build` or shared-action changes that affect multiple repositories
