#!/usr/bin/env bash
# Switches the live release on the server. Runs as the "deploy" user, invoked by
# the GitHub Actions workflow over SSH:
#
#   ssh deploy@host 'bash -s' -- activate <sha> < infra/activate-release.sh
#   ssh deploy@host 'bash -s' -- rollback       < infra/activate-release.sh
#
# Layout under APP_ROOT (default /var/www/2048):
#   releases/<sha>/      one directory per deployed commit (uploaded by rsync)
#   current -> releases/<sha>   what nginx serves
#   previous_release     target of "current" before the last activation
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/2048}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

die() { echo "activate-release: $*" >&2; exit 1; }

# Atomic switch: create the new link beside the old one, then rename over it.
point_current_to() {
  ln -sfn "$1" "$APP_ROOT/current.new"
  mv -Tf "$APP_ROOT/current.new" "$APP_ROOT/current"
}

prune_old_releases() {
  local live previous
  live="$(readlink "$APP_ROOT/current")"
  previous="$(cat "$APP_ROOT/previous_release" 2>/dev/null || true)"
  find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' \
    | sort -rn | awk -v keep="$KEEP_RELEASES" 'NR > keep {print $2}' \
    | while IFS= read -r old; do
        [[ "releases/$old" == "$live" || "releases/$old" == "$previous" ]] && continue
        rm -rf -- "$APP_ROOT/releases/$old"
      done
}

activate() {
  local sha="$1"
  [[ "$sha" =~ ^[0-9a-f]{7,40}$ ]] || die "invalid release id: '$sha'"
  [[ -f "$APP_ROOT/releases/$sha/index.html" ]] || die "release $sha was not uploaded"

  if [[ -L "$APP_ROOT/current" ]]; then
    readlink "$APP_ROOT/current" > "$APP_ROOT/previous_release"
  fi
  point_current_to "releases/$sha"
  prune_old_releases
  echo "activate-release: live release is now $sha"
}

rollback() {
  local previous
  previous="$(cat "$APP_ROOT/previous_release" 2>/dev/null || true)"
  [[ -n "$previous" && -d "$APP_ROOT/$previous" ]] || die "no previous release to roll back to"
  point_current_to "$previous"
  echo "activate-release: rolled back to $previous"
}

case "${1:-}" in
  activate) activate "${2:-}" ;;
  rollback) rollback ;;
  *) die "usage: activate <sha> | rollback" ;;
esac
