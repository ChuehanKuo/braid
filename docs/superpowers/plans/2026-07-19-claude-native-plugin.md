# Claude Code Native Plugin Implementation Plan

> **For Codex:** Follow this plan sequentially. The authenticated `SessionStart` gate in Task 1 must pass before any production implementation task begins.

**Goal:** Deliver an evidence-backed Claude Code 2.1.215 host adapter, native marketplace plugin, repository-local fallback installer, documentation, and upstream pull request without changing the shared Growth Mode policy.

**Architecture:** Parse and translate Claude events in `@braid/guard`, route them to `GrowthGuardLifecycle`, and encode Claude-native responses. The CLI is the single hook bridge. A self-contained plugin and an ownership-bounded local installer are two launch surfaces over that bridge, with deterministic duplicate suppression in worktree-scoped state.

**Stack:** TypeScript 5.8, Node.js 22, Commander, Zod, Vitest, pnpm, Claude Code 2.1.215 plugin CLI.

---

## Task 1: Close the authenticated native-plugin lifecycle gate

**Disposable files only:** `/private/tmp/braid-claude-*`

1. Create a minimal disposable Git repository and local development plugin containing a hook recorder for `SessionStart`, `UserPromptSubmit`, relevant `PostToolUse`, and `Stop`.
2. Run `claude plugin validate --strict` against the disposable plugin.
3. Launch authenticated Claude with `--plugin-dir`, `-p`, `--no-session-persistence`, bounded turns/spend, and no unsafe permission flags.
4. Prove `SessionStart` is delivered, then prove one controlled TypeScript cycle causes Stop block, an additional turn, repair, and final allow.
5. Repeat bounded blocking, passing-first-stop, malformed output, nonzero exit, timeout, missing command, linked-worktree, disable, and duplicate-hook probes.
6. Retain only redacted counts/order/outcomes; delete all prompts, responses, transcripts, raw payloads, session identifiers, and disposable repositories.
7. If `SessionStart` cannot be proven through a native plugin, stop with `claude-native-plugin-blocked` and do not continue.

## Task 2: Preserve the research and design history

**Files:**

- Modify: `docs/agent-compatibility.md`
- Add: `docs/superpowers/specs/2026-07-19-claude-native-plugin-design.md`
- Add: `docs/superpowers/plans/2026-07-19-claude-native-plugin.md`

1. Update the compatibility report with the Claude Code 2.1.215 native-plugin evidence and distinguish it from the earlier 2.1.212 settings-hook evidence.
2. Remove any claim broader than the tested local CLI/version/OS scope.
3. Run `pnpm exec prettier --check` for the three documents and `git diff --check`.
4. Commit the research/design artifacts with the required co-author footer.

## Task 3: Add the Claude host protocol using TDD

**Files:**

- Add: `packages/guard/src/claude/contracts.ts`
- Add: `packages/guard/src/claude/protocol.ts`
- Add: `packages/guard/src/claude/capabilities.ts`
- Add: `packages/guard/test/claude-protocol.test.ts`
- Add: `packages/guard/test/claude-capabilities.test.ts`
- Modify: `packages/guard/src/index.ts`
- Modify: `apps/cli/src/commands/growth.ts`
- Modify: `apps/cli/src/index.ts`
- Modify: `apps/cli/test/growth.test.ts`

1. Write failing tests for all verified payloads, relevant/irrelevant tools, SessionStart context, Stop allow/block, malformed input, stdout validity, stderr separation, redaction, disabled/non-Braid operation, and Codex backward compatibility.
2. Add strict Zod schemas that select only required Claude fields and discard sensitive fields.
3. Translate events to `GrowthGuardLifecycle`; do not implement architecture policy in the adapter.
4. Add `growth hook --host <codex|claude> --source <native-plugin|manual>` while retaining the existing no-option Codex behavior.
5. Probe Claude 2.1.215 capability as an exact supported version with bounded process execution and redacted output.
6. Run the new tests, existing Codex protocol tests, CLI Growth tests, typecheck, and lint.

## Task 4: Implement deterministic duplicate suppression using TDD

**Files:**

- Add: `packages/guard/src/claude/duplicate-store.ts`
- Add: `packages/guard/test/claude-duplicate-store.test.ts`
- Modify: `packages/guard/src/claude/protocol.ts`
- Modify: `packages/guard/src/state-store.ts`

1. Write failing tests for native/manual duplicates in both arrival orders, different sessions/events/worktrees/fingerprints, stale records, and concurrent writes.
2. Store only hashes and non-sensitive enums in the repository's existing worktree-scoped Braid state area.
3. Make native-plugin authoritative; make a duplicate manual result non-blocking and include the exact uninstall remediation.
4. Ensure duplicate detection is deterministic and does not rely only on timing or hook order.
5. Run focused and full guard tests.

## Task 5: Add the ownership-safe manual Claude installer using TDD

**Files:**

- Add: `packages/guard/src/claude/installer.ts`
- Add: `packages/guard/test/claude-installer.test.ts`
- Modify: `apps/cli/src/commands/growth.ts`
- Modify: `apps/cli/src/index.ts`
- Modify: `apps/cli/test/growth.test.ts`

1. Write failing tests for fresh install, dry-run, confirmation, idempotency, unrelated settings, malformed JSON, ambiguous ownership, symlinks/path escape, backups, atomic failure, linked worktrees, uninstall/reinstall, duplicate warning, and zero global mutations.
2. Resolve Claude's verified repository-root `.claude/settings.local.json`, including linked-worktree common-root behavior.
3. Structurally merge only Braid-owned hooks with explicit `manual` source arguments; preserve unrelated fields byte-semantically where possible.
4. Add `growth install claude` and `growth uninstall claude` CLI commands and human/JSON output.
5. Run installer and CLI tests plus Codex installer regressions.

## Task 6: Package and validate the native marketplace plugin

**Files:**

- Add: `.claude-plugin/marketplace.json`
- Add: `plugins/braid/.claude-plugin/plugin.json`
- Add: `plugins/braid/hooks/hooks.json`
- Add: `plugins/braid/scripts/run-growth-hook.sh`
- Add: `plugins/braid/commands/setup.md`
- Add: `plugins/braid/commands/status.md`
- Add: `plugins/braid/commands/check.md`
- Add: `plugins/braid/commands/help.md`
- Add: `scripts/verify-claude-plugin.mjs`
- Add: `test/claude-plugin.test.ts`
- Modify: `package.json`

1. Write a failing repository validation test for schemas, names, relative paths, executable launchers, command discovery, absence of symlinks, and canonical version consistency.
2. Add the marketplace and self-contained plugin using only official 2.1.215-supported fields.
3. Make the launcher require `braid` on `PATH`, pass `--host claude --source native-plugin`, and never install/download anything.
4. Implement diagnostic command prompts that expose no identity, tokens, raw sessions, prompts, transcripts, or home paths.
5. Add `plugin:verify` and run both the deterministic validator and `claude plugin validate --strict`.
6. Use isolated plugin configuration to test marketplace add/install/list/details/enable/disable/update/uninstall/reinstall and fresh-session hook/command discovery.

## Task 7: Complete status, documentation, and the reasoning artifact

**Files:**

- Modify: `README.md`
- Modify: `docs/agent-compatibility.md`
- Modify: `docs/growth-mode.md`
- Modify: `docs/installation.md`
- Add: `docs/native-agent-plugins.md`
- Add: `docs/explainers/2026-07-19-claude-native-plugin.md`
- Modify: `apps/cli/src/commands/growth.ts`
- Modify: `apps/cli/test/growth.test.ts`

1. Extend status output with Claude version, compatibility, native/manual installation, duplicate remediation, project initialization, enabled state, and available session status without sensitive values.
2. Document only commands proven by isolated installation. State native preference, manual fallback, explicit Growth Mode enablement, exact support scope, reload/restart behavior, and no web/cloud-agent claim.
3. Explain the adapter boundary, ownership model, duplicate algorithm, rejected alternatives, and live evidence in the reasoning artifact.
4. Run Prettier, documentation link/path checks where available, typecheck, and CLI tests.

## Task 8: Run full verification and safety review

1. Run `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
2. Run `pnpm plugin:verify`, `pnpm distribution:build`, `pnpm distribution:verify`, and relevant installer/benchmark regression commands.
3. Repeat the authenticated installed-plugin lifecycle in normal checkout and linked worktree.
4. Verify manual/native duplicate behavior, disabled mode, uninstall/reinstall, malformed input, timeout, missing CLI, incompatible version, already-passing state, process cleanup, no global settings mutation, and sensitive-data redaction.
5. Inspect `git diff --check`, tracked files, executable bits, and `git status`; review every changed file for scope and secrets.
6. Record baseline/environment failures separately and fix only regressions introduced by this branch.

## Task 9: Commit, push, remote-smoke, and open the PR

1. Configure `origin` as Arthur's fork and retain `upstream` as `ting10688/braid`; verify both URLs before writes.
2. Commit implementation and documentation in reviewable commits with the required co-author footer; add files by explicit path.
3. Push only `feat/v0.6-claude-native-plugin` to `origin` without force.
4. If supported, test remote marketplace installation from the pushed branch/ref in isolated configuration; otherwise record `pending-after-merge-remote-marketplace-smoke`.
5. Open a PR against `ting10688/braid:research/v0.6-agent-gates` with the required summary, verified lifecycle, tests, scope, duplicate behavior, and limitations.
6. Verify the PR URL/base/head and report branch, commit SHAs, exact test evidence, and cleanup status.
