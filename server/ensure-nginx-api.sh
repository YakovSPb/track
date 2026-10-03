#!/usr/bin/env bash
set -euo pipefail

CONF=/etc/nginx/sites-available/track.diabal.ru

if [ ! -f "$CONF" ]; then
  cat > "$CONF" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name track.diabal.ru;
    root /var/www/track.diabal.ru;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3010/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
NGINX
  ln -sfn "$CONF" /etc/nginx/sites-enabled/track.diabal.ru
  exit 0
fi

if grep -q 'location /api/' "$CONF"; then
  exit 0
fi

# Вставить /api/ перед первым location / {
tmp=$(mktemp)
awk '
  BEGIN { done = 0 }
  !done && $0 ~ /^[[:space:]]*location \/ \{/ {
    print "    location /api/ {"
    print "        proxy_pass http://127.0.0.1:3010/;"
    print "        proxy_http_version 1.1;"
    print "        proxy_set_header Host $host;"
    print "        proxy_set_header X-Real-IP $remote_addr;"
    print "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
    print "        proxy_set_header X-Forwarded-Proto $scheme;"
    print "    }"
    print ""
    done = 1
  }
  { print }
' "$CONF" > "$tmp"
mv "$tmp" "$CONF"
