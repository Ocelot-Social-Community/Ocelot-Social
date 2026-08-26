import { fallbackIconFor, faviconFor, followable, mailAddress } from './followableUrl'

// The corpus is deliberately the same as the backend's — the cases in
// backend/src/db/schema/entities/patterns.ts and the migration spec beside it. The two
// packages cannot share code, so they are held together by being asked the same questions.
// A value that only one of them accepts is a link that can be saved and not shown, or shown
// and not saved.

describe('followable', () => {
  it.each([
    ['https://example.org/profile'],
    ['http://example.org'],
    // A browser reads a scheme without regard to case, and `new URL` normalises it.
    ['HTTPS://example.org/profile'],
    ['https://example.org:8443/profile'],
    ['mailto:someone@example.org'],
    ['MAILTO:someone@example.org'],
    ['mailto:first.last@sub.example.co.uk'],
    // The `@` is in the PATH here, not in the authority — which is how half of the fediverse
    // writes a profile url. A credential rule that cannot tell the two apart would delete them.
    ['https://mastodon.social/@user'],
    ['https://example.org/a@b/c'],
  ])('accepts %s', (value) => {
    expect(followable(value)).toBe(true)
  })

  it.each([
    // Vue does not sanitise an `:href`, so these would run in the browser of whoever clicks.
    ['javascript:alert(document.cookie)'],
    ['jaVaScRiPt:alert(1)'],
    ['data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
    ['vbscript:msgbox(1)'],
    ['file:///etc/passwd'],
    ['ftp://example.org/pub'],
    // Right scheme, nothing to go to.
    ['https://'],
    ['http://'],
    ['not-a-url'],
    [''],
    // Query parameters pre-fill a composer the reader never opened.
    ['mailto:someone@example.org?bcc=evil@example.tld'],
    ['mailto:someone@example.org?subject=Hi&body=Please%20pay'],
    ['mailto:a@example.org,b@example.tld'],
    ['mailto:'],
    ['mailto:notanaddress'],
    ['mailto:someone@'],
    // A trailing `?` opens nothing, but `new URL` reports an empty `search` for it while the
    // backend sees the character and rejects the value.
    ['mailto:someone@example.org?'],
    // Percent-encoding, which is where "the decoded address" and "the stored string" came
    // apart. Every one of these was accepted by one side and refused by the other, or — worse
    // — accepted by both and rendered as a label with a newline in it.
    ['mailto:someone@example.org%0A'],
    ['mailto:someone@example.org%20'],
    ['mailto:some%0Aone@example.org'],
    ['mailto:someone@exam%20ple.org'],
    ['mailto:someone@example%2Eorg'],
    ['mailto:some%40one@example.org'],
    ['mailto:some one@example.org'],
    // A domain has to be dotted and both halves present: nothing else is reachable from a
    // public profile, and the backend has always said so.
    ['mailto:someone@localhost'],
    ['mailto:someone@.org'],
    ['mailto:someone@example.'],
    // Credentials, which the card used to strip at render time — while the profile query
    // shipped the raw string to every visitor and every API client regardless. A value nobody
    // may see cannot be a rendering problem; it must not be storable.
    ['https://user:secret@example.org/profile'],
    ['https://user@example.org'],
    ['http://user:secret@example.org'],
    // Whitespace, which `new URL` makes disappear: it strips both ends and encodes the middle,
    // so these looked clean after parsing while the backend matched the string as stored and
    // refused it. The settings form trims before asking, so only the middle ones reach a
    // reader as an error.
    ['https://example.org/a b'],
    ['https://example.org '],
    [' https://example.org'],
    ['mailto:someone@example.org '],
    // Non-breaking space: invisible in the field, and the reason both sides spell their
    // whitespace set out by code point rather than with the `\s` shorthand. Escaped here for
    // the same reason — a reviewer cannot see the difference otherwise.
    ['https://example.org/a\u00a0b'],
  ])('rejects %j', (value) => {
    expect(followable(value)).toBe(false)
  })
})

describe('mailAddress', () => {
  it('returns the address, so a caller can show it as the label', () => {
    expect(mailAddress('mailto:someone@example.org')).toBe('someone@example.org')
  })

  it('returns null for a web address', () => {
    expect(mailAddress('https://example.org')).toBeNull()
  })

  it('returns the address as stored, not a decoded reading of it', () => {
    // The label a reader sees and the value the backend holds have to be one string. Decoding
    // made them two, and the difference was invisible on the page: `%0A` showed as a line break
    // in the label of a link the backend considered fine.
    expect(mailAddress('mailto:someone@example.org%0A')).toBeNull()
  })
})

describe('faviconFor', () => {
  it.each([
    ['https://www.instagram.com/name', 'https://www.instagram.com/favicon.ico'],
    // Lower-cased: the origin comes from the parsed url, which is how a browser reads a scheme.
    ['HTTPS://example.org/profile', 'https://example.org/favicon.ico'],
    // The port is part of the origin — a site on 8443 does not serve its icon on 443.
    ['https://example.org:8443/profile', 'https://example.org:8443/favicon.ico'],
    // Credentials are not, and must not travel in an image request.
    ['https://user:secret@example.org/profile', 'https://example.org/favicon.ico'],
  ])('derives the icon of %s from its origin', (value, expected) => {
    expect(faviconFor(value)).toBe(expected)
  })

  it('has none for a mail address, which has no host to ask', () => {
    expect(faviconFor('mailto:someone@example.org')).toBeNull()
  })

  it('has none for something that is not a url', () => {
    expect(faviconFor('not-a-url')).toBeNull()
  })
})

describe('fallbackIconFor', () => {
  it('is an envelope for a mail address', () => {
    // The settings list showed a chain link next to `mailto:test@test.com` while the profile
    // card showed an envelope: the choice was made at each call site instead of derived, and
    // one of them forgot.
    expect(fallbackIconFor('mailto:someone@example.org')).toBe('envelope')
  })

  it.each([['https://example.org'], ['http://example.org/profile'], ['not-a-url']])(
    'is a chain link for %s',
    (value) => {
      expect(fallbackIconFor(value)).toBe('link')
    },
  )
})
