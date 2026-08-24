// What this application will put in an `href`.
//
// ONE rule for the webapp, used by the form that accepts a value and by the profile card that
// renders it. They disagreed: the card learned to show `mailto:someone@example.org` while the
// form still validated with async-validator's `type: 'url'`, whose pattern requires a `//`
// authority — so a link the card could display could not be saved.
//
// The authority is the backend declaration (FOLLOWABLE_URL in
// backend/src/db/schema/entities/patterns.ts), because that is what the database enforces and
// what the schema audit measures. This is a second implementation of the same rule in a
// package that cannot import from it; followableUrl.spec.js carries the same cases as the
// backend's so the two are compared against one corpus rather than by eye.
//
// Parsed rather than pattern-matched, on purpose. A `^https?://` test also accepts a bare
// `https://`, which has no host to go to, and it says nothing about what a browser does with
// the value. `new URL` answers the question actually being asked.

/**
 * The address of a `mailto:` value, or null for anything else.
 *
 * A single recipient and no query. A mailto may carry `?bcc=`, `?subject=` and `?body=`, and a
 * click then opens the composer with all of it pre-filled — a reader who clicks "write to me"
 * would send a message they never wrote, to recipients they never saw. A comma-separated
 * recipient list is the same trick without the query string.
 */
export const mailAddress = (value) => {
  try {
    const { protocol, pathname, search } = new URL(value)
    if (protocol !== 'mailto:' || search !== '') return null
    const address = decodeURIComponent(pathname)
    const [local, domain, ...rest] = address.split('@')
    const single = rest.length === 0 && Boolean(local) && Boolean(domain) && !address.includes(',')
    return single ? address : null
  } catch {
    return null
  }
}

/** A web address with a host: `https://example.org/x`, `http://example.org`. */
export const webAddress = (value) => {
  try {
    const { protocol, hostname } = new URL(value)
    return (protocol === 'http:' || protocol === 'https:') && hostname !== ''
  } catch {
    // Not a URL at all: `not-a-url`, an empty string, a row from before the rule existed.
    return false
  }
}

/**
 * Whether a browser can follow this value — and, on a public profile, whether it is safe to
 * let it.
 *
 * An ALLOWLIST of schemes, not "a scheme and something after it". Vue does not sanitise an
 * `:href` binding, so `javascript:alert(document.cookie)` bound there runs in the browser of
 * whoever clicks it. `data:`, `vbscript:` and `file:` are the same family. An allowlist is the
 * only form of this rule that cannot be talked around by the next scheme nobody thought of.
 */
export const followable = (value) => webAddress(value) || mailAddress(value) !== null

/**
 * The site's favicon for a value, or null when there is no site to ask.
 *
 * From the ORIGIN, never from the string. Two things a pattern got wrong that a profile page
 * must not get wrong: `https://user:secret@example.org` asked a host called `user` for an icon
 * and carried the secret into an image request, and `https://example.org:8443` had its port
 * dropped, so the icon came from a different origin than the link goes to. `origin` answers
 * "which site is this" the way a browser does.
 *
 * A mail address has no host, so it gets null — the caller shows an envelope instead.
 */
export const faviconFor = (value) => {
  if (mailAddress(value) !== null) return null
  try {
    return `${new URL(value).origin}/favicon.ico`
  } catch {
    return null
  }
}

/**
 * The icon to show when there is no favicon: a chain link for a web address, an envelope for a
 * mail address.
 *
 * Beside `faviconFor` because it answers the other half of the same question. Chosen at the
 * call site instead, the settings list forgot it and showed a chain link next to
 * `mailto:test@test.com` while the profile card showed an envelope — the same value described
 * two ways on two pages.
 */
export const fallbackIconFor = (value) => (mailAddress(value) !== null ? 'envelope' : 'link')
