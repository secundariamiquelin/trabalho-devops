#!/usr/bin/env bash
# Exercises infra/activate-release.sh against a temporary APP_ROOT.
# Runs in CI on Linux (symlinks behave as on the server).
set -euo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/infra/activate-release.sh"
export APP_ROOT KEEP_RELEASES=3
APP_ROOT="$(mktemp -d)"
trap 'rm -rf "$APP_ROOT"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
release() { mkdir -p "$APP_ROOT/releases/$1"; echo "$1" > "$APP_ROOT/releases/$1/index.html"; }
live() { readlink "$APP_ROOT/current"; }

mkdir -p "$APP_ROOT/releases"

release aaaaaaa
bash "$SCRIPT" activate aaaaaaa >/dev/null
[[ "$(live)" == "releases/aaaaaaa" ]] || fail "first activation"

release bbbbbbb
bash "$SCRIPT" activate bbbbbbb >/dev/null
[[ "$(live)" == "releases/bbbbbbb" ]] || fail "second activation"
[[ "$(cat "$APP_ROOT/previous_release")" == "releases/aaaaaaa" ]] || fail "previous not recorded"

bash "$SCRIPT" rollback >/dev/null
[[ "$(live)" == "releases/aaaaaaa" ]] || fail "rollback did not restore the previous release"

if bash "$SCRIPT" activate ccccccc 2>/dev/null; then fail "activated a release that was never uploaded"; fi
[[ "$(live)" == "releases/aaaaaaa" ]] || fail "failed activation changed the live release"

if bash "$SCRIPT" activate '../../etc' 2>/dev/null; then fail "accepted a path as release id"; fi

# Pruning keeps KEEP_RELEASES newest plus the live and previous ones.
for id in 1111111 2222222 3333333 4444444; do release "$id"; sleep 1; bash "$SCRIPT" activate "$id" >/dev/null; done
[[ "$(live)" == "releases/4444444" ]] || fail "last activation"
[[ ! -d "$APP_ROOT/releases/aaaaaaa" ]] || fail "old release was not pruned"
[[ -d "$APP_ROOT/releases/3333333" ]] || fail "previous release was pruned"
count="$(find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d | wc -l)"
[[ "$count" -eq 3 ]] || fail "expected 3 releases after pruning, found $count"

echo "activate-release.sh: all checks passed"
