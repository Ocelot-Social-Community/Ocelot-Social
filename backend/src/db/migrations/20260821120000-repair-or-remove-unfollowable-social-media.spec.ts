import { repair } from './20260821120000-repair-or-remove-unfollowable-social-media'

// The classification, without a database. What `up` does around it — read, write, delete,
// print — is mechanical; the decision "repair into what, or remove" is where the judgement
// sits, and it is exactly the part that decides whether a user's profile link survives.

describe('repair', () => {
  it.each([
    ['https://example.org/profile'],
    ['http://example.org'],
    ['HTTPS://example.org/profile'],
    ['mailto:someone@example.org'],
    ['MAILTO:someone@example.org'],
  ])('leaves %s untouched', (url) => {
    expect(repair(url)).toBe(url)
  })

  it.each([
    ['  https://example.org  ', 'https://example.org'],
    ['\thttps://example.org\n', 'https://example.org'],
  ])('trims %j', (url, expected) => {
    expect(repair(url)).toBe(expected)
  })

  it.each([
    // A url without a scheme was never followable: an href without one is RELATIVE, so this
    // pointed at <instance>/mastodon.social/@user.
    ['mastodon.social/@user', 'https://mastodon.social/@user'],
    ['www.example.org', 'https://www.example.org'],
    ['example.org/path/to/profile', 'https://example.org/path/to/profile'],
  ])('gives %j the scheme the field is for', (url, expected) => {
    expect(repair(url)).toBe(expected)
  })

  it.each([
    ['someone@example.org', 'mailto:someone@example.org'],
    ['first.last@sub.example.co.uk', 'mailto:first.last@sub.example.co.uk'],
  ])('turns the bare address %j into a mailto', (url, expected) => {
    // Decided BEFORE the https branch: `https://someone@example.org` parses as a url whose
    // USERNAME is `someone` and whose host is `example.org` — a valid address pointing
    // somewhere the owner never meant.
    expect(repair(url)).toBe(expected)
  })

  it.each([
    ['mailto:a@example.org?bcc=evil@example.tld', 'mailto:a@example.org'],
    ['mailto:a@example.org?subject=Hi&body=Please%20pay', 'mailto:a@example.org'],
  ])('drops the query of %j', (url, expected) => {
    expect(repair(url)).toBe(expected)
  })

  it.each([
    ['javascript:alert(document.cookie)'],
    ['jaVaScRiPt:alert(1)'],
    ['data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
    ['vbscript:msgbox(1)'],
    ['file:///etc/passwd'],
    ['ftp://example.org/pub'],
  ])('removes %s rather than guessing at it', (url) => {
    expect(repair(url)).toBeNull()
  })

  it.each([
    ['https://'],
    ['http://'],
    [''],
    ['   '],
    ['not-a-url'],
    // A host without a dot is not an address on the public internet, and `new URL` accepts it
    // happily — the dot is what separates a repairable row from a hopeless one.
    ['localhost/profile'],
    ['mailto:'],
    ['mailto:notanaddress'],
    ['mailto:someone@'],
    // Several recipients are the bcc trick without the query string.
    ['mailto:a@example.org,b@example.tld'],
  ])('removes %j, which cannot be repaired into anything', (url) => {
    expect(repair(url)).toBeNull()
  })

  it('is idempotent: repairing a repaired value changes nothing', () => {
    // What makes the migration safe to re-run — and what `up` relies on when it compares the
    // result against the stored value to decide whether to write at all.
    for (const url of ['mastodon.social/@user', 'someone@example.org', 'mailto:a@b.org?x=1']) {
      const once = repair(url)
      expect(once).not.toBeNull()
      expect(repair(once as string)).toBe(once)
    }
  })
})
