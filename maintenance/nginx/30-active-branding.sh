#!/bin/sh
# Serve the maintenance page of the brand the deployment names, at CONTAINER START.
#
# The page is static and has to come up when the backend is down, so it cannot ask which brand is
# active. A brand repo with several brands therefore bakes one complete page per brand under
# _brands/<id>/ (packages/branding/scripts/lib/maintenance-sites.ts), and this script points nginx at
# the one $OCELOT_ACTIVE_BRANDING names — the same variable the backend and webapp read. Unset, or an
# image that holds a single page: the root page is served, as before.
#
# An admin's runtime choice (the activeBranding policy) cannot reach this page — that lives in the
# database the page is shown without. Pin the brand in the deployment to keep the two in step.
#
# Runs before 40-/41-, but their order does not matter: both rewrite every *.html under the root,
# per-brand pages included. Idempotent: the root line is rewritten to its target on every start, so a
# restart with a different (or no) value takes effect.
set -eu

ROOT="${NGINX_ROOT:-/usr/share/nginx/html}"
CONF="${NGINX_CONF:-/etc/nginx/conf.d/default.conf}"
ID="${OCELOT_ACTIVE_BRANDING:-}"
SITES="${ROOT}/_brands"
TARGET="$ROOT"

if [ -n "$ID" ]; then
  # A brand id only (see BRAND_ID_PATTERN in packages/branding) — never a path out of the sites folder.
  if [ "$(printf '%s' "$ID" | wc -l)" -ne 0 ] ||
    ! printf '%s' "$ID" | grep -qE '^[A-Za-z0-9._-]+$' || [ "$ID" = . ] || [ "$ID" = .. ]; then
    echo "[maintenance] WARNING: ignoring OCELOT_ACTIVE_BRANDING — not a brand id" >&2
  elif [ -f "${SITES}/${ID}/index.html" ]; then
    TARGET="${SITES}/${ID}"
  elif [ -d "$SITES" ]; then
    echo "[maintenance] WARNING: no page for brand '${ID}' (have: $(ls "$SITES" | tr '\n' ' ')) — serving the root page" >&2
  else
    echo "[maintenance] this image holds a single page — OCELOT_ACTIVE_BRANDING '${ID}' has nothing to choose from"
  fi
fi

sed -i "s|^\([[:space:]]*root[[:space:]]\{1,\}\)[^;]*;|\1${TARGET};|" "$CONF"
echo "[maintenance] serving ${TARGET}"
