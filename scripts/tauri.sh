#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "build" ]]; then
  CI=true exec tauri "$@"
fi

exec tauri "$@"
