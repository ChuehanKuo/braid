# Agent platform compatibility research

Research date: 2026-07-19 (Asia/Taipei)
Latest research host: Darwin 25.5.0, arm64

This document is the Braid v0.6.0 official-contract research gate. Production
implementation remains paused. A platform is not eligible for production
Growth Mode until official documentation and an isolated live CLI probe both
prove final-stop blocking, an additional agent turn, and repair-to-pass.
Executable discovery or schema parsing alone is insufficient.

## Gate result

| Platform              | Tested CLI       | Contract   | Live final-stop                          | Growth classification |
| --------------------- | ---------------- | ---------- | ---------------------------------------- | --------------------- |
| OpenAI Codex          | 0.144.5          | documented | block → additional turn → pass           | `verified`            |
| Anthropic Claude Code | 2.1.212, 2.1.215 | documented | block → additional turn → repair → pass  | `verified`            |
| Google Gemini CLI     | 0.40.0           | documented | block → additional turn → pass           | `verified`            |
| GitHub Copilot CLI    | 1.0.71           | documented | not reached: policy authorization denied | `blocked`             |

The Claude priority gate is closed. The Copilot priority gate remains blocked,
so the full four-platform v0.6.0 matrix is not yet authorized.

## Preflight

No account names, credentials, tokens, prompt text, transcripts, session
databases, or unredacted home paths were retained.

| Field                    | Claude Code                                                                                              | GitHub Copilot CLI                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executable               | `/Users/<user>/.local/bin/claude` → native version directory                                             | `/opt/homebrew/bin/copilot` → Homebrew Cask directory                                                                                                       |
| Exact version            | `2.1.212` settings-hook probe; `2.1.215` native-plugin gate                                              | `GitHub Copilot CLI 1.0.71`                                                                                                                                 |
| Installation channel     | native installer, `latest` update channel                                                                | Homebrew Cask                                                                                                                                               |
| Doctor/version result    | native install healthy; `darwin-arm64`                                                                   | version command succeeded and reported current                                                                                                              |
| Authentication readiness | ready: `loggedIn:true`, authenticated prompt succeeded through `claude.ai`; no account data was retained | credential reached a model request, but runtime readiness is `unknown`: the request was denied because an enterprise or organization policy must be enabled |
| Relevant help reviewed   | `--setting-sources`, `--settings`, `--resume`, `--continue`, `--worktree`, `-p`, hook event filtering    | `COPILOT_HOME`, `--resume`, `--continue`, `-p`, `-i`, scoped allow/deny tool flags, `--no-remote`, `--no-remote-export`, `--no-auto-update`, `--log-dir`    |
| Unsafe options used      | none                                                                                                     | none                                                                                                                                                        |

`claude doctor`, `claude --help`, `copilot --help`, `copilot help`, and
`copilot help config` were reviewed. No login command, broad permission flag,
user-level hook, cloud job, or authentication-setting change was used by the
research harness.

## Required four-platform matrix

Codex and Gemini rows carry forward the earlier isolated contract probes
recorded by this document. This task re-ran only the Claude and Copilot gates.

| Field                      | Codex                                                                  | Claude Code                                               | Gemini CLI                                     | Copilot CLI                                                                  |
| -------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| CLI version tested         | 0.144.5                                                                | 2.1.212 and 2.1.215                                       | 0.40.0                                         | 1.0.71                                                                       |
| Official source            | yes                                                                    | yes                                                       | yes                                            | yes                                                                          |
| Executable and help probe  | yes                                                                    | yes                                                       | yes                                            | yes                                                                          |
| Local live hook probe      | yes                                                                    | yes; isolated settings and native-plugin lifecycle probes | yes                                            | config source only; lifecycle not reached                                    |
| Config path                | `.codex/hooks.json`                                                    | `.claude/settings.local.json`                             | `.gemini/settings.json`                        | `.github/copilot/settings.local.json`                                        |
| Local-only path            | no                                                                     | yes                                                       | no                                             | yes                                                                          |
| Session event              | `SessionStart`                                                         | `SessionStart`                                            | `SessionStart`                                 | `sessionStart`                                                               |
| Prompt event               | `UserPromptSubmit`                                                     | `UserPromptSubmit`                                        | `BeforeAgent`                                  | `userPromptSubmitted`                                                        |
| Mutation event             | `PostToolUse`                                                          | `PostToolUse`                                             | `AfterTool`                                    | `postToolUse`                                                                |
| Final-stop event           | `Stop`                                                                 | `Stop`                                                    | `AfterAgent`                                   | `agentStop`                                                                  |
| Final-stop blocking proven | yes                                                                    | yes                                                       | yes                                            | no                                                                           |
| Additional turn proven     | yes                                                                    | yes                                                       | yes                                            | no                                                                           |
| Repair-to-pass proven      | yes                                                                    | yes                                                       | yes                                            | no                                                                           |
| Worktree tested            | no recorded live result                                                | yes; main-checkout local config, linked-worktree hook cwd | no recorded live result                        | no                                                                           |
| Ownership strategy         | documented                                                             | documented below                                          | documented                                     | documented below                                                             |
| Known limitations          | shell mutation interception is incomplete; final scan is authoritative | `-p` only; native plugin verified only on 2.1.215         | trust and cumulative retry output require care | entitlement, live lifecycle, repeated blocking, and worktree remain untested |
| Final classification       | `verified`                                                             | `verified`                                                | `verified`                                     | `blocked`                                                                    |

No minimum supported version is inferred merely from the installed version.

## Anthropic Claude Code

Official sources: [hooks reference](https://code.claude.com/docs/en/hooks),
[settings](https://code.claude.com/docs/en/settings),
[configuration diagnostics](https://code.claude.com/docs/en/debug-your-config),
[CLI reference](https://code.claude.com/docs/en/cli-reference), and
[worktrees](https://code.claude.com/docs/en/worktrees).

### Official contract

- Project hooks may be stored in `.claude/settings.json` (committable) or
  `.claude/settings.local.json` (single-project and local-only). Braid should
  use the latter. In 2.1.211 and later, Claude resolves the local file through
  linked worktrees to the main checkout, so one repository-root file applies
  to all of that repository's worktrees.
- `/hooks` is the native read-only inspection surface. It labels
  `.claude/settings.local.json` handlers as `Local` and displays their source
  file. Direct settings edits are normally picked up by the file watcher.
- Interactive project hooks require workspace trust and may be disabled by
  managed hook policy. Non-interactive `-p` skips the trust dialog. Braid must
  inspect and report these states, never grant trust or change policy.
- Command hooks receive one JSON object on stdin. Common fields include
  `session_id`, `transcript_path`, `cwd`, `permission_mode`, and
  `hook_event_name`. Braid must ignore and never persist prompts, transcript
  paths, assistant text, tool results, and source content.

| Braid lifecycle | Native event       | Additional native stdin                                                  | Exit-0 stdout used by Braid                                               |
| --------------- | ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `session-start` | `SessionStart`     | `source: startup\|resume\|clear\|compact`; optional model/agent metadata | `hookSpecificOutput.additionalContext` or empty output                    |
| `prompt-submit` | `UserPromptSubmit` | `prompt`                                                                 | `hookSpecificOutput.additionalContext` or empty output                    |
| `post-mutation` | `PostToolUse`      | `tool_name`, `tool_input`, `tool_response`, `tool_use_id`                | `hookSpecificOutput.additionalContext`; it cannot undo the completed tool |
| `final-stop`    | `Stop`             | `stop_hook_active`, `last_assistant_message`, plus additive task fields  | pass: `{}` or empty; block: `{"decision":"block","reason":"..."}`         |

For `Stop`, `decision: "block"` prevents stopping and causes the agent session
to continue with an additional turn using `reason`. The continued Stop input
sets `stop_hook_active: true`. Current official documentation also caps eight
consecutive Stop continuations, but Braid must retain its smaller
fingerprint-based finite policy. Exit 2 plus stderr also blocks Stop; other
nonzero exits are fail-open for most events.

Command-hook timeout defaults to 600 seconds, except `UserPromptSubmit`, whose
default is 30 seconds. Unknown additive settings/output fields are not a
production guarantee, so a Braid editor must preserve them without depending
on them.

On resume, `SessionStart` fires again with `source: "resume"`; previously
injected mid-session context is replayed rather than re-running historical
hooks. These documented claims were not promoted to live evidence.

### Live probe result

The 2026-07-18 probe used Claude Code 2.1.212 in disposable Git repositories,
selected only the `local` configurable settings source, disabled session
persistence, and bounded turns and spend. The CLI reported authenticated
readiness, and a tool-free prompt completed successfully. No account name,
session ID, prompt, assistant response, transcript path, or raw transcript was
retained.

The deterministic repair loop established the complete Growth requirement:

1. `UserPromptSubmit` fired, then a successful `Write` created an artifact
   whose complete value was `INVALID`.
2. The first `Stop` fired with `stop_hook_active: false`; the hook's validator
   observed `INVALID` and returned `decision: "block"` with an exact repair.
3. Claude took another model/tool turn and rewrote the artifact to `VALID`.
   This intervening mutation, matching only the hook's feedback, proves the
   blocking reason reached the agent without retaining the transcript.
4. A second `Stop` fired with `stop_hook_active: true`; validation passed, the
   hook returned `{}`, `SessionEnd` fired, and the process exited 0 with a
   successful result after four agentic turns.

The bounded-repeat probe blocked exactly twice. Its event order was initial
`Write` → Stop 1 → `Edit` → Stop 2 → `Edit` → Stop 3. Stops 2 and 3 both set
`stop_hook_active: true`; the artifact recorded the two requested continuation
markers, the third Stop allowed completion, and the process exited 0 after six
agentic turns. No infinite loop occurred.

The separate negative probes each invoked one Stop:

| Case                            | Observed 2.1.212 result                                                      |
| ------------------------------- | ---------------------------------------------------------------------------- |
| malformed stdout                | ignored for decision control; one-turn process exited 0 successfully         |
| 2-second hook, 1-second timeout | timed-out decision did not block; one-turn process exited 0 successfully     |
| exit 0 with no stdout           | allowed completion                                                           |
| exit 1 with stderr              | allowed completion                                                           |
| validation already passing      | first Stop allowed completion; no continuation                               |
| malformed local settings        | `claude doctor` reported invalid JSON; `-p` ignored the file and ran no hook |

In the `-p` lifecycle runs that configured them, `UserPromptSubmit`, tool
events, `Stop`, and `SessionEnd` fired, but `SessionStart` did not. Supplying
the same settings file explicitly with `--settings` did not change that
result. This is observed print-mode behavior, not a claim about interactive
sessions. Interactive mode and resume remain untested because they would
retain a transcript or trust state outside the disposable no-persistence
boundary.

The linked-worktree probe placed `.claude/settings.local.json` only in the main
checkout. Claude loaded it while launched from the linked worktree; Stop and
SessionEnd ran with the linked worktree as `cwd`, and no evidence file appeared
in the main checkout. This confirms the documented repository-root discovery
and worktree-local execution behavior for 2.1.212.

Classification: `verified` for Claude Code 2.1.212 on Darwin arm64,
non-interactive `-p`, repository-local command hooks. This does not establish
interactive, resumed-session, other-version, or other-host equivalence.

### Native-plugin gate

Claude Code 2.1.215 was then tested through the official `--plugin-dir`
development surface with an Anthropic-validated disposable plugin. The CLI
reported four discovered hooks. An authenticated, non-persistent Sonnet run
produced this redacted order:

1. `SessionStart` with `source: startup`;
2. `UserPromptSubmit`;
3. `PostToolUse` for `Write`;
4. `Stop` with `stop_hook_active: false`, which blocked on the controlled
   `INVALID` artifact;
5. an additional `PostToolUse` for `Write`, which repaired it to `VALID`;
6. `Stop` with `stop_hook_active: true`, which allowed completion.

The process exited 0. The native plugin's temporary cache was isolated. Claude
Code 2.1.215 required a per-plugin data directory before executing command
hooks, so the probe created one exact probe-owned directory, verified that it
did not pre-exist, and removed it afterward. Hashes of the user settings,
installed-plugin registry, and marketplace registry were unchanged. No raw
payload, prompt, response, transcript, session identifier, or authentication
material was retained.

Classification: `verified` for Claude Code 2.1.215 on Darwin arm64,
non-interactive `-p`, native development plugin hooks. Production support must
remain scoped to this exact Claude Code version until another version completes
the same gate.

## GitHub Copilot CLI

Official sources reviewed again on 2026-07-17:
[Authenticating GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli),
[Administering Copilot CLI for your enterprise](https://docs.github.com/en/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise),
[hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference),
[CLI configuration directory](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference),
[CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference),
[using hooks](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks),
and the [official changelog](https://github.com/github/copilot-cli/blob/main/changelog.md).

### Official contract and CLI-only scope

Copilot CLI reads repository inline hooks from both
`.github/copilot/settings.json` and `.github/copilot/settings.local.json`; the
local file uses the same repository schema, takes precedence, and should be
gitignored. The cloud coding agent's documented default discovery loads only
`.github/hooks/*.json` from the cloned repository. Therefore Braid's proposed
path is `.github/copilot/settings.local.json`, and the earlier
`.github/hooks/braid.json` proposal is rejected.

The documented settings precedence is built-in → managed policy → user
settings → `.github/copilot/settings.json` →
`.github/copilot/settings.local.json` → environment → CLI flags. Hook entries
from applicable sources are combined, so Braid must not depend on a particular
cross-source execution order. The current native inspection surface is `/env`;
the command reference does not document a Copilot CLI `/hooks` command.

Cloud-scope decision: `cli-only-scope-verified`, based on the earlier live
`/env` source observation and the re-reviewed current official discovery
contract. This means only that the configuration path is outside cloud default
discovery; no cloud-agent compatibility is claimed.

| Braid lifecycle | Native event          | Native stdin                                                                                          | Exit-0 stdout used by Braid                                                        |
| --------------- | --------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `session-start` | `sessionStart`        | `sessionId`, millisecond `timestamp`, `cwd`, `source: startup\|resume\|new`, optional `initialPrompt` | `{"additionalContext":"..."}` or `{}`                                              |
| `prompt-submit` | `userPromptSubmitted` | `sessionId`, `timestamp`, `cwd`, `prompt`                                                             | `{}`; do not rely on prompt output                                                 |
| `post-mutation` | `postToolUse`         | `sessionId`, `timestamp`, `cwd`, `toolName`, `toolArgs`, successful `toolResult`                      | `additionalContext` or `modifiedResult`; Braid uses context only                   |
| `final-stop`    | `agentStop`           | `sessionId`, `timestamp`, `cwd`, `transcriptPath`, `stopReason: end_turn`                             | pass: `{"decision":"allow"}` or `{}`; block: `{"decision":"block","reason":"..."}` |

`agentStop` block causes the agent session to continue with an additional turn
using `reason`. The payload documents no continuation indicator or native
retry count, so Braid-owned fingerprint/count state is mandatory.

The current hooks reference says `userPromptSubmitted` output is not
processed, while the official 1.0.65 changelog says its `additionalContext`
was added to the model-facing prompt. Until a version-bound live probe resolves
that conflict, Braid may use the command event only for deterministic internal
state and must emit `{}`.

For command hooks, exit 0 parses stdout as one JSON value. Exit 2 is a warning
and fail-open for `agentStop`; other nonzero exits are also fail-open. The
default `timeoutSec` is 30 seconds and timeout is fail-open. After progress
lines are removed, malformed or multiple stdout objects fail JSON parsing and
are treated as no output. Repository-level unknown settings keys are silently
ignored; Braid must still preserve them because later native writes may remove
unknown fields.

The current configuration-directory reference explicitly supports JSONC for
user settings. It says repository-local settings use the repository schema but
does not separately guarantee comment/trailing-comma grammar or lossless
rewrites for `.github/copilot/settings.local.json`. Production ownership must
therefore use path-level comment-preserving edits if live evidence confirms
JSONC, or refuse such input; plain `JSON.parse` plus full-file stringify is not
a safe recommendation.

Prompt-type hooks fire only for new interactive sessions, not resume or `-p`,
and are excluded from the Braid design. Non-interactive `-p` repository hooks
are a separate contract: they are not loaded by default unless repository
trust and the documented prompt-mode repository-hook opt-in are present. No
non-interactive or cloud compatibility is claimed by this gate.

### Live probe result after login

The resumed research ran the required readiness gate before creating another
lifecycle repository. It used an isolated temporary `COPILOT_HOME`, disabled
remote control/export, automatic update, built-in MCPs, custom instructions,
and all tools, accepted folder trust for that session only, and submitted one
minimal text-only request.

The request reached the Copilot model service, then returned this redacted
non-secret error:

> You are not authorized to use this Copilot feature, it requires an
> enterprise or organization policy to be enabled.

The request ID and account identity were not retained. Because the client
error does not identify which policy layer denied access, runtime readiness is
classified exactly as `unknown`, not as organization- or enterprise-specific.
Per the research protocol, lifecycle probing stopped immediately.

The earlier `/env` observation that all four inline hooks were loaded from
`repo settings` remains valid carried-forward config-source evidence, but it
was not misrepresented as a lifecycle or final-stop probe. No new disposable
hook repository, `.github/hooks/*.json`, user-level hook, cloud hook, or Braid
production change was created.

User-state audit: `~/.copilot/config.json` already existed after the user's
login before this resumed probe and remained byte-for-byte and
metadata-identical afterward. `~/.copilot/settings.json` remained absent. The
isolated readiness session and logs, which could contain the harmless prompt,
were deleted; only an ignored redacted readiness summary remains.

Not live-proven: interactive/resumed `sessionStart`, `userPromptSubmitted`,
create/edit/read/bash `postToolUse`, `agentStop` pass or block, an additional
turn, repair-to-pass, repeated-block finiteness, malformed output, nonzero exit,
timeout/orphan cleanup, normal-checkout lifecycle, `-p`, or linked-worktree
behavior.

Growth classification: `blocked`.

Smallest remaining test: enable Copilot CLI in at least one organization that
provides the user's Copilot seat, unless an enterprise policy overrides it;
then rerun readiness. Only after it returns `ready` should the isolated
normal-checkout and linked-worktree lifecycle, continuation, repair, finite
blocking, failure-semantics, ownership, and redacted-fixture probes proceed.

## Carried-forward Codex and Gemini evidence

### OpenAI Codex

Official sources: [hooks](https://learn.chatgpt.com/docs/hooks) and
[advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced).

Repository configuration remains `.codex/hooks.json`. The isolated 0.144.5
probe observed `SessionStart`, `UserPromptSubmit`, `PostToolUse`, and `Stop`.
The first Stop returned `decision: "block"`; Codex produced an additional
agent turn and a second Stop with `stop_hook_active: true`; the subsequent pass
completed. Shell mutation coverage is incomplete upstream, so the final
working-tree scan remains authoritative. Classification: `verified`.

Ownership remains structural and bounded: preserve unknown keys and unrelated
`.codex/hooks.json` groups, identify only the existing fixed Braid command and
status marker, back up and atomically write, make repeated install idempotent,
and remove only exact owned handlers without changing Codex trust.

### Google Gemini CLI

Official sources: [v0.40.0 hooks reference](https://github.com/google-gemini/gemini-cli/blob/v0.40.0/docs/hooks/reference.md),
[configuration](https://github.com/google-gemini/gemini-cli/blob/v0.40.0/docs/reference/configuration.md),
and [trusted folders](https://github.com/google-gemini/gemini-cli/blob/v0.40.0/docs/cli/trusted-folders.md).

Repository configuration remains `.gemini/settings.json`. The isolated 0.40.0
probe observed `SessionStart`, `BeforeAgent`, `AfterTool`, and `AfterAgent`.
An `AfterAgent` deny caused an additional agent turn; the next pass completed.
Project hooks require folder trust, and the final scan remains authoritative
for shell mutations. Classification: `verified`.

Ownership remains structural and bounded: preserve unknown keys and unrelated
`.gemini/settings.json` hooks, use one fixed Braid `name` per native event,
back up and atomically write, make repeated install idempotent, and remove only
exact owned entries without changing folder trust.

## Contract fixtures

No Claude or Copilot contract fixture was committed. Claude's live evidence is
recorded above as a minimal redacted event sequence rather than a native input
payload because this task authorized only this documentation change. Copilot
still failed before a usable lifecycle event.

| Platform            | Required live fixtures                                                                           | Captured | Reason                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------- |
| Claude Code 2.1.212 | `UserPromptSubmit`, Write/Edit `PostToolUse`, Stop pass/block/repeated                           | 0        | live sequence documented; native payloads kept out of repository |
| Copilot CLI 1.0.71  | `sessionStart`, `userPromptSubmitted`, file/shell `postToolUse`, `agentStop` pass/block/repeated | 0        | policy authorization denied before a usable agent lifecycle      |

Private disposable probe material was not committed. A future fixture must
carry platform, exact CLI version, capture date, official event name, and a
redaction note; replace session IDs, usernames, home paths, prompts, and
transcript paths while retaining genuinely observed additive fields.

## Ownership recommendation

These are production design recommendations only; nothing was installed by
this research task.

| Platform    | Exact path                            | Commit status                                        | Braid entry identity                                                                                                                 |
| ----------- | ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Claude Code | `.claude/settings.local.json`         | local-only; refuse install if tracked or not ignored | event + supported `type`, `command`, `args`, timeout, and a fixed Braid `statusMessage`; do not add unsupported owner fields         |
| Copilot CLI | `.github/copilot/settings.local.json` | local-only; refuse install if tracked or not ignored | event + supported `type`, command, timeout, and `env` values `BRAID_GROWTH_HOOK_OWNER`/`BRAID_GROWTH_HOOK_ID`; no unknown `id` field |

For Copilot, the official command-entry fields are `type`, one of
`command`/`bash`/`powershell`, optional `cwd`, `env`, and
`timeoutSec`/`timeout`; some tool events also accept `matcher`. There is no
official `id`, `name`, or `statusMessage`. Stable Braid identity therefore
belongs in supported `env` keys: fixed owner, per-event ID, ownership schema,
and a SHA-256 self-fingerprint. Preserve `disableAllHooks: true` and report
`installed-disabled`; never flip user policy. Hook configuration changes
require a new Copilot session rather than assuming hot reload.

Use the existing Codex installer pattern rather than a new configuration
framework:

1. Resolve the current Git worktree and common repository roots; reject a
   config symlink or resolved path outside the provider's documented root.
   Claude 2.1.211+ uses one ignored main-checkout local settings file across
   worktrees, while Copilot retains the worktree-local recommendation.
2. Parse with a comment-preserving JSONC editor and validate only the
   containers Braid touches. Malformed input or ambiguous duplicate touched
   keys is a no-write error. Preserve comments, trailing commas, unknown keys,
   ordering, and every unrelated setting and hook.
3. Structurally merge one exact Braid command entry per required event.
   Repeated install is idempotent. Exact Braid-owned duplicates may normalize
   to one; lookalikes or conflicting owner signatures are an explicit
   ownership conflict.
4. `--dry-run` returns the capability result and semantic change without
   writing. Status distinguishes missing CLI, unsupported/unready CLI,
   malformed config, conflict, partial install, and ready.
5. Before changing an existing file, write one adjacent content-hash backup.
   Write a same-directory temporary file, reparse it, atomically rename it,
   then verify unrelated entries and exactly one Braid set remain.
6. Record only exact owned entries and fingerprints in the existing proposed
   `.braid/adapters/<platform>.json` manifest shape. Bounded uninstall removes
   only fingerprint-matching Braid entries and prunes only empty containers
   Braid created; it remains available even when the agent CLI is missing.
7. Commands and paths must be repository-relative (`${CLAUDE_PROJECT_DIR}` for
   Claude where applicable) so repository relocation does not embed a home
   path. Status reports a missing Braid launcher or platform CLI; hooks fail
   open visibly and never loop, modify source, write Git state, or use network.

No global settings, trust records, authentication state, `.github/hooks/*.json`,
or unrelated native settings are owned by Braid.

## Recommended v0.6.0 matrix

This is the exact evidence-backed matrix now. The Copilot priority Growth row
remains blocked.

| Platform    | Detection | Growth Mode | Migration   |
| ----------- | --------- | ----------- | ----------- |
| Codex       | Stable    | Stable      | Stable      |
| Claude Code | Stable    | Stable      | Unavailable |
| Gemini CLI  | Stable    | Stable      | Unavailable |
| Copilot CLI | Stable    | Blocked     | Unavailable |

Do not release the full four-platform v0.6.0 from this matrix.

## Production implementation plan

Implementation starts only after the remaining Copilot live gate closes and
the user approves the final four-Stable Growth matrix.

Public boundaries and shared models:

- `packages/core` owns the requested `AgentPlatformId`, serializable platform
  capabilities, and neutral `GrowthLifecycleEvent`/input/decision schemas.
  Reuse `GrowthModeAdapterCompatibility`; do not change migration, recovery,
  benchmark, or proposal schemas.
- `packages/guard` owns the exhaustive registry, native stdin validation and
  stdout translation, capability probes, provider installers, and ownership
  inspection. Reuse `GrowthGuardLifecycle`; no second Growth engine.
- `apps/cli` owns `braid agents` and platform arguments for Growth
  install/status/uninstall, preserving existing Codex aliases and output.
- `packages/migrator` receives only the smallest executor boundary needed to
  keep the current Codex executor unchanged; Claude, Gemini, and Copilot remain
  unavailable migration executors.
- `install.sh` detects the four executables and versions only. It never
  installs, logs in, grants trust, or writes hooks.

Workstream ownership after approval:

1. Lead: core models, registry contract, cross-package exports, and complete
   validation.
2. Provider-separated workstreams: `packages/guard/src/claude/**`,
   `gemini/**`, and `copilot/**`, each with its own focused tests and captured
   fixtures; no overlapping files.
3. Lead integration: CLI commands, installer detection, migration executor
   boundary, distribution, docs, and backward-compatible Codex wiring.

Dependencies are core contracts → independent provider adapters → CLI and
installer integration → full validation. Safety invariants are: bounded stdin,
one native JSON stdout value, stderr-only diagnostics, no prompt/transcript
persistence, no network or Git writes in hooks, authoritative final scan,
Braid-owned finite retries, structural ownership-bounded JSON edits, no global
config/trust/auth changes, and unchanged Codex migration behavior.

After the Copilot gate closes, run one architecture review, one
safety/correctness review, then the required build, typecheck, lint, provider
contract tests, existing Codex Growth/migration/recovery regressions, installer
tests, and distribution validation. Stop for release approval; do not push,
tag, or publish automatically.
