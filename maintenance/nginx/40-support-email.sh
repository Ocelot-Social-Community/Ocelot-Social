#!/bin/sh
# Inject the deployment's support address into the built static page, at CONTAINER START.
#
# The page is generated ahead of time and served by nginx, so it has no server to ask — yet the
# address it shows is deployment configuration, exactly like the backend's $SUPPORT_EMAIL (each
# network sets it in its helmfile; no brand archive carries an e-mail). Doing it here rather than via
# a build arg is what keeps that true: the value stays in the helm chart, and no brand repo has to
# thread anything through its own CI. The chart passes it in — see
# deployment/helm/charts/ocelot-social/templates/maintenance/deployment.yaml.
#
# nginx runs everything in /docker-entrypoint.d/*.sh before starting; the 40- prefix puts this after
# the stock 10-/20- scripts. Unset → the vanilla address, so an unconfigured deployment still shows
# something sensible instead of a raw token.
#
# Re-running is harmless: once replaced there is no placeholder left to match. Note this also means a
# `docker restart` with a CHANGED value does not take effect — the container's filesystem layer keeps
# the first substitution. Kubernetes replaces the pod on an env change, so the production path is
# unaffected; locally, recreate the container.
set -eu

PLACEHOLDER='__OCELOT_SUPPORT_EMAIL__' # keep in step with app/constants/emails.ts (guarded by a test)
ROOT="${NGINX_ROOT:-/usr/share/nginx/html}"
EMAIL="${SUPPORT_EMAIL:-devops@ocelot.social}"

# `|` as the sed delimiter: an e-mail address cannot contain one, while `/` and `&` are plausible in
# neither address nor path but cost nothing to avoid.
find "$ROOT" -type f \( -name '*.html' -o -name '*.js' -o -name '*.json' \) \
  -exec sed -i "s|${PLACEHOLDER}|${EMAIL}|g" {} +

echo "[maintenance] support e-mail: ${EMAIL}"
