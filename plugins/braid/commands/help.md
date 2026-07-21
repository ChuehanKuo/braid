---
description: Explain Braid Claude installation, operation, and troubleshooting
---

Explain these Braid Claude workflows concisely:

- preferred native installation: add the `ting10688/Braid` marketplace, then install `braid@braid`;
- run `/braid:setup` and explicitly enable Growth Mode in `.braid/architecture.yaml`;
- use Claude normally; lifecycle hooks run automatically;
- inspect with `/braid:status` or `/braid:check`;
- use `braid growth install claude --dry-run` and `--confirm` only as a repository-local fallback;
- remove the fallback with `braid growth uninstall claude`;
- disable or uninstall the native plugin with Claude's plugin commands;
- after plugin hook changes, use `/reload-plugins` or restart Claude Code.

State that the standalone Braid CLI is required and that the plugin never downloads it or silently enables Growth Mode.
