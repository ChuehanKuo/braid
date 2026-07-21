#!/bin/sh
set -u

if ! command -v braid >/dev/null 2>&1; then
  printf '%s\n' '{}'
  printf '%s\n' '[braid-growth] Braid CLI is not available on PATH; continuing.' >&2
  exit 0
fi

exec braid growth hook --host claude --source native-plugin
