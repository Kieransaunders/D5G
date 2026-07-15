#!/usr/bin/env bash
set -euo pipefail

# Build a clean WordPress plugin zip for Divi5 Generator.
# Run from the repo root:
#   bash plugin/build-zip.sh
#
# Output: divi5-generator.zip in the repo root.
# The zip contains a single top-level folder "divi5-generator/"
# with the plugin files inside — the format WordPress expects.

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
PLUGIN_DIR="${REPO_ROOT}/plugin/divi5-generator"
OUTPUT_ZIP="${1:-$HOME/Desktop}/divi5-generator.zip"
PACKAGE_DIR="divi5-generator"

if [[ ! -d "$PLUGIN_DIR" ]]; then
  echo "Plugin source not found: $PLUGIN_DIR" >&2
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

rm -f "$OUTPUT_ZIP"

cp -R "$PLUGIN_DIR" "$STAGE/$PACKAGE_DIR"

( cd "$STAGE" && zip -r "$OUTPUT_ZIP" "$PACKAGE_DIR" \
  -x "*.DS_Store" \
  -x "*.zip" \
  -x "*/.git/*" )

echo "Built: $OUTPUT_ZIP"
