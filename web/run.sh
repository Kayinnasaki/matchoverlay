#!/bin/bash

if [[ -z "${HTTP_AUTH_USER}" || -z "${HTTP_AUTH_PASSWORD}" ]]; then
    echo "HTTP_AUTH_USER and/or HTTP_AUTH_PASSWORD not set. These are required parameters. Exiting."
    exit 1
fi

echo "${HTTP_AUTH_PASSWORD}" | htpasswd -i -c /usr/share/nginx/htpasswd "${HTTP_AUTH_USER}"

export WEBSOCKET_HOST="${WEBSOCKET_HOST:-localhost}"
export SERVER_PROTOCOL="${SERVER_PROTOCOL:-ws}"
export CONTROL_PORT="${CONTROL_PORT:-8082}"
export SCOREBOARD_PORT="${SCOREBOARD_PORT:-8083}"
export SCOREBOARD_URL="${SCOREBOARD_URL:-localhost}"

envsubst < /usr/share/nginx/controls/config-template.js > /usr/share/nginx/controls/config.js
envsubst < /usr/share/nginx/controls/config-template.js > /usr/share/nginx/html-public/config.js

if [[ -z "${NGINX_TLS}" ]]; then
    cp /etc/nginx/nginx-plain.conf /etc/nginx/nginx.conf
else
    cp /etc/nginx/nginx-tls.conf /etc/nginx/nginx.conf
fi

exec /docker-entrypoint.sh "$@"