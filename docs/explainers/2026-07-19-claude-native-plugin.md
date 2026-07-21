# Why the Claude native plugin has this shape

Date: 2026-07-19

## The boundary

Claude Code support is a translation layer over `GrowthGuardLifecycle`. The adapter parses only the
fields needed to identify a session, worktree, lifecycle event, and relevant tool. It never decides
whether a dependency cycle is acceptable, how many Stop attempts are allowed, or how findings are
formatted. Those decisions remain in the shared Growth Mode engine used by Codex.

This was chosen over packaging an analyzer inside the plugin. A second engine would create two state
formats, two retry policies, and eventually two definitions of the same architecture regression. The
plugin instead requires the standalone Braid CLI and invokes one hidden host-aware bridge.

## Why SessionStart has its own schema

Live Claude Code 2.1.215 evidence showed that `SessionStart` contains `session_id`, `transcript_path`,
`cwd`, `hook_event_name`, and `source`, but not `permission_mode`. Turn events add
`permission_mode` and their event-specific fields. Initially sharing one common schema caused
SessionStart to fail open; `UserPromptSubmit` then lazily captured the baseline and masked the defect.

The corrected adapter therefore keeps session fields and turn fields separate. Tests retain only the
verified field names and types. Prompts, tool input/output, transcript paths, assistant messages, and
session identifiers are stripped before dispatch and are never persisted.

## Why native and manual installation both exist

The native marketplace is the intended experience because Claude owns discovery, enable/disable,
updates, caching, command namespacing, and hook registration. Some environments restrict
marketplaces, so the CLI also offers an explicit repository-local fallback. That installer follows the
existing Codex ownership model but targets Claude's verified `.claude/settings.local.json` surface and
linked-worktree main-checkout resolution.

The fallback requires a dry run or confirmation, writes atomically, backs up modified content, and
refuses malformed JSON, symlinks, or partial ownership markers. It never changes global Claude
settings or authentication.

## Why duplicate suppression starts at SessionStart

Hook ordering is not a reliable ownership mechanism. If both adapters are installed, manual
SessionStart deliberately defers. Native SessionStart writes a worktree-scoped, hashed session marker
before capturing the baseline. Every later manual event sees that marker and returns a non-blocking
remediation; the native event remains authoritative.

Within the authoritative source, atomic claim files key evaluation by event, worktree, and Growth
report fingerprint. This prevents duplicate Stop evaluation from incrementing the shared finite policy
twice. Claim files contain no raw session identifier or report fingerprint. The session and claim keys
are SHA-256 digests, while persisted content is limited to schema version, source enum, event enum, and
portable worktree identity.

Manual SessionStart deferral is also a recovery choice. When the native plugin is absent or its start
hook fails, the manual `UserPromptSubmit` performs the normal lazy baseline initialization. This keeps
the fallback usable without relying on a timing window.

## Why the plugin uses a shell launcher

Marketplace installation copies only the plugin directory into Claude's cache, so it cannot import
workspace packages or reference the repository checkout. The small POSIX launcher is self-contained,
checks for `braid` on `PATH`, and executes:

```text
braid growth hook --host claude --source native-plugin
```

If the CLI is unavailable, it returns one empty JSON object and a stderr diagnostic. It does not run
an installer, access the network, write plugin data, or leave a child process behind. A script was used
instead of embedding a long shell expression in four manifest entries so quoting and failure behavior
have one reviewed implementation.

Claude auto-discovers the standard `hooks/hooks.json` path. The plugin manifest therefore does not
also declare that file: `manifest.hooks` is reserved for additional hook files, and listing the
standard path there makes Claude load every handler twice. The package validator and regression test
enforce this single-registration rule.

## Exact-version compatibility

The installed CLI changed from 2.1.212 during earlier settings-hook research to 2.1.215 during native
implementation. Production claims therefore target exactly 2.1.215. The capability probe rejects both
older and newer versions until they complete the same authenticated lifecycle gate.

The repository package remains at its canonical 0.5.1 development version on this branch. Marketplace
and plugin metadata are checked against that one source; no tag or release version is created here.

## Evidence that closed the gate

An authenticated, non-persistent Claude Code 2.1.215 session loaded the production plugin through the
official development surface. A controlled Bash mutation bypassed the registered file-tool matcher so
the final scan had to act. The redacted sequence was:

```text
SessionStart(context)
UserPromptSubmit(allow)
Stop(block, stop_hook_active=false)
PostToolUse(Edit, allow)
Stop(allow, stop_hook_active=true)
```

The repair returned the Git worktree to clean status. Separate evidence proved PostToolUse detects a
cycle early when Write/Edit creates it. Local marketplace add, install, list, details, disable, enable,
update, uninstall, and reinstall also succeeded; Claude reported four commands and four hooks.

The probe used a temporary plugin cache and one exact probe-owned plugin data directory because Claude
Code 2.1.215 creates that directory before executing command hooks. The directory did not pre-exist and
was removed after each run. Hashes of global settings, installed-plugin registry, and marketplace
registry were unchanged. No prompt, response, raw hook payload, transcript, account value, token, or
session identifier was retained.
