#!/usr/bin/env bash
set -euo pipefail

# Build the Pro toolkit as an installable Claude Code plugin zip — the file
# uploaded to Freemius as the licensed "Divi 5 Toolkit" add-on download.
#
#   bash tools/build-toolkit-zip.sh [output-dir]
#
# Output: divi5generate-toolkit.zip, containing a single top-level folder
# "divi5generate/" (.claude-plugin/ + skills/ + commands/) — the layout
# `claude plugin marketplace add <unzipped-dir>` expects.
#
# Uses `git archive`, so ONLY committed files ship — no node_modules, no
# untracked cruft, no stray secrets. Commit before building.

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
OUT_DIR="${1:-$HOME/Desktop}"
OUTPUT_ZIP="${OUT_DIR%/}/divi5generate-toolkit.zip"

cd "$REPO_ROOT"

# Sanity: the plugin manifest must be present, or the zip won't install.
if [[ ! -f .claude-plugin/plugin.json ]]; then
  echo "Missing .claude-plugin/plugin.json — run from the toolkit repo." >&2
  exit 1
fi

rm -f "$OUTPUT_ZIP"
git archive --format=zip --prefix=divi5generate/ HEAD \
  .claude-plugin skills commands \
  -o "$OUTPUT_ZIP"

echo "Built: $OUTPUT_ZIP"
unzip -l "$OUTPUT_ZIP" | tail -1
