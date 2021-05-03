#!/bin/bash

if [[ ! -z "${WEBSOCKET_TLS}" ]]; then
    export PRIVATE_KEY_PATH="${PRIVATE_KEY_PATH:-/usr/src/app/node.key}"
    export CERTIFICATE_PATH="${CERTIFICATE_PATH:-/usr/src/app/node.crt}"
fi

envsubst < config-template.js > config.js

exec "$@"