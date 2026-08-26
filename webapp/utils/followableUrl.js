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
 * Every character ECMAScript's `\s` matches, spelled out — copied from the backend's
 * WHITESPACE, and spelled out for the reason given there: `\s` means something different to
 * Cypher's Java regex engine, so the shorthand would make the two rules disagree about
 * U+00A0 and friends while looking identical.
 */
const WHITESPACE =
  '\\t\\n\\f\\r \\u000b\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff'

/**
 * Whitespace anywhere in the value, which no followable url may carry.
 *
 * Asked of the RAW string, before anything parses it, because parsing is where the character
 * disappears: `new URL` strips whitespace from both ends and encodes it in the middle, so
 * `'https://example.org/a b'` became `/a%20b` and looked clean, and `'mailto:a@example.org '`
 * lost its trailing space entirely. The backend has neither luxury — it matches the string as
 * stored — so both were values this form called valid and the mutation then refused.
 *
 * The settings form trims before it asks, so a reader only ever meets this rule over
 * whitespace in the MIDDLE of a url, which is never a paste artefact and never intended.
 */
const WHITESPACE_ANYWHERE = new RegExp(`[${WHITESPACE}]`)

/**
 * The address inside a `mailto:`. Character for character the backend's MAILTO_ADDRESS, with
 * one addition: `%`.
 *
 * `?` opens the query part of a mailto and `,` separates recipients, so a click on
 * `mailto:someone@example.org?bcc=elsewhere@example.tld` opens a composer with a recipient the
 * reader never saw, and `?subject=`/`?body=` pre-fill a message they never wrote. A dotted
 * domain because `alice@localhost` is not reachable from a public profile.
 *
 * `%` is excluded so that this rule and the backend's read the SAME characters. The backend
 * validates the stored string; this side used to validate `decodeURIComponent(pathname)`, and
 * percent-encoding is exactly where those two views come apart: `mailto:alice@example%2Eorg`
 * was a dotted domain here and an undotted one there, `mailto:alice@example.org%0A` passed
 * both and rendered a label with a newline in it, and `mailto:alice b@example.org` was
 * whitespace to the backend and a legal address here. Rather than teach one side to decode —
 * Cypher cannot — neither side accepts encoded octets, and the two see identical input.
 */
const ADDRESS = new RegExp(
  `^[^@,?%${WHITESPACE}]+@[^@.,?%${WHITESPACE}]+([.][^@.,?%${WHITESPACE}]+)+$`,
)

/**
 * The address of a `mailto:` value, or null for anything else.
 *
 * `new URL` decides the scheme, because a browser's reading of a scheme is the question being
 * asked; the charset above decides where the address ends. Not decoded: the returned string is
 * both the label shown to a reader and the value the backend stored, and those must be the
 * same string.
 */
export const mailAddress = (value) => {
  try {
    const { protocol, pathname } = new URL(value)
    // `?` is looked for in the raw value, not in `search`: `new URL('mailto:a@b.org?')` reports
    // an empty search, while the backend sees a `?` in the string and rejects it. Asking the
    // same question of the same characters is the whole point of this file.
    if (protocol !== 'mailto:' || value.includes('?')) return null
    return ADDRESS.test(pathname) ? pathname : null
  } catch {
    return null
  }
}

/**
 * A web address with a host and no credentials: `https://example.org/x`, `http://example.org`.
 *
 * `https://user:secret@example.org` is refused, and refused HERE rather than cleaned up at
 * render time. The card used to strip the credentials out of the label and the href, which
 * kept the password off the visible page and did nothing about the actual exposure: the
 * profile query asks for `socialMedia { id url }`, so the stored string is serialised into
 * every visitor's page state, and any API-key client reads it verbatim. A value nobody may see
 * is not a rendering problem, so it must not be storable — see FOLLOWABLE_URL in
 * backend/src/db/schema/entities/patterns.ts, which refuses an `@` in the authority, and the
 * migration that strips credentials off the rows written before that rule.
 *
 * Nothing legitimate is lost. Credentials in a url are for machines, and this field publishes
 * a place for PEOPLE to visit; a link that only works with a password is not one a profile can
 * hand to a stranger anyway.
 */
export const webAddress = (value) => {
  try {
    const { protocol, hostname, username, password } = new URL(value)
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      hostname !== '' &&
      username === '' &&
      password === ''
    )
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
export const followable = (value) =>
  !WHITESPACE_ANYWHERE.test(value) && (webAddress(value) || mailAddress(value) !== null)

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
