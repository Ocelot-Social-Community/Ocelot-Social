import {
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

describe('up', () => {
  // One row that survives a repair, one that cannot be repaired and is removed.
  const rows = [
    { id: 's1', url: 'mailto:a@example.org?bcc=evil@example.tld', owner: 'jenny' },
    { id: 's2', url: 'javascript:alert(1)', owner: 'peter' },
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
    // `down` is empty and promises that a removed value is recoverable from the deployment log.
    // Printed after the delete, a run that dies partway through the loop takes user data with it
    // and names nothing. The order is the promise.
    const removal = events.indexOf('write s2')
    const naming = events.findIndex((event) => event.includes('javascript:alert(1)'))
    expect(naming).toBeGreaterThanOrEqual(0)
    expect(naming).toBeLessThan(removal)
  })

  it('names the old value before a repair overwrites it', () => {
    // The quieter half of the same problem: `SET s.url = $url` overwrites the only copy, and a
    // dropped `?bcc=` cannot be reconstructed from the result.
    const write = events.indexOf('write s1')
    const naming = events.findIndex((event) => event.includes('bcc=evil@example.tld'))
    expect(naming).toBeGreaterThanOrEqual(0)
    expect(naming).toBeLessThan(write)
  })

  it('states the plan before doing any of it', () => {
    // So an interrupted run can be told apart from one that had nothing to do.
    expect(events[0]).toBe('log SocialMedia urls: 2 checked, 1 to repair, 1 to remove')
  })
})
