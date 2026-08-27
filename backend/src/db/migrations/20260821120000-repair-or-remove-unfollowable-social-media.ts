import { getDriver } from '@db/neo4j'
import { FOLLOWABLE_URL } from '@db/schema/entities/patterns'

import type { Session } from 'neo4j-driver'

export const description = `
  Bring every SocialMedia.url in line with the declaration: repair what can be repaired,
  remove what cannot.

  The url used to be validated with neode's Joi \`uri: true\`, which asked only whether the
  value had a scheme. It accepted \`javascript:alert(document.cookie)\`, \`data:text/html;…\`,
  \`vbscript:\` and \`file:///etc/passwd\` — and the webapp renders this field as
  \`<a :href="link.url">\` on a PUBLIC profile, where Vue does not sanitise an href binding. The
  declaration now allows http, https and mailto (see entities/patterns.ts), so rows written
  under the old rule can violate it.

  Leaving them and filtering at render time was the alternative. It was rejected because the
  profile card is not the only reader: API-key clients read User.socialMedia raw, and every
  future reader would have to re-derive the same rule. The data is the one thing they share.
  A permanently failing audit is the other cost — a check that is always red teaches people to
  ignore it.

  WHAT IS REPAIRED

    "  https://x.org "         trimmed
    "mastodon.social/@user"    -> https://mastodon.social/@user
    "someone@example.org"      -> mailto:someone@example.org
    "mailto:a@b.org?bcc=…"     -> mailto:a@b.org

  A url without a scheme was never followable: an href without one is a RELATIVE link, so
  clicking it went to <instance>/mastodon.social/@user. These rows were broken long before this
  rule existed; prefixing the scheme is a repair, not a cleanup.

  WHAT IS REMOVED

  Everything else: any other scheme, a scheme with no host, an empty value, anything that is
  not an address. Each removal is printed with the owner's slug and the old value, so an
  operator can tell the person what disappeared from their profile. Removing user data without
  a trace is the wrong default even when the value was nonsense. The printed value has its
  credentials and its query string stripped (see forLog): a deployment log outlives the row and
  travels further than the database, and keeping a password or someone else's address there
  would undo half of what this migration is for.

  Every repaired value is checked against the declaration BEFORE it is written, and removed
  instead if it still fails. The migration therefore cannot leave behind a row that the schema
  audit would flag afterwards.

  Idempotent: a second run finds nothing to do.
`

// The declaration's own rule, compiled once. Not a copy of it: a second spelling here would be
// free to drift from the one the write path and the audit use, and this migration exists to
// make the data agree with THAT rule.
// eslint-disable-next-line security/detect-non-literal-regexp -- FOLLOWABLE_URL is a constant
const followable = new RegExp(FOLLOWABLE_URL)

/**
 * Whether a value we GUESSED a scheme for really names a host on the public internet.
 *
 * Two ways the guess goes wrong, both of which `new URL` accepts without complaint:
 *
 *   localhost/profile          no dot, so not a name anything outside this machine resolves
 *   a b@example.org            parses as user `a b` at host `example.org` — the value is an
 *                              address that failed to become a mailto, and prefixing `https://`
 *                              turns it into a link to a site the owner never named, carrying
 *                              what they typed as a credential
 *
 * Only asked of the guessed form. A stored `http://intranet` was written deliberately and is
 * none of this migration's business.
 */
const namesAPublicHost = (candidate: string): boolean => {
  try {
    const { hostname, username, password } = new URL(candidate)
    return hostname.includes('.') && username === '' && password === ''
    // eslint-disable-next-line no-catch-all/no-catch-all -- the question IS "does this parse"
  } catch {
    // `new URL` signals "not a url" the only way it can. There is no other error to let past.
    return false
  }
}

/**
 * The readings of a mailto address: as written, and — if it carries percent-encoding — decoded.
 *
 * The declaration accepts no encoded octets (see MAILTO_ADDRESS), because a regex cannot decode
 * and the webapp's parser does, so the two would disagree about what they are reading. That
 * makes `mailto:someone@example%2Eorg` a violation, but not a hopeless one: decoded it is an
 * ordinary address, and a row that can be written back correctly should be, not deleted. The
 * decoded reading still has to pass the declaration on its own — `%0A` decodes to a newline and
 * gets no reprieve from this.
 */
const readings = (address: string): string[] => {
  const asWritten = `mailto:${address}`
  if (!address.includes('%')) {
    return [asWritten]
  }
  try {
    return [asWritten, `mailto:${decodeURIComponent(address)}`]
    // eslint-disable-next-line no-catch-all/no-catch-all -- the question IS "does this decode"
  } catch {
    // A lone `%` is not an escape sequence. There is nothing to decode and nothing to repair.
    return [asWritten]
  }
}

/**
 * The same url without its credentials, or null when it carries none.
 *
 * `https://user:secret@example.org/x` names a site the owner meant; only the credentials do not
 * belong on a public profile. Removing the row would take the link away too, so the secret is
 * dropped and the link kept. `toString()` normalising the rest — a trailing slash, a lower-cased
 * scheme — is acceptable here precisely because this value is being rewritten anyway.
 *
 * Offered only for a value that already carried an http(s) scheme. In the GUESSED branch the
 * same shape means the opposite: `some one@example.org` with `https://` in front parses as a
 * user at `example.org`, and stripping would leave a link to a site the owner never named. That
 * one is refused by namesAPublicHost instead.
 */
const withoutCredentials = (candidate: string): string | null => {
  try {
    const parsed = new URL(candidate)
    if (parsed.username === '' && parsed.password === '') {
      return null
    }
    parsed.username = ''
    parsed.password = ''
    return parsed.toString()
    // eslint-disable-next-line no-catch-all/no-catch-all -- the question IS "does this parse"
  } catch {
    // `new URL` signals "not a url" the only way it can. There is no other error to let past.
    return null
  }
}

/**
 * The repaired value, or null when there is nothing to repair it into.
 *
 * Candidates in order, first one the declaration accepts wins. The order is the whole logic:
 * `someone@example.org` prefixed with `https://` parses as a url whose USERNAME is `someone`
 * and whose host is `example.org` — a valid address pointing somewhere the owner never meant.
 * So the mail reading is offered first. And `mastodon.social/@user` has to reach the https
 * candidate even though it contains an `@`, which an if/else on "has an @" gets wrong.
 */
export const repair = (value: string): string | null => {
  const trimmed = value.trim()
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)
  const candidates: string[] = [trimmed]

  if (scheme?.[1].toLowerCase() === 'mailto') {
    // A mailto carrying more than an address: keep the address, drop the rest. Both boundaries,
    // not just `?` — a fragment ends an address the same way a query does, and cutting at only
    // one of them left `mailto:a@b.org#frag` to be deleted rather than repaired.
    const address = trimmed.slice('mailto:'.length).split(/[?#]/)[0]
    candidates.push(...readings(address))
  }
  if (scheme !== null && ['http', 'https'].includes(scheme[1].toLowerCase())) {
    // A link with a password in it: keep the link, drop the password.
    const stripped = withoutCredentials(trimmed)
    if (stripped !== null) {
      candidates.push(stripped)
    }
  }
  if (!scheme) {
    // Typed without a scheme — either an address or a host.
    candidates.push(...readings(trimmed), `https://${trimmed}`)
  }

  for (const candidate of candidates) {
    if (!followable.test(candidate)) {
      continue
    }
    if (candidate === `https://${trimmed}` && !namesAPublicHost(candidate)) {
      continue
    }
    return candidate
  }

  return null
}

/**
 * A stored value in a form fit for a deployment log: no credentials, no query.
 *
 * The log outlives the row, and it is a different sink — shipped to an aggregator, kept longer,
 * readable by more people than the database. Two things in these values must not make that
 * trip. A password (`https://user:secret@example.org`, and `ftp://user:secret@…` on the removal
 * path, which no repair rescues) is a secret whatever else is true of it. A `?bcc=` carries
 * addresses of THIRD parties, who never chose to publish anything.
 *
 * Both were already readable by anyone: this field is published on a public profile and any API
 * client reads it verbatim. So this is not a fresh leak — it is about not keeping a copy of the
 * value in a second place after the migration removed it from the first, which would leave the
 * migration undoing itself.
 *
 * The rest is kept, because the log has a job: `down` is deliberately empty and points here, and
 * an operator telling someone what disappeared from their profile needs to name the link. Scheme,
 * host and path do that; a password does not. Note what this costs and what it does not: a value
 * carrying neither reaches the log unchanged, which is most of them, so what can be restored
 * still can be. What is dropped is what must never be restored — putting a password back on a
 * public profile is not a recovery, and putting a `?bcc=` back is restoring the attack.
 *
 * The note NAMES what went, rather than saying "redacted" for both. That an account had a
 * password in a public field is itself worth knowing — it means the secret is burned and should
 * be rotated — and that fact belongs in the log even though the value does not.
 */
export const forLog = (value: string): string => {
  try {
    const parsed = new URL(value)
    const dropped: string[] = []
    if (parsed.username !== '' || parsed.password !== '') {
      dropped.push('credentials')
    }
    if (parsed.search !== '') {
      dropped.push('query')
    }
    if (parsed.hash !== '') {
      // A fragment is a place to hide a token as much as a query is, and leaving it made the
      // note actively misleading: `mailto:a@example.org?bcc=…#access_token=secret` was logged
      // as "(query removed)" with the secret still in plain view two characters further on.
      dropped.push('fragment')
    }
    if (dropped.length > 0) {
      parsed.username = ''
      parsed.password = ''
      parsed.search = ''
      parsed.hash = ''
      return `${parsed.toString()} (${dropped.join(' and ')} removed)`
    }
    // eslint-disable-next-line no-catch-all/no-catch-all -- the question IS "does this parse"
  } catch {
    // Falls through to the textual pass below. `new URL` is the better reader when it can read
    // the value at all, and a value without a scheme is one it cannot.
  }
  // A query is identifiable without parsing, and a value that `new URL` refuses can still carry
  // one: `example.org/x?token=abc` is what a user types without a scheme, and it reached the log
  // untouched while the same value with `https://` in front was redacted.
  //
  // KNOWN LIMIT, stated rather than half-solved: a credential in a schemeless value —
  // `user:secret@example.org/x` — is not detected here. Textually it cannot be told from
  // `mailto:someone@example.org`, since both are `something:something@something`, and a rule
  // that caught the first would redact every mail address in the log. `new URL` does tell them
  // apart, and above it does; it just reads `user:` as the scheme, which leaves the password in
  // the path rather than in the credential slot. The realistic shape a browser would follow —
  // and the one this field collects — carries a scheme, and that one is covered.
  const boundary = value.search(/[?#]/)
  if (boundary < 0) {
    return value
  }
  // Named after the boundary character, and everything past it goes — a fragment may itself
  // contain a `?` and a query a `#`, so one name for the cut is the honest description.
  const part = value.startsWith('?', boundary) ? 'query' : 'fragment'
  return `${value.slice(0, boundary)} (${part} removed)`
}

interface Row {
  id: string
  url: string
  owner: string
}

const load = async (session: Session): Promise<Row[]> => {
  const result = await session.readTransaction((transaction) =>
    transaction.run(`
      MATCH (socialMedia:SocialMedia)
      OPTIONAL MATCH (socialMedia)-[:OWNED_BY]->(owner:User)
      RETURN socialMedia.id AS id, socialMedia.url AS url, owner.slug AS owner
    `),
  )
  return result.records.map((record) => ({
    id: String(record.get('id')),
    url: String(record.get('url') ?? ''),
    owner: String(record.get('owner') ?? 'no owner'),
  }))
}

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    const rows = await load(session)
    const repaired: { id: string; from: string; to: string }[] = []
    const removed: Row[] = []

    for (const row of rows) {
      const fixed = repair(row.url)
      if (fixed === row.url) {
        continue
      }
      if (fixed === null) {
        removed.push(row)
      } else {
        repaired.push({ id: row.id, from: row.url, to: fixed })
      }
    }

    /* eslint-disable no-console */
    // Every value is printed BEFORE the write that destroys it, and in the present tense.
    //
    // `down` is empty and justifies itself with these lines: what was removed is recoverable
    // from the deployment log. That promise only holds if the line exists before the value
    // stops existing. Printed afterwards, a run that dies partway through the loop — a lost
    // connection, a killed pod — would have deleted rows it never named, and the data would be
    // gone without a trace. Which is the one outcome the note above about telling people what
    // disappeared from their profile is meant to prevent.
    //
    // A repair is the same problem in a quieter form: `SET s.url = $url` overwrites the only
    // copy of the old value, and a dropped `?bcc=` cannot be reconstructed from the result.
    //
    // The counts go first because they are known before any write — they describe the plan, so
    // an interrupted run can be told apart from one that had nothing to do.
    console.log(
      `SocialMedia urls: ${String(rows.length)} checked, ${String(repaired.length)} to repair, ` +
        `${String(removed.length)} to remove`,
    )

    for (const { id, from, to } of repaired) {
      console.log(`  repairing ${JSON.stringify(forLog(from))} -> ${JSON.stringify(forLog(to))}`)
      await session.writeTransaction((transaction) =>
        transaction.run('MATCH (s:SocialMedia {id: $id}) SET s.url = $url', { id, url: to }),
      )
    }
    for (const { id, owner, url } of removed) {
      // The owner's slug, so this is actionable: someone can tell them what is gone.
      console.log(`  removing ${owner}: ${JSON.stringify(forLog(url))}`)
      await session.writeTransaction((transaction) =>
        transaction.run('MATCH (s:SocialMedia {id: $id}) DETACH DELETE s', { id }),
      )
    }

    console.log(`SocialMedia urls: done`)
    /* eslint-enable no-console */
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  // Deliberately empty. The previous state was "some urls a browser must not follow", which is
  // not a state worth reconstructing — and the removed rows are printed by `up`, so an operator
  // can tell the owner which link disappeared. Not verbatim: the printed form drops credentials
  // and the query string, which is the trade this makes on purpose. Restoring a password onto a
  // public profile is not a recovery anyone should want.
  await Promise.resolve()
}
