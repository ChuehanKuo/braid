---
description: Verify the Braid CLI, Claude adapter, project, and Growth Mode setup
allowed-tools: Bash
---

Run `command -v braid`, `braid --version`, and `braid growth status --json` from the current project. Report only:

- whether the Braid CLI is available and its version;
- whether Claude Code is within the supported compatibility scope;
- whether this repository is initialized;
- whether Growth Mode is enabled;
- whether the native plugin and manual fallback are installed;
- the exact next command, if action is needed.

Do not install software, initialize Braid, enable Growth Mode, edit architecture policy, or expose absolute home paths and raw session identifiers.
