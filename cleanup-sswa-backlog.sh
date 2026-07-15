#!/usr/bin/env bash
# cleanup-sswa-backlog.sh — archive the shipped spec-first-generation change.
# Run from the repo root on your Mac:  bash cleanup-sswa-backlog.sh
# Safe to re-run; each step guards itself. Delete this script when done.
set -euo pipefail

CHANGE="spec-first-generation"
DATE="2026-07-06"
SRC="openspec/changes/$CHANGE"
DST="openspec/changes/archive/$DATE-$CHANGE"
SPEC_DIR="openspec/specs/$CHANGE"

echo "==> Preflight"
[ -d .git ] || { echo "ERROR: run from the repo root"; exit 1; }
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ERROR: you have uncommitted tracked changes — commit or stash first."
  git status --short --untracked-files=no
  exit 1
fi

echo "==> Switching to main and pulling"
git checkout main
git pull

if [ ! -d "$SRC" ]; then
  if [ -d "$DST" ]; then
    echo "Already archived at $DST — skipping sync/move."
  else
    echo "ERROR: $SRC not found on main. Was the change folder in PR #17?"
    exit 1
  fi
else
  echo "==> Syncing delta spec into openspec/specs/ (all-ADDED, new capability)"
  mkdir -p "$SPEC_DIR"
  sed -e '1s/^# spec-first-generation$/# Spec-First Generation/' \
      -e '/^## ADDED Requirements$/d' \
      "$SRC/specs/$CHANGE/spec.md" > "$SPEC_DIR/spec.md"

  echo "==> Moving change folder to archive"
  mkdir -p "openspec/changes/archive"
  git mv "$SRC" "$DST"

  echo "==> Committing and pushing"
  git add "$SPEC_DIR" "$DST"
  git commit -m "chore(sswa): archive $CHANGE — sync spec into openspec/specs/"
  git push
fi

echo "==> Deleting the shipped branch (squash-merged in PR #17, so -D is expected)"
git branch -D "sswa/$CHANGE" 2>/dev/null || echo "  local branch already gone"
git push origin --delete "sswa/$CHANGE" 2>/dev/null || echo "  remote branch already gone"

echo "==> Pruning stale worktrees"
git worktree prune
git worktree list

echo ""
echo "==> Done. Still open (NOT touched by this script):"
echo "  - add-frontend-design-tokens: 14/15 tasks, branch only merged into"
echo "    sswa/divi56-knowledge-gap, NOT main. Open task 5.3 = manual smoke-launch"
echo "    of the app UI. Needs /sswa:verify (PR to main) then /sswa:archive."
echo "  - sswa/divi56-knowledge-gap: your previous checkout, work in flight."
echo "  - sswa/theme-builder-import: merged into divi56-knowledge-gap only."
echo "  - untracked docs/Marketing/ files on the old branch."
echo "You are now on main — ready for /sswa:propose add-doctor-command."
