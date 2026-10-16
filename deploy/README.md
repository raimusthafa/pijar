# Deploy Pijar ke VPS

Alur: push ke `master` memicu `.github/workflows/deploy.yml` (tes, build, rilis `build-N-SHA`).
Di VPS, `pijar-updater.timer` mengecek rilis tiap menit, memasang build baru ke
`/var/www/pijar/releases/<tag>`, mengalihkan symlink `current`, merestart `pijar.service`,
lalu memeriksa kesehatan dan kembali ke build sebelumnya bila gagal.

| File | Tujuan di VPS |
|---|---|
| `pijar-update.sh` | `/usr/local/bin/pijar-update` |
| `pijar.service`, `pijar-updater.service`, `pijar-updater.timer` | `/etc/systemd/system/` |
| `pijar.nginx` | `/etc/nginx/sites-available/pijar` (lalu `certbot --nginx -d pijar.syahranfd.site`) |
| `pijar-sudoers` | `/etc/sudoers.d/pijar-deploy` (izin restart satu service) |

Variabel runtime (kunci server) ada di `/etc/pijar.env` pada VPS, tidak pernah di repo:
`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `AI_PROVIDER`, `NEXT_PUBLIC_*`.

Log: `journalctl -u pijar-updater -u pijar -f`.
