# Native agent plugins

Braid ships a native Claude Code marketplace plugin for Growth Mode. The plugin is a host adapter: it
declares Claude lifecycle hooks and diagnostic commands, then delegates architecture decisions to the
installed Braid CLI. It does not contain a second analyzer or policy engine.

## Support scope

The verified contract is:

| Field                     | Supported value                                                    |
| ------------------------- | ------------------------------------------------------------------ |
| Host                      | Local Claude Code CLI                                              |
| Version                   | Exactly 2.1.215                                                    |
| Tested platform           | Darwin arm64                                                       |
| Lifecycle                 | `SessionStart`, `UserPromptSubmit`, relevant `PostToolUse`, `Stop` |
| Distribution              | Repository marketplace with a relative plugin source               |
| Project settings fallback | `.claude/settings.local.json`                                      |
| Web/cloud agents          | Not claimed                                                        |

An unverified Claude version does not become supported merely because it accepts the manifest. Braid
reports the mismatch and hooks fail open.

## Install the native plugin

Install the standalone Braid CLI first and confirm it is on `PATH`:

```bash
braid --version
```

Then, inside Claude Code:

```text
/plugin marketplace add ting10688/Braid
/plugin install braid@braid
/braid:setup
```

The corresponding CLI management surface is:

```bash
claude plugin marketplace add ting10688/Braid
claude plugin install braid@braid
claude plugin list --json
claude plugin details braid@braid
```

The plugin is copied into Claude's plugin cache. It cannot reference the Braid repository checkout and
therefore locates the standalone `braid` executable through `PATH`. It never downloads or installs the
CLI.

After installation, start a fresh Claude session. Use `/reload-plugins` or restart Claude Code after a
plugin hook update. Plugin installation does not initialize the current repository or enable Growth
Mode. Those remain explicit:

```bash
braid init
```

Then set `growthMode.enabled: true` in `.braid/architecture.yaml` after reviewing the project policy.

## Commands

| Command         | Purpose                                                       | Mutation boundary        |
| --------------- | ------------------------------------------------------------- | ------------------------ |
| `/braid:setup`  | Check CLI/version, plugin, project, and Growth Mode readiness | Diagnostic only          |
| `/braid:status` | Show redacted integration and session availability            | Read-only                |
| `/braid:check`  | Run the current Growth Mode comparison                        | Source and Git read-only |
| `/braid:help`   | Explain setup, removal, and troubleshooting                   | No commands required     |

Status output omits account identity, tokens, request identifiers, prompt text, transcripts, raw
session identifiers, and absolute home paths.

## Automatic lifecycle

The native plugin registers only four events:

| Event              | Behavior                                                                              |
| ------------------ | ------------------------------------------------------------------------------------- |
| `SessionStart`     | Capture or recover the baseline and add one concise activation context when enabled   |
| `UserPromptSubmit` | Lazily initialize if SessionStart was unavailable; otherwise remain silent            |
| `PostToolUse`      | Check relevant Write/Edit/Notebook mutations and return bounded findings when needed  |
| `Stop`             | Run the authoritative final scan and translate the shared finite allow/block decision |

The Stop hook never creates an independent retry loop. The shared Growth Mode engine owns the
configured `stopBlocksPerFingerprint` limit. A repaired state passes the next Stop; an unchanged
fingerprint is eventually allowed with an unresolved warning.

## Manual repository-local fallback

When marketplace installation is unavailable:

```bash
braid growth install claude --dry-run
braid growth install claude --confirm
```

The installer probes Claude Code compatibility before writing, resolves linked worktrees to the main
checkout settings root, refuses symlinks and ambiguous ownership, validates JSON, displays a dry-run
diff, requires confirmation, backs up existing content, and atomically merges four owned handlers. It
never reads authentication state or writes user-global Claude settings.

Remove only the manual handlers with:

```bash
braid growth uninstall claude
```

Uninstall is idempotent and preserves unrelated settings and hooks.

## Duplicate native and manual adapters

Do not install both. If they coexist, native hooks identify themselves as `native-plugin` and manual
hooks as `manual`. The shared runtime uses worktree-scoped state keyed by hashed session identity,
event, worktree, and Growth report fingerprint. Manual SessionStart defers baseline work so the native
plugin is authoritative regardless of SessionStart hook ordering. Later duplicate manual events are
non-blocking and report:

```text
Keep the native plugin and run: braid growth uninstall claude
```

Neither integration silently removes the other.

## Disable, update, and remove

```bash
claude plugin disable braid@braid
claude plugin enable braid@braid
claude plugin update braid@braid
claude plugin uninstall braid@braid
```

Disabling or uninstalling the plugin does not change `.braid/architecture.yaml` or delete Growth Mode
session state. Removing the marketplace also uninstalls plugins sourced from it. Reinstalling requires
a fresh session or plugin reload before new hook definitions apply.

## Failure behavior

Hooks emit exactly one Claude JSON response on stdout and diagnostics only on stderr. They fail open
for malformed input, non-Braid repositories, disabled Growth Mode, missing or incompatible Braid CLI,
analysis failure, and host timeout. The launcher uses no background process and never downloads
software. The final scan remains authoritative because tool-event coverage cannot prove every possible
filesystem mutation.

Use these checks when setup is unclear:

```bash
braid --version
braid growth status --json
claude plugin list --json
claude plugin details braid@braid
```

Inside Claude Code, `/hooks` shows the active hook source and `/braid:setup` reports the exact next
step.
