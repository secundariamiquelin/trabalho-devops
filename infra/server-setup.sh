#!/usr/bin/env bash
# One-time preparation of the Oracle Cloud instance (Ubuntu 24.04).
# Idempotent: running it again re-applies the same state.
#
# Usage, from the folder that holds this script and nginx/2048.conf:
#   sudo bash server-setup.sh "ssh-ed25519 AAAA... github-actions-deploy"
#
# The argument is the PUBLIC half of the key used only by the pipeline.
set -euo pipefail

DEPLOY_PUBKEY="${1:-}"
APP_ROOT=/var/www/2048
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_USER="${SUDO_USER:-ubuntu}"

log() { printf '\n==> %s\n' "$*"; }
die() { echo "server-setup: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run with sudo"
[[ "$DEPLOY_PUBKEY" =~ ^ssh-(ed25519|rsa)\ [A-Za-z0-9+/=]+(\ .*)?$ ]] \
  || die "first argument must be the pipeline's public key (ssh-ed25519 ...)"
[[ -f "$SCRIPT_DIR/nginx/2048.conf" ]] || die "nginx/2048.conf not found next to this script"

log "1/7 Updating the system"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade

log "2/7 Installing only what the app needs"
# nginx: serves the static files. rsync: receives releases from the pipeline.
# unattended-upgrades: security patches without manual login.
# iptables-persistent: keeps the host firewall rules across reboots.
apt-get install -y --no-install-recommends nginx rsync unattended-upgrades iptables-persistent

log "3/7 Creating the deploy user (no password, no sudo)"
if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi
passwd -l deploy >/dev/null
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# "restrict" disables port/agent/X11 forwarding and PTY allocation for this key.
printf 'restrict %s\n' "$DEPLOY_PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

log "4/7 Preparing $APP_ROOT"
install -d -m 755 -o deploy -g deploy "$APP_ROOT" "$APP_ROOT/releases"
if [[ ! -e "$APP_ROOT/current" ]]; then
  install -d -m 755 -o deploy -g deploy "$APP_ROOT/releases/bootstrap"
  cat > "$APP_ROOT/releases/bootstrap/index.html" <<'HTML'
<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><title>Servidor pronto</title>
<h1>Servidor pronto</h1><p>nginx respondendo. O app ainda não foi publicado.</p></html>
HTML
  echo bootstrap > "$APP_ROOT/releases/bootstrap/version.txt"
  chown -R deploy:deploy "$APP_ROOT/releases/bootstrap"
  sudo -u deploy ln -sfn releases/bootstrap "$APP_ROOT/current"
fi

log "5/7 Configuring nginx"
install -m 644 "$SCRIPT_DIR/nginx/2048.conf" /etc/nginx/sites-available/2048
ln -sfn /etc/nginx/sites-available/2048 /etc/nginx/sites-enabled/2048
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload-or-restart nginx

log "6/7 Hardening SSH (keys only, no root, only $ADMIN_USER and deploy)"
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers $ADMIN_USER deploy
EOF
sshd -t
systemctl reload ssh

log "7/7 Host firewall: allow HTTP (80) before the image's final REJECT rule"
# Oracle's Ubuntu images ship iptables rules that accept only SSH and reject the rest.
# The ACCEPT rule must sit above that REJECT, so it is inserted at its position.
if ! iptables -C INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null; then
  reject_line="$(iptables -L INPUT --line-numbers -n | awk '$2 == "REJECT" {print $1; exit}')"
  [[ -n "$reject_line" ]] || die "no REJECT rule in INPUT; review the host firewall by hand"
  iptables -I INPUT "$reject_line" -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT
fi
netfilter-persistent save

systemctl enable --now unattended-upgrades

log "Done. Rules now in effect:"
iptables -L INPUT -n --line-numbers
curl -fsS -o /dev/null -w 'local HTTP check: %{http_code}\n' http://127.0.0.1/
