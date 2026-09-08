#!/usr/bin/env bash
# Syncs the markdown documentation from the sibling xtop-cli repos into ./docs.
# Each repo is mirrored keeping its internal structure (README.md + docs/*).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$(dirname "$ROOT")"          # folder containing the sibling checkouts
WEB_DOCS="$ROOT/docs"

REPOS=(xtop api effects extensions layouts plugins widgets)

# additional per-repo relative paths (beyond README.md and docs/)
declare -A EXTRA=(
  [widgets]="custom/README.md"
  [layouts]="layouts/custom/README.md"
  [plugins]="plugins/xtop-plugin-samurai/README.md"
  [extensions]="extensions/xtop-extension-mcp/README.md"
  [xtop]="ROADMAP.md CHANGELOG.md CONTRIBUTING.md"
)

sync_repo() {
  local repo="$1"
  local dest="$WEB_DOCS/$repo"
  mkdir -p "$dest/docs"

  [ -f "$SRC/$repo/README.md" ] && cp "$SRC/$repo/README.md" "$dest/README.md"

  if [ -d "$SRC/$repo/docs" ]; then
    rm -rf "$dest/docs"
    cp -r "$SRC/$repo/docs" "$dest/docs"
  fi

  for rel in ${EXTRA[$repo]:-}; do
    local target="$SRC/$repo/$rel"
    if [ -f "$target" ]; then
      mkdir -p "$(dirname "$dest/$rel")"
      cp "$target" "$dest/$rel"
    fi
  done
}

for repo in "${REPOS[@]}"; do
  sync_repo "$repo"
  echo "✓ $repo"
done

# _home.md is authored here (not synced)
echo "ok — markdown synced into ./docs"
