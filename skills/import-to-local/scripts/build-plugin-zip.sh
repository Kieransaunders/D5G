#!/usr/bin/env bash
# Builds the installable Divi5 Generator plugin zip from the canonical
# unpacked source at plugin/divi5-generator/.
#
# The zip is built on demand rather than committed: the Claude Code plugin
# installer rejects packages that contain a nested .zip. Paths are resolved
# relative to this script (no git required), so it works from an installed
# plugin too. Prints the path to the finished zip on stdout.
#
# If composer and phpunit are available locally, the SEO-adapter test suite
# runs first — a red test aborts the zip build so a broken plugin can't ship.
set -euo pipefail

src="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../plugin/divi5-generator" && pwd)"
[ -d "$src" ] || { echo "source not found: $src" >&2; exit 1; }

# --- Test gate (skip automatically if PHP tooling is unavailable) -------------
if command -v composer >/dev/null 2>&1 && [ -x "$src/vendor/bin/phpunit" ]; then
    echo "Running SEO adapter tests before building zip..." >&2
    if ! ( cd "$src" && vendor/bin/phpunit --colors=never ); then
        echo "ABORT: phpunit suite failed. Plugin zip not built." >&2
        exit 1
    fi
else
    echo "Skipping test gate (composer/phpunit unavailable) — building zip anyway." >&2
fi

dest="${1:-$HOME/Desktop}"
mkdir -p "$dest"
out="$dest/divi5-generator.zip"
rm -f "$out"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
cp -R "$src" "$stage/divi5-generator"

# Exclude dev-only artefacts from the shipped plugin (phpunit, composer vendor/,
# git, OS junk). Tests and the toolchain stay in the source tree for development.
( cd "$stage" && zip -qr "$out" divi5-generator \
    -x "*.DS_Store" \
    -x "*.zip" \
    -x "*/.git/*" \
    -x "*/vendor/*" \
    -x "*/tests/*" \
    -x "*/phpunit.xml" \
    -x "*/composer.json" \
    -x "*/composer.lock" )

echo "$out"
