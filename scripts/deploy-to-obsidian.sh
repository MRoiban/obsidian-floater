#!/usr/bin/env bash

set -euo pipefail

# Deploy this plugin to an Obsidian vault plugin folder.
# Overwrites only built plugin files and leaves local plugin data untouched.
#
# Usage:
#   scripts/deploy-to-obsidian.sh [--skip-build] [--target=/path/to/plugin]
#   scripts/deploy-to-obsidian.sh [/path/to/plugin]

DEFAULT_TARGET_DIR="$HOME/Local/Documents/Palace/.obsidian/plugins/obsidian-floater"
TARGET_DIR="$DEFAULT_TARGET_DIR"
SKIP_BUILD=0

FILES=(
  "main.js"
  "manifest.json"
  "styles.css"
)

for arg in "$@"; do
  case "$arg" in
    --skip-build)
      SKIP_BUILD=1
      ;;
    --target=*)
      TARGET_DIR="${arg#*=}"
      ;;
    *)
      if [[ -n "${arg:-}" ]]; then
        TARGET_DIR="$arg"
      fi
      ;;
  esac
done

echo "Deploying to: $TARGET_DIR"

if [[ "$SKIP_BUILD" -ne 1 ]]; then
  if ! command -v bun >/dev/null 2>&1; then
    if [[ -x /opt/homebrew/bin/bun ]]; then
      BUN=/opt/homebrew/bin/bun
    else
      echo "Error: bun is required to build. Install bun or run with --skip-build." >&2
      exit 1
    fi
  else
    BUN=bun
  fi

  echo "Building plugin with: $BUN run build"
  "$BUN" run build
fi

for file in "${FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Error: required plugin file '$file' not found. Did the build succeed?" >&2
    exit 1
  fi
done

mkdir -p "$TARGET_DIR"

for file in "${FILES[@]}"; do
  cp "$file" "$TARGET_DIR/$file"
done

echo "Deploy complete. Plugin files are now in '$TARGET_DIR'."
