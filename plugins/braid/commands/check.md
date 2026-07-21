---
description: Run a read-only Braid Growth Mode architecture comparison
allowed-tools: Bash
---

Run `braid growth check --session claude-manual-check --json` in the current project. Label the result clearly as a manual check rather than the active hook session, then summarize pass, warn, or block findings and their actionable repairs. This command is source- and Git-read-only: do not modify source files, the Git index, commits, branches, or worktrees. Braid may update only its worktree-scoped ephemeral Growth Mode state.
