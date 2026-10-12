#!/bin/sh
# Make the page's og:image absolute, at CONTAINER START.
#
# Link previews (Discord, Facebook, X, the messengers) need og:image as an absolute URL and do not
# resolve a relative one against the page. The origin is deployment configuration — the chart passes
# CLIENT_URI=https://<domain>, the same value the backend and webapp get — but the page is built once
# per brand, so the build writes a token in front of the image path and this script replaces it. See
# app/constants/clientUri.ts, and 40-support-email.sh for the same pattern.
#
# Unset → the token is replaced with nothing, so the path stays relative: no preview image, exactly
# as before, but nothing broken either. Re-running is harmless, as there is no token left to match.
set -eu

PLACEHOLDER='__OCELOT_CLIENT_URI__' # keep in step with app/constants/clientUri.ts (guarded by a test)
ROOT="${NGINX_ROOT:-/usr/share/nginx/html}"
ORIGIN="${CLIENT_URI:-}"

# An ORIGIN, nothing more: scheme, host, optional port. The value lands in an HTML attribute, so
# anything beyond these characters — a quote, `<`, a space — is refused rather than escaped. One
# trailing slash is tolerated and dropped, because the image path that follows starts with one.
ORIGIN="${ORIGIN%/}"
if [ -n "$ORIGIN" ] && {
  [ "$(printf '%s' "$ORIGIN" | wc -l)" -ne 0 ] ||
    ! printf '%s' "$ORIGIN" | grep -qE '^https?://[A-Za-z0-9.-]+(:[0-9]+)?$'
}; then
  # Without echoing the value: it is untrusted by definition here, and this line goes into a log.
  echo "[maintenance] WARNING: ignoring CLIENT_URI — it is not an origin like https://example.org" >&2
  ORIGIN=''
fi

# *.html only: the static head config is rendered into the prerendered pages (index/200/404.html) and
# does not reach the client bundle. The value is plain (validated above), so it needs no escaping for
# sed — it cannot contain the `|` delimiter, `&` or `\`.
MATCHED=$(find "$ROOT" -type f -name '*.html' -exec grep -lF "$PLACEHOLDER" {} + || true)

if [ -z "$MATCHED" ]; then
  # Not fatal — the page must come up regardless. A brand whose OG image is an external URL has no
  # token to replace, so this is not necessarily a fault.
  echo "[maintenance] ${PLACEHOLDER} not found under ${ROOT} — nothing to make absolute" >&2
else
  printf '%s\n' "$MATCHED" | while IFS= read -r file; do
    sed -i "s|${PLACEHOLDER}|${ORIGIN}|g" "$file"
  done
fi

echo "[maintenance] client uri: ${ORIGIN:-<unset, og:image stays relative>}"
