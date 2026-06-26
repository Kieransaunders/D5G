#!/bin/bash
# deploy.sh — sync plugin source to a Local WP installation
#
# Target resolution (first hit wins):
#   1. explicit arg:        ./deploy.sh /path/to/wp-content/plugins/divi-tools-importer
#   2. the RUNNING site:    auto-detected from Local's live nginx — the site you
#                           QA against, so it's the right default almost always.
#   3. any installed copy:  falls back to the first Local site with the plugin.
#
# Usage: ./deploy.sh [/path/to/local-wp/plugins/divi-tools-importer]

set -e

SRC="$(cd "$(dirname "$0")" && pwd)"

# ─── Resolve the running Local WP site's plugin dir (nginx-run dir → site root) ─
running_local_plugin_dir() {
  local line run_id conf_dir root plugin
  line="$(ps -ax -o command= | grep '[n]ginx: master' | head -1)" || return 1
  run_id="$(printf '%s\n' "$line" | grep -oE 'Local/run/[^/ ]+' | head -1 | sed 's|Local/run/||')"
  [ -n "$run_id" ] || return 1
  conf_dir="$HOME/Library/Application Support/Local/run/$run_id/conf/nginx"
  [ -f "$conf_dir/site.conf" ] || return 1
  root="$(grep -m1 -E '^[[:space:]]*root[[:space:]]+"' "$conf_dir/site.conf" \
    | sed -E 's/.*root[[:space:]]+"([^"]+)".*/\1/')"
  plugin="$root/wp-content/plugins/divi-tools-importer"
  [ -d "$plugin" ] && printf '%s' "$plugin" || return 1
}

# ─── Fallback: first Local site (on disk) that has the plugin installed ─────────
first_local_plugin_dir() {
  local s
  for s in "$HOME/Local Sites"/*/; do
    [ -d "${s}app/public/wp-content/plugins/divi-tools-importer" ] || continue
    printf '%s' "${s}app/public/wp-content/plugins/divi-tools-importer"
    return 0
  done
  return 1
}

if [ -n "$1" ]; then
  DEST="$1"
elif DEST="$(running_local_plugin_dir)"; then
  echo "Auto-detected RUNNING Local site as target."
elif DEST="$(first_local_plugin_dir)"; then
  echo "No Local site detected as running — using first installed copy."
else
  echo "Error: no deploy target found." >&2
  echo "Pass one explicitly:  ./deploy.sh /path/to/wp-content/plugins/divi-tools-importer" >&2
  exit 1
fi

if [ ! -d "$DEST" ]; then
  echo "Error: destination not found: $DEST" >&2
  echo "Usage: ./deploy.sh [/path/to/wp-content/plugins/divi-tools-importer]" >&2
  exit 1
fi

rsync -av --delete \
  --exclude='.git' \
  --exclude='deploy.sh' \
  --exclude='dev-watch.sh' \
  --exclude='*.log' \
  "$SRC/" "$DEST/"

echo ""
echo "✓ Deployed to: $DEST"
