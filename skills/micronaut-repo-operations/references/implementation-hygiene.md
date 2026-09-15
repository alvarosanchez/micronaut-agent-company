# Implementation Hygiene

Load before editing, building, or committing in a managed repository worktree. These rules come from audited runs; each one prevents a failure that already happened.

## Read before you act

- Write every stage artifact to files with `paperclip-workflow.mjs docs --issue "$PAPERCLIP_TASK_ID" --dir "$PAPERCLIP_RUN_SCRATCH_DIR/docs"` and read `qa-intake`, `plan`, and `security-review` (when present) in full. A grep of the acceptance criteria is not a read.
- When `qa-intake` already quotes a GitHub comment verbatim, cite the intake document; do not re-fetch the comment through the tool gateway.
- Every factual claim you write into an artifact cites a successful tool result. A tool that returned nothing (for example `get_issue` on a pull-request number) does not support a claim about that item; use `get_pull_request` and quote what it returned.
- Never call `api.github.com` (or any GitHub endpoint) directly with `curl` or a script: it runs unauthenticated, rate-limits, and leaks the host address into the transcript. The default branch is `git symbolic-ref refs/remotes/origin/HEAD`; everything else goes through GitHub Sync tools.

## Branch sync (before the first edit or commit)

1. `git fetch origin --quiet`.
2. If `git log origin/<target>..HEAD` is empty, the worktree has no own commits: `git reset --hard origin/<target>`. Paperclip cuts worktrees from the repository default branch, so a plan that targets another release line (for example `5.1.x` while the worktree came from `5.0.x`) always lands here; a rebase would replay the whole default-branch history and conflict.
3. Only when own commits exist, `git rebase origin/<target>`; a conflict is a recorded blocker, never a conflicting PR.
4. Record which of the two you did in the implementation artifact.

## Build and test

- Maven: never `-o` (the cache is cold for freshly bumped dependencies); do not run `install`; run the changed module with `./mvnw -ntp -pl <module> -am -Dsurefire.failIfNoSpecifiedTests=false -Dtest=<Class> test`, then the module suite; `Picked up JAVA_TOOL_OPTIONS: -Dapi.version=...` is host environment, not an error.
- Gradle: `./gradlew --no-daemon -q <task>`; never a bare `./gradlew build` on a multi-module repository when one module is in scope.
- Integration tests that build Docker images or native images take minutes: start them in the background with output to `$PAPERCLIP_RUN_SCRATCH_DIR/<name>.log` and poll the log, instead of one synchronous call with a long timeout.
- Print exit codes and the last lines of every build log you rely on; a filtered grep that hides `BUILD SUCCESS`/`FAILURE` is not evidence.

## Commit hygiene

- Stage only the files you changed by path (`git add <path>...`); never `git add -A` or `git add .`.
- Before committing, `git status --short` must show nothing but your intended files: no `.claude/` (harness state), no `target/`, `build/`, `.gradle/`, no scratch or draft documents.
- Draft artifacts live in `$PAPERCLIP_RUN_SCRATCH_DIR`, never inside the worktree.
- One immutable commit for the internal gates; the `publication-manifest` records its full SHA.

## Security constraints

- When `security-review` lists binding constraints (S1, S2, ...), the `publication-manifest` restates each one with the file and line that satisfies it and the negative test that proves it. A reviewer must be able to audit adherence without re-deriving it.
