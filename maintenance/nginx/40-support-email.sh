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
# Same software default as the backend (config/softwareDefaults.ts) — guarded by a test
# against app/constants/emails.ts, which carries it for the paths nginx never sees.
DEFAULT_EMAIL='hello@ocelot.social'
EMAIL="${SUPPORT_EMAIL:-$DEFAULT_EMAIL}"

# Validate BEFORE the value goes anywhere near the page. What it is substituted into is not text: the
# page is prerendered with `ssr: false`, so the runtime config lives in a double-quoted JavaScript
# string inside a <script> block of index.html, and sed writes whatever it is given. A value carrying
# `"` closes that string and one carrying `</script>` closes the block, at which point the rest of it
# is code the visitor's browser runs — on the page that is served when everything else is down. The
# escaping below only ever protected the sed EXPRESSION, never the output.
#
# Those characters are refused outright rather than encoded: an address does not contain them, so
# there is nothing to preserve, and encoding would have to be redone for every context the value lands
# in (JS string, HTML text, href) instead of once, here. `&`, `|`, `\` and `/` are deliberately still
# allowed — a local part may legally carry them, and the escaping below is what makes them survive.
#
# Not fatal, like every other failure here: warn where `kubectl logs` shows it, serve the built-in
# address. This mirrors isSupportAddress() in app/constants/emails.ts, which decides the same question
# for the build-time path — the two accept the same values, and a test asserts it.
#
# grep rather than a `case` glob: the classes below are POSIX regex, which busybox grep gives us,
# whereas character classes inside a shell pattern are not something ash can be relied on for.
LOCAL='[^[:space:][:cntrl:]@"'"'"'`<>]'
LABEL='[^[:space:][:cntrl:]@."'"'"'`<>]'
REJECTED=''
# grep looks at one LINE at a time, so on its own it would accept `ok@example.org\n<anything>` on the
# strength of the first line. An address is one line; anything else is refused before the shape check.
if [ "$(printf '%s' "$EMAIL" | wc -l)" -ne 0 ]; then
  REJECTED='it spans more than one line'
elif ! printf '%s' "$EMAIL" | grep -qE "^${LOCAL}+@${LABEL}+(\.${LABEL}+)+$"; then
  # Covers both halves: a forbidden character, and a domain whose labels are not all non-empty
  # (`example..org`, `example.org.`) — the same shape app/constants/emails.ts accepts.
  REJECTED='it is not shaped like an address'
fi
if [ -n "$REJECTED" ]; then
  # Without echoing the value: it is untrusted by definition here, and this line goes into a log.
  echo "[maintenance] WARNING: ignoring SUPPORT_EMAIL — ${REJECTED}" >&2
  EMAIL=$DEFAULT_EMAIL
fi

# Escape the value before it becomes part of a sed expression. RFC 5322 allows `&`, `|` and `\` in an
# address's local part, and all three are special here: `&` stands for the whole match (so
# `help&team@example.org` would write the PLACEHOLDER back into the page), `|` would close the
# expression, `\` starts an escape. Substituting them for their literal selves is the only way the
# output equals the address.
ESCAPED=$(printf '%s' "$EMAIL" | sed -e 's/[\\&|]/\\&/g')

# *.html ONLY. The token appears in the build in two roles, and just one of them is a value:
#
#   index.html / 200.html / 404.html   window.__NUXT__.config.public.supportEmail — THE VALUE
#   _nuxt/*.js                         a plain string constant in the app bundle
#
# Rewriting both is what broke this page: whatever the bundle compared the runtime config against
# became the configured address too, so the guard fired precisely when the substitution had worked
# and every configured deployment showed the vanilla address. app/constants/emails.ts no longer
# compares against the token — but the bundle is still no place to write a deployment's address into,
# and narrowing this to the file that actually carries the value is what keeps the two independent.
MATCHED=$(find "$ROOT" -type f -name '*.html' -exec grep -lF "$PLACEHOLDER" {} + || true)

if [ -z "$MATCHED" ]; then
  # Not fatal — the page must come up even so, and it then shows the built-in address. But it is the
  # failure mode nothing else reports: the page renders, looks fine, and carries the wrong contact.
  # Nuxt moving the runtime config out of the HTML would land exactly here.
  echo "[maintenance] WARNING: ${PLACEHOLDER} not found under ${ROOT} — serving the built-in address" >&2
else
  printf '%s\n' "$MATCHED" | while IFS= read -r file; do
    sed -i "s|${PLACEHOLDER}|${ESCAPED}|g" "$file"
  done
fi

echo "[maintenance] support e-mail: ${EMAIL}"
