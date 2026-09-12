#!/usr/bin/env bash
# Syncs the markdown documentation from the sibling xtop-cli repos into ./docs.
# Each repo is mirrored keeping its internal structure (README.md + docs/*).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$(dirname "$ROOT")"          # folder containing the sibling checkouts
WEB_DOCS="$ROOT/docs"

REPOS=(xtop api effects extensions layouts plugins widgets)

# Additional per-repo paths (beyond README.md and docs/). Each entry is
# "dest_rel" or "dest_rel:src_rel" when the source lives under a different
# internal folder than the mirror path (e.g. the crate folders inside the
# plugins/layouts/extensions repos).
declare -A EXTRA=(
  [widgets]="custom/README.md"
  [layouts]="custom/README.md:layouts/custom/README.md"
  [plugins]="xtop-plugin-samurai/README.md:plugins/xtop-plugin-samurai/README.md CHANGELOG.md"
  [extensions]="xtop-extension-mcp/README.md:extensions/xtop-extension-mcp/README.md"
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

  for spec in ${EXTRA[$repo]:-}; do
    local dest_rel="${spec%%:*}"
    local src_rel="${spec#*:}"
    [ "$src_rel" = "$spec" ] && src_rel="$dest_rel"
    local target="$SRC/$repo/$src_rel"
    if [ -f "$target" ]; then
      mkdir -p "$(dirname "$dest/$dest_rel")"
      cp "$target" "$dest/$dest_rel"
    fi
  done
}

for repo in "${REPOS[@]}"; do
  sync_repo "$repo"
  echo "✓ $repo"
done

# _home.md is authored here (not synced)
echo "ok — markdown synced into ./docs"
