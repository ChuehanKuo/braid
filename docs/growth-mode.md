# Growth Mode

Growth Mode is Braid's live architecture feedback loop for supported Claude Code and Codex coding sessions. It records
the repository architecture visible at the beginning of one session, compares later working-tree
states with that baseline, and reports only supported regressions introduced during the session.

Growth Mode does not guarantee correct or safe code. It detects a bounded set of static TypeScript
architecture changes relative to the session baseline.

## Growth Mode and migration execution

Growth Mode observes the user's current working tree. It never creates a proposal, staging repository,
candidate branch, worktree, commit, merge, push, or nested Codex execution. It does not repair source
code. Its normal `context`, `check`, `final`, and hook operations write only worktree-specific ephemeral
state inside the Git directory.

Migration execution remains a separate explicitly approved workflow. It starts from one stored
proposal, creates isolated execution resources, validates a candidate, and may create one local
candidate commit. Growth Mode does not call that orchestrator.

## Configuration

Growth Mode is disabled when `growthMode` is absent, preserving behavior for existing Braid projects.
An explicit section can enable the bounded v1 policy:

```yaml
growthMode:
  enabled: true
  enforcement: block
  blockOn:
    - new-cycle
  warnOn:
    - oversized-threshold-crossed
    - oversized-module-growth
  maxFindings: 5
  maxFeedbackCharacters: 4000
  stopBlocksPerFingerprint: 1
```

`enforcement: warn` reports a new cycle but allows Codex to complete at its first Stop attempt.
`enforcement: block` applies the configured, finite Stop behavior. Growth Mode v1 deliberately has no
general policy language or configurable dependency-boundary language.

Reports expose exactly three statuses:

- `pass`: no new supported architecture regression;
- `warn`: a supported non-blocking regression or incomplete analyzer evidence exists;
- `block`: a configured hard regression, currently `new-cycle`, exists.

A pre-existing cycle or oversized module is part of the baseline and does not block unrelated work.
Crossing an oversized threshold or growing an already oversized module can warn. Removing a
pre-existing problem is an improvement. Repairing a new problem during the session returns the current
state to `pass`.

## Baseline and change detection

`SessionStart` captures the baseline once. `UserPromptSubmit` lazily creates it if the start hook was
unavailable. Later source changes never replace a valid baseline; only an explicitly confirmed
`growth reset` removes Braid-owned session state.

The baseline includes the working-tree content visible when the session begins, including ordinary
staged or unstaged edits and supported untracked TypeScript files. State is keyed by session and the current Git worktree and is stored under that
worktree's Git directory, so it does not appear in `git status` or leak into another linked worktree.
Portable reports contain only repository-relative paths and hashed repository/worktree identities.

Before scanning, the guard hashes current HEAD, the relevant staged index diff, relevant source and
configuration content, and supported untracked TypeScript files. Tool names are not treated as proof of mutation. If that cheap
fingerprint is unchanged, Braid skips the analyzer, reuses the latest result, and sends no duplicate
feedback. A changed source, configuration, baseline, HEAD, or worktree identity invalidates the cached
result.

Growth Mode v1 uses the existing deterministic full-repository analyzer after a relevant change. It
focuses findings on changed files, importers, participating cycle files, import edges, and affected
module metrics. It does not run builds, tests, linters, dependency installation, migration execution,
or Codex after each tool call.

## Agent lifecycle

Claude Code and Codex adapters translate the same four lifecycle concepts into the shared Growth Mode
engine:

| Event              | Braid behavior                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `SessionStart`     | Initialize once and add concise baseline context.                                                     |
| `UserPromptSubmit` | Lazily initialize when needed and add current guidance without blocking the prompt.                   |
| `PostToolUse`      | Check the Git/file fingerprint, analyze only a changed state, and add bounded same-session context.   |
| `Stop`             | Reuse or compute the latest result; allow pass/warn, or continue once for a unique block fingerprint. |

For a configured block, the first Stop attempt returns the exact finding and corrective guidance as a
host-native blocking reason. Each unique diff-and-finding fingerprint is continued no more than
`stopBlocksPerFingerprint` times. A repeated unchanged Stop is allowed with a visible unresolved
warning, and the ephemeral state records that outcome. A source change creates a new evaluation and
retry identity. This prevents an infinite Stop loop.

Repository-local command hooks must be reviewed and trusted. Installation cannot grant that trust;
inspect the exact definitions with `/hooks`. `PostToolUse` is not a complete
interception boundary for every possible tool path. Braid therefore reads Git and current files again
at later supported lifecycle events, including `Stop`.

## Claude Code native plugin

The preferred Claude integration is the repository marketplace plugin:

```text
/plugin marketplace add ting10688/Braid
/plugin install braid@braid
/braid:setup
```

It packages hook declarations and `/braid:setup`, `/braid:status`, `/braid:check`, and `/braid:help`.
The plugin contains no architecture engine and requires `braid` on `PATH`. It never downloads
software, initializes a repository, or silently enables Growth Mode. Claude Code must be restarted or
`/reload-plugins` must be run after hook updates.

Native hooks identify themselves as `native-plugin`. Support is exact-version scoped to local Claude
Code 2.1.215 on the tested Darwin arm64 environment; other versions fail open and are not advertised as
compatible. Claude web and cloud-agent behavior is outside this scope.

## Repository-local installers

The normal workflow is:

```console
$ braid growth install codex --dry-run
$ braid growth install codex --confirm
$ codex
```

The installer first probes the active Codex binary, then merges four Braid-owned repository-local
handlers into `.codex/hooks.json`. A real install requires `--confirm`. Existing unrelated keys,
matcher groups, and handlers are preserved; changing an existing file creates a content-addressed
backup. Repeating the same install is a no-op. Installation does not write user-global Codex
configuration or overwrite `AGENTS.md`.

Remove only Braid-owned handlers with:

```console
$ braid growth uninstall codex --dry-run
$ braid growth uninstall codex
```

The uninstall is idempotent and preserves every unrelated hook. It does not remove user trust records.

When the Claude marketplace cannot be used, install the manual fallback into the verified
repository-local `.claude/settings.local.json` surface:

```console
$ braid growth install claude --dry-run
$ braid growth install claude --confirm
$ braid growth uninstall claude
```

The manual installer requires an exact Claude Code 2.1.215 capability match, shows the intended diff,
requires confirmation, validates JSON, writes atomically, creates a content-addressed backup, and
preserves unrelated settings. Linked worktrees resolve this file through the main checkout, matching
Claude Code's repository-local settings behavior. It never inspects authentication or writes global
Claude settings.

If native and manual adapters coexist, native hooks are authoritative. Worktree-scoped state suppresses
duplicate evaluation using the host, session, event, worktree, and Growth report fingerprint. Status
reports both installations and recommends:

```console
$ braid growth uninstall claude
```

Other commands accept `--path` and, where session state matters, `--session`:

```console
$ braid growth context --json
$ braid growth check --session my-session
$ braid growth check --session my-session --json
$ braid growth final --session my-session
$ braid growth status --session my-session --json
$ braid growth reset --session my-session --confirm my-session
```

`context` prints agent-ready guidance. `check` evaluates the current state. `final` applies the same
finite policy as `Stop` without editing the repository. `status` includes baseline/cache state,
installation ownership, and detected host capabilities without printing the raw session ID. `reset` requires the exact session ID and
removes only that session's Braid-owned ephemeral state.

## Example feedback loop

```text
Braid session context:
- no dependency cycles
- notification-service.ts is near the oversized threshold

[Codex edits files]

BRAID LIVE GUARD — BLOCK
New dependency cycle: notifications -> orders -> notifications

Introduced dependency:
src/modules/notifications/service.ts -> src/modules/orders/service.ts

Why this matters:
The reverse dependency creates a cycle that was absent at session start.

Suggested actions:
1. Remove or invert the new reverse dependency.

[Codex repairs the dependency]

BRAID LIVE GUARD — PASS
No new architecture regressions.
```

Feedback is capped by `maxFindings` and `maxFeedbackCharacters`. It contains relative paths, relevant
edges or symbols, baseline/current evidence, the practical consequence, and no more than two bounded
suggestions per finding.

## Fail-open behavior and trust boundary

The hook command accepts one validated JSON payload on stdin, writes exactly one JSON response on
stdout, and sends diagnostics to stderr. It does not evaluate hook fields as shell commands or use the
network. A malformed payload, missing repository, incompatible host, unavailable CLI, timeout, or
analyzer failure fails open so the agent session can continue and never fabricates an architectural
`pass` report. Claude fail-open responses are deliberately silent protocol objects; diagnostics remain
on stderr.

The repository owner, Braid configuration, Codex executable, Git, Node.js, operating system, and
filesystem are trusted. Growth Mode is architecture feedback and a completion guard, not an OS or
adversarial-repository security boundary.

## Known limitations

- Only statically analyzed TypeScript/TSX/MTS/CTS source and supported imports are covered.
- A full deterministic scan runs after a relevant change; Growth Mode v1 is not an incremental compiler.
- A staged blob that differs from its working-tree file invalidates the cache, but v1 analyzes the
  current working-tree file rather than constructing a separate index-only source tree.
- `PostToolUse` coverage follows the installed host hook implementation and is not universal; the
  final scan remains authoritative.
- Warnings and blockers are limited to configured v1 rules; no general boundary policy is inferred.
- Unresolved or ambiguous static evidence warns instead of proving a hard violation.
- Wall-clock measurements are informational and are not CI blockers.
- Manual hook installation is repository-local and still requires explicit host trust review.
