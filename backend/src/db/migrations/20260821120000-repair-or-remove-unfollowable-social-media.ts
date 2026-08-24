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
  a trace is the wrong default even when the value was nonsense.

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
 * The repaired value, or null when there is nothing to repair it into.
 *
 * Candidates in order, first one the declaration accepts wins. The order is the whole logic:
 * `someone@example.org` prefixed with `https://` parses as a url whose USERNAME is `someone`
 * and whose host is `example.org` — a valid address pointing somewhere the owner never meant.
 * So the mail reading is offered first. And `mastodon.social/@user` has to reach the https
 * candidate even though it contains an `@`, which an if/else on "has an @" gets wrong.
 */
const hasDottedHost = (candidate: string): boolean => {
  try {
    return new URL(candidate).hostname.includes('.')
    // eslint-disable-next-line no-catch-all/no-catch-all -- the question IS "does this parse"
  } catch {
    // `new URL` signals "not a url" the only way it can. There is no other error to let past.
    return false
  }
}

export const repair = (value: string): string | null => {
  const trimmed = value.trim()
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)
  const candidates: string[] = [trimmed]

  if (scheme?.[1].toLowerCase() === 'mailto') {
    // A mailto carrying more than an address: keep the address, drop the rest.
    candidates.push(`mailto:${trimmed.slice('mailto:'.length).split('?')[0]}`)
  }
  if (!scheme) {
    // Typed without a scheme — either an address or a host.
    candidates.push(`mailto:${trimmed}`, `https://${trimmed}`)
  }

  for (const candidate of candidates) {
    if (!followable.test(candidate)) {
      continue
    }
    // A host without a dot (`localhost`, `not-a-url`) is not an address on the public
    // internet, and `new URL` accepts it happily — so the dot is what separates a repairable
    // row from a hopeless one. Only asked of the guessed https form: a stored `http://intranet`
    // was written deliberately and is none of this migration's business.
    if (candidate === `https://${trimmed}` && !hasDottedHost(candidate)) {
      continue
    }
    return candidate
  }

  return null
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

    for (const { id, to } of repaired) {
      await session.writeTransaction((transaction) =>
        transaction.run('MATCH (s:SocialMedia {id: $id}) SET s.url = $url', { id, url: to }),
      )
    }
    for (const { id } of removed) {
      await session.writeTransaction((transaction) =>
        transaction.run('MATCH (s:SocialMedia {id: $id}) DETACH DELETE s', { id }),
      )
    }

    /* eslint-disable no-console */
    console.log(
      `SocialMedia urls: ${String(rows.length)} checked, ${String(repaired.length)} repaired, ` +
        `${String(removed.length)} removed`,
    )
    for (const { from, to } of repaired) {
      console.log(`  repaired ${JSON.stringify(from)} -> ${JSON.stringify(to)}`)
    }
    for (const { owner, url } of removed) {
      // The owner's slug, so this is actionable: someone can tell them what is gone.
      console.log(`  removed  ${owner}: ${JSON.stringify(url)}`)
    }
    /* eslint-enable no-console */
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  // Deliberately empty. The previous state was "some urls a browser must not follow", which is
  // not a state worth reconstructing — and the removed rows are printed by `up`, so the values
  // are recoverable from the deployment log if anyone needs them.
  await Promise.resolve()
}
