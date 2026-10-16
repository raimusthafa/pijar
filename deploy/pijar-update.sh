#!/usr/bin/env bash
# Menarik rilis build terbaru dari GitHub dan memasangnya. Dijalankan oleh pijar-updater.timer sebagai user deploy.
set -euo pipefail

REPO="raimusthafa/pijar"
APP_DIR="/var/www/pijar"
SERVICE="pijar"
HEALTH_URL="http://127.0.0.1:3200/"
KEEP=3

cd "$APP_DIR"
mkdir -p releases
exec 9>"$APP_DIR/.update.lock"
flock -n 9 || exit 0

release_json=$(curl -fsSL -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$REPO/releases?per_page=10")
read -r tag url < <(printf '%s' "$release_json" | python3 -c '
import json,sys
for r in json.load(sys.stdin):
    if r["tag_name"].startswith("build-") and not r["draft"]:
        for a in r["assets"]:
            if a["name"] == "pijar-standalone.tar.gz":
                print(r["tag_name"], a["browser_download_url"]); raise SystemExit
' || true)

[ -n "${tag:-}" ] || exit 0
current=$(cat "$APP_DIR/.release" 2>/dev/null || true)
[ "$tag" != "$current" ] || exit 0

echo "[$(date -Is)] deploying $tag"
dest="$APP_DIR/releases/$tag"
rm -rf "$dest"; mkdir -p "$dest"
curl -fsSL "$url" -o "$APP_DIR/.download.tgz"
tar -xzf "$APP_DIR/.download.tgz" -C "$dest"
rm -f "$APP_DIR/.download.tgz"

previous=$(readlink -f "$APP_DIR/current" 2>/dev/null || true)
ln -sfn "$dest" "$APP_DIR/current.new"
mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
sudo -n /bin/systemctl restart "$SERVICE"

for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)
  if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
    echo "$tag" > "$APP_DIR/.release"
    echo "[$(date -Is)] $tag healthy (HTTP $code)"
    ls -1dt "$APP_DIR"/releases/* | tail -n +$((KEEP + 1)) | xargs -r rm -rf
    exit 0
  fi
  sleep 2
done

echo "[$(date -Is)] $tag failed health check, rolling back" >&2
if [ -n "$previous" ] && [ -d "$previous" ]; then
  ln -sfn "$previous" "$APP_DIR/current.new"
  mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
  sudo -n /bin/systemctl restart "$SERVICE"
fi
echo "$tag" > "$APP_DIR/.failed-release"
exit 1
