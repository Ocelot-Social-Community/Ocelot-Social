import {
  forLog,
  repair,
  up,
} from '@db/migrations/20260821120000-repair-or-remove-unfollowable-social-media'
import { getDriver } from '@db/neo4j'

jest.mock('@db/neo4j')

// The classification, without a database. What `up` does around it — read, write, delete,
// print — is mechanical; the decision "repair into what, or remove" is where the judgement
// sits, and it is exactly the part that decides whether a user's profile link survives.
//
// NOT beside its subject, which is the convention everywhere else in this repository, because
// `node-migrate` requires EVERY entry that `readdir` returns for --migrations-dir. A spec left
// in there is loaded by the runner, `describe` is not defined outside jest, and `db:migrate up`
// dies before it reaches the first real migration — in the init container, on every deploy.
// Measured, not assumed: `yarn db:migrate list` reproduces it, and a `__tests__/` subdirectory
// does not help, because the loader `require`s the directory entry too. The only fix is to be
// outside that directory, next to migrations-examples, which the runner ignores for the same
// reason.

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
    ['mailto:a@example.org#frag', 'mailto:a@example.org'],
    ['mailto:a@example.org?subject=Hi#frag', 'mailto:a@example.org'],
  ])('drops the fragment of %j', (url, expected) => {
    // A fragment ends an address exactly as a query does. Cutting at `?` alone left these to be
    // deleted rather than repaired, for a part of the value that carries no meaning in a mailto.
    expect(repair(url)).toBe(expected)
  })

  it('removes a mailto whose address is split by a fragment', () => {
    // `mailto:alice#fragment@example.org` has `alice` as its path and the rest as its fragment,
    // so there is no address before the boundary and nothing to repair it into. It used to be
    // accepted by the declaration and silently dropped by the webapp, which is the divergence
    // that put `#` into MAILTO_ADDRESS in the first place.
    expect(repair('mailto:alice#fragment@example.org')).toBeNull()
  })

  it.each([
    ['mailto:someone@example%2Eorg', 'mailto:someone@example.org'],
    ['mailto:some%2Bone@example.org', 'mailto:some+one@example.org'],
  ])('writes %j back decoded', (url, expected) => {
    // The declaration accepts no encoded octets, so these rows violate it — but decoded they
    // are ordinary addresses, and a row that can be written back correctly should be.
    expect(repair(url)).toBe(expected)
  })

  it.each([
    // Decodes to a newline and a space inside the address: still not followable, so the
    // decoded reading earns no reprieve.
    ['mailto:someone@example.org%0A'],
    ['mailto:some%20one@example.org'],
    // Decodes to `a@b@example.org` — two `@`, an address that names nobody.
    ['mailto:a%40b@example.org'],
    // Not an escape sequence at all, so `decodeURIComponent` throws and there is nothing to try.
    ['mailto:someone%@example.org'],
  ])('removes %j, whose decoded reading is no better', (url) => {
    expect(repair(url)).toBeNull()
  })

  it.each([
    // Prefixing `https://` would parse this as user `some one` at host `example.org`: a link to
    // a site the owner never named, carrying what they typed as a credential. The mailto
    // reading is the only honest one, and it fails.
    ['some%20one@example.org'],
    ['user:secret@example.org'],
  ])('removes %j rather than guessing a host out of an address', (url) => {
    // And emphatically not by stripping: `https://` + `user:secret@example.org` parses as a
    // user at `example.org`, so stripping would leave a link to a site the owner never named.
    // Credentials are dropped only from a value that already carried an http(s) scheme.
    expect(repair(url)).toBeNull()
  })

  it.each([
    ['https://user:secret@example.org/profile', 'https://example.org/profile'],
    ['https://user@example.org/x', 'https://example.org/x'],
    ['HTTP://user:secret@example.org', 'http://example.org/'],
  ])('keeps the link in %j and drops the password', (url, expected) => {
    // The card used to strip these at render time, which kept the secret off the visible page
    // and did nothing about the exposure: the profile query returns the raw url, so it reached
    // every visitor's page state and every API client anyway. Removing the row would take the
    // link with it — the site is what the owner meant, only the credentials are not.
    expect(repair(url)).toBe(expected)
  })

  it('leaves an `@` in the path alone, which is how the fediverse writes a profile url', () => {
    // The `@` that matters sits in the AUTHORITY. A rule that cannot tell the two apart would
    // delete half the mastodon links on the instance.
    expect(repair('https://mastodon.social/@user')).toBe('https://mastodon.social/@user')
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

describe('forLog', () => {
  it.each([
    ['https://example.org/profile'],
    ['mailto:someone@example.org'],
    // Not a url, so it has no authority to hide a credential in and no query to carry a bcc —
    // and an operator needs to see exactly this one.
    ['javascript:alert(document.cookie)'],
    ['not-a-url'],
    // The known limit, pinned so it is a decision and not an oversight: without a scheme this
    // cannot be told from a mail address, and redacting it would redact every mailto in the log.
    ['user:secret@example.org/x'],
  ])('passes %j through untouched, so what can be restored still can be', (url) => {
    expect(forLog(url)).toBe(url)
  })

  it.each([
    ['https://user:secret@example.org/x', 'https://example.org/x (credentials removed)'],
    ['mailto:a@example.org?bcc=evil@example.tld', 'mailto:a@example.org (query removed)'],
    [
      'https://user:secret@example.org/x?token=abc',
      'https://example.org/x (credentials and query removed)',
    ],
    // Without a scheme `new URL` refuses the value entirely, and it used to pass through with
    // the token intact — while the same value with `https://` in front was redacted. A boundary
    // is identifiable without parsing.
    ['example.org/x?token=abc', 'example.org/x (query removed)'],
    ['example.org/x#access_token=secret', 'example.org/x (fragment removed)'],
    // A fragment hides a token as well as a query does. Left alone, the note was actively
    // misleading: marked "(query removed)" with the secret two characters further on.
    ['mailto:a@example.org#access_token=secret', 'mailto:a@example.org (fragment removed)'],
    [
      'mailto:a@example.org?bcc=x@y.tld#access_token=secret',
      'mailto:a@example.org (query and fragment removed)',
    ],
    // `new URL` rejects these for the port, so the parser never sees the userinfo. Two of them
    // used to carry a redaction marker with the password still in plain view beside it, which
    // is worse than no marker at all.
    ['https://user:secret@example.org:bad/x', 'https://example.org:bad/x (credentials removed)'],
    [
      'https://user:secret@example.org:bad/x?token=abc',
      'https://example.org:bad/x (credentials and query removed)',
    ],
    [
      'HTTPS://user:secret@example.org:bad/x#frag',
      'HTTPS://example.org:bad/x (credentials and fragment removed)',
    ],
  ])('names what it dropped from %j', (url, expected) => {
    // Named rather than a blanket "redacted": a password in a public field is a burned secret
    // that should be rotated, and that is worth knowing even though the value is not worth
    // keeping. A `?bcc=` is someone else's address, which was never the owner's to publish.
    expect(forLog(url)).toBe(expected)
  })
})

describe('up', () => {
  // One row that survives a repair, one that cannot be repaired and is removed.
  // One repairable row whose query carries a third party's address, and one unrepairable row
  // whose url carries a password. Both are exactly what must not reach a deployment log.
  const rows = [
    { id: 's1', url: 'mailto:a@example.org?bcc=evil@example.tld', owner: 'jenny' },
    { id: 's2', url: 'ftp://user:secret@example.org/pub', owner: 'peter' },
    // Repaired by gaining a scheme, and the repair has no reason to touch the query — so the
    // TARGET still carries the token. That is the half a redaction of the old value misses.
    { id: 's3', url: 'example.org/x?token=abc', owner: 'robin' },
  ]

  let events: string[]

  beforeEach(async () => {
    events = []
    const record = (row: (typeof rows)[number]) => ({
      get: (key: string) => row[key as keyof typeof row],
    })
    const session = {
      readTransaction: async (work: (t: unknown) => unknown) =>
        Promise.resolve(work({ run: () => ({ records: rows.map(record) }) })),
      writeTransaction: async (work: (t: unknown) => unknown) =>
        Promise.resolve(
          work({
            run: (_query: string, parameters: { id: string }) => {
              events.push(`write ${parameters.id}`)
              return { records: [] }
            },
          }),
        ),
      close: async () => Promise.resolve(),
    }
    jest.mocked(getDriver).mockReturnValue({ session: () => session } as never)
    jest.spyOn(console, 'log').mockImplementation((line: string) => {
      events.push(`log ${line.trim()}`)
    })
    await up(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('names a url before the write that destroys it', () => {
    // `down` is empty and promises that an operator can say which link disappeared. Printed
    // after the delete, a run that dies partway through the loop takes user data with it and
    // names nothing. The order is the promise.
    const removal = events.indexOf('write s2')
    const naming = events.findIndex((event) => event.includes('example.org/pub'))
    expect(naming).toBeGreaterThanOrEqual(0)
    expect(naming).toBeLessThan(removal)
  })

  it('names the old value before a repair overwrites it', () => {
    // The quieter half of the same problem: `SET s.url = $url` overwrites the only copy.
    const write = events.indexOf('write s1')
    const naming = events.findIndex((event) => event.includes('mailto:a@example.org'))
    expect(naming).toBeGreaterThanOrEqual(0)
    expect(naming).toBeLessThan(write)
  })

  it('redacts the repaired TARGET as well, not only the old value', () => {
    // Logging the old value redacted and the new one raw put the token in the log anyway, by
    // the other half of the same line.
    const line = events.find((event) => event.includes('example.org/x'))
    expect(line).toBeDefined()
    expect(line).not.toContain('token=abc')
    expect(line).toContain('https://example.org/x (query removed)')
  })

  it('keeps the password and the third party out of the log', () => {
    // A deployment log outlives the row and travels further than the database. Copying a
    // password or someone else's address into it would leave the migration undoing itself —
    // removing the value from the public profile and keeping it somewhere less guarded.
    const log = events.filter((event) => event.startsWith('log ')).join('\n')
    expect(log).not.toContain('secret')
    expect(log).not.toContain('evil@example.tld')
    // Still enough to act on: the owner and the link they lost.
    expect(log).toContain('peter')
    // And the note says WHICH part went. That an account had a password in a public field means
    // the secret is burned and should be rotated — a fact worth logging even though the value
    // is not, and one that "redacted" for both cases would have hidden.
    expect(log).toContain('ftp://example.org/pub (credentials removed)')
    expect(log).toContain('mailto:a@example.org (query removed)')
  })

  it('states the plan before doing any of it', () => {
    // So an interrupted run can be told apart from one that had nothing to do.
    expect(events[0]).toBe('log SocialMedia urls: 3 checked, 2 to repair, 1 to remove')
  })
})
