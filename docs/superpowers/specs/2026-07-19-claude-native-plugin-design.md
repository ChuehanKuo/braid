# Claude Code Native Plugin Design

Date: 2026-07-19
Status: Approved
Supported Claude Code version: 2.1.215

## Goal

Close Braid v0.6's Claude Code Growth Mode gate with a native marketplace plugin, a repository-local manual fallback, and authenticated lifecycle evidence. Claude integration must translate host events into the existing Growth Mode engine rather than create a second architecture policy implementation.

## Chosen architecture

Add a thin Claude host adapter beside the existing Codex adapter. Both adapters call the same `GrowthGuardLifecycle`; only payload parsing, lifecycle mapping, response encoding, and installation differ by host.

The hidden CLI bridge becomes host-aware:

```text
braid growth hook --host codex
braid growth hook --host claude --source native-plugin
braid growth hook --host claude --source manual
```

The current Codex invocation remains valid for backward compatibility. Each hook process reads exactly one JSON document from stdin, writes exactly one host response to stdout, and sends bounded, redacted diagnostics to stderr.

## Claude lifecycle mapping

The adapter supports only the events needed by Growth Mode:

| Claude event           | Growth Mode operation                      | Response                                                                 |
| ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `SessionStart`         | Initialize or recover the session baseline | One concise activation context when active; otherwise silent             |
| `UserPromptSubmit`     | Refresh prompt-cycle context               | Silent unless actionable host context is required                        |
| Relevant `PostToolUse` | Run the cached incremental comparison      | Concise findings when required; otherwise silent                         |
| `Stop`                 | Run the authoritative final scan           | Claude's exact allow/block JSON contract with actionable repair feedback |

Irrelevant tools do not trigger architecture work. The shared engine remains responsible for fingerprints, bounded repeated blocking, recovery, and final allow decisions.

## Native marketplace plugin

The repository exposes an Anthropic-compatible marketplace at `.claude-plugin/marketplace.json` and a self-contained plugin under `plugins/braid/`. The plugin contains metadata, hook declarations, command files, compatibility information, and small launch scripts. It does not package Braid's architecture engine and never downloads software.

Plugin hooks identify their source as `native-plugin` and invoke the installed `braid` executable from `PATH`. The plugin commands are:

- `/braid:setup`
- `/braid:status`
- `/braid:check`
- `/braid:help`

These commands diagnose and explain; they do not silently initialize a repository, enable Growth Mode, edit architecture policy, or install software.

Version metadata derives from the repository's canonical package version through a deterministic validation rule so manifests cannot drift independently.

## Manual repository-local fallback

The fallback commands are:

```text
braid growth install claude --dry-run
braid growth install claude --confirm
braid growth uninstall claude
```

The installer modifies only the verified project-local Claude settings file. It preserves unrelated settings, validates existing JSON, shows a dry-run diff, requires confirmation, writes atomically, creates a recoverable backup, marks Braid-owned handlers explicitly, and refuses ambiguous ownership. Uninstall removes only owned handlers and is idempotent.

Manual hooks identify their source as `manual`. Neither install path automatically enables Growth Mode.

## Duplicate handling

Native and manual hooks can coexist accidentally, so duplicate suppression is part of the shared Claude runtime rather than installer ordering. Evaluations are keyed by host, session, event, worktree identity, and the relevant Growth Mode fingerprint in worktree-scoped state.

The native plugin is authoritative when both sources are present. A duplicate manual evaluation returns a non-blocking response with a remediation notice:

```text
Keep the native plugin and run: braid growth uninstall claude
```

Status reports both installations. Neither path silently removes the other. The design does not depend only on process timing or hook order.

## Safety and privacy

The Claude bridge is fail-open when input is malformed, the CLI or project is unavailable, Growth Mode is disabled, the installed version is incompatible, or execution times out. Child processes are bounded and cleaned up.

Protocol stdout never includes prompts, transcripts, tokens, account information, request identifiers, raw session identifiers, or absolute home paths. Diagnostics are redacted and sent only to stderr. The installer never reads authentication state or global Claude settings.

## Verification

Deterministic tests cover payload parsing, all four lifecycle events, irrelevant tools, allow/block output, malformed inputs, timeouts, disabled projects, worktrees, redaction, repeated blocking, duplicate adapters, installer merge/uninstall behavior, plugin manifests, relative paths, and Codex regressions.

Live verification uses disposable repositories and isolated plugin storage without changing Arthur's global plugin configuration. The release gate requires:

1. plugin and command discovery;
2. authenticated `SessionStart` activation;
3. prompt and relevant tool events;
4. controlled TypeScript cycle creation;
5. Stop block with actionable feedback;
6. an additional Claude turn;
7. repair and final allow;
8. repeated-block bounded behavior;
9. normal checkout and linked-worktree behavior;
10. disable, uninstall, reinstall, failure, duplicate, cleanup, and redaction checks.

Remote marketplace installation from the pushed feature branch is tested only if Claude Code 2.1.215 supports an explicit Git ref. Otherwise the PR records `pending-after-merge-remote-marketplace-smoke` while retaining complete local marketplace and lifecycle evidence.

## Delivery

Preserve the compatibility research, implement on `feat/v0.6-claude-native-plugin`, add the required documentation and reasoning artifact, run the full regression suite, commit with reviewable boundaries, push only to Arthur's fork, and open a PR against `ting10688/braid:research/v0.6-agent-gates`.

No tag, release, default-branch change, upstream push, or force push is part of this work.
