import { closeDriver, getDriver } from '@db/neo4j'
import { EMAIL, FOLLOWABLE_URL, ISO_DATE_TIME, SLUG } from '@db/schema/entities/patterns'
import { entities } from '@db/schema/index'

// Do the two engines that read our patterns agree?
//
// Every `pattern` in the declaration is compiled twice: by ajv as an ECMAScript regex on the
// write path, and by Cypher's `=~` as a Java regex in the audit queries. Where they disagree,
// the failure is silent and one-sided — a value the write path rejects can be one the audit
// calls clean, so the very rows the audit exists to find are the ones it walks past.
//
// schema.spec.ts forbids the constructs known to differ. That is a guess about which ones
// those are. This asks the server.
//
// Read-only: `RETURN $value =~ $pattern` touches no data, so this spec neither needs nor
// performs a cleanDatabase() and cannot interfere with a suite that does.

/**
 * Characters whose class membership the two engines disagree about, by code point.
 *
 * Spelled as escapes rather than pasted: literally they are invisible or line-breaking, which
 * is exactly how `\s` survived review.
 */
const TRICKY: readonly (readonly [string, string])[] = [
  ['U+0020 SPACE', '\u0020'],
  ['U+0009 TAB', '\u0009'],
  ['U+000A LINE FEED', '\u000a'],
  ['U+000B VERTICAL TAB', '\u000b'],
  ['U+000C FORM FEED', '\u000c'],
  ['U+000D CARRIAGE RETURN', '\u000d'],
  ['U+00A0 NO-BREAK SPACE', '\u00a0'],
  ['U+1680 OGHAM SPACE MARK', '\u1680'],
  ['U+2003 EM SPACE', '\u2003'],
  ['U+2028 LINE SEPARATOR', '\u2028'],
  ['U+2029 PARAGRAPH SEPARATOR', '\u2029'],
  ['U+202F NARROW NO-BREAK SPACE', '\u202f'],
  ['U+205F MEDIUM MATHEMATICAL SPACE', '\u205f'],
  ['U+3000 IDEOGRAPHIC SPACE', '\u3000'],
  ['U+FEFF ZERO WIDTH NO-BREAK SPACE', '\ufeff'],
  // Not whitespace, but the other family of shorthands: `\d` and `\w` are Unicode-aware in
  // one engine and ASCII in the other.
  ['U+0660 ARABIC-INDIC DIGIT ZERO', '\u0660'],
  ['U+00DF LATIN SMALL LETTER SHARP S', '\u00df'],
]

/**
 * Values a pattern accepts, so the injected character has somewhere to sit and a rejection
 * means something.
 *
 * A LIST per pattern, because an alternation has more than one accepting branch and they do
 * not share their character classes: `FOLLOWABLE_URL` excludes `,` and `?` from the mailto
 * address but not from a web address, so one sample would leave the other branch unmeasured —
 * in the half where the classes are narrower and a disagreement is therefore more likely.
 *
 * Keyed by the exported constant rather than guessed from the pattern text: a pattern that
 * gets tightened — `URI` became `HTTP_URL`, then `FOLLOWABLE_URL` — would silently
 * fall through to a sample it no longer matches, and every comparison below would degenerate
 * to "false equals false". The self-check in the test turns that into a failure instead.
 */
const SAMPLES = new Map<string, readonly string[]>([
  [SLUG, ['peter-pan']],
  [EMAIL, ['someone@example.org']],
  // Three, not two: the http branch now has a boundary inside it — no `@` in the authority,
  // any `@` past the first `/`, `?` or `#` — and a sample that never reaches the path would
  // leave the half where a dialect disagreement actually costs something unmeasured.
  [
    FOLLOWABLE_URL,
    ['https://example.org/path', 'https://mastodon.social/@user', 'mailto:someone@example.org'],
  ],
  [ISO_DATE_TIME, ['2026-08-21T10:00:00.000Z']],
])

const samplesFor = (pattern: string): readonly string[] => {
  const known = SAMPLES.get(pattern)
  if (known === undefined || known.length === 0) {
    throw new Error(
      `No sample declared for the pattern ${pattern}. Add one to SAMPLES — a new pattern ` +
        `without one would go unchecked.`,
    )
  }
  return known
}

/** Every distinct pattern in the declaration, with the properties that use it. */
const patterns = (): { pattern: string; used: string }[] => {
  const byPattern = new Map<string, string[]>()
  for (const entity of entities) {
    for (const [property, schema] of Object.entries(entity.properties)) {
      if (schema.pattern === undefined) {
        continue
      }
      byPattern.set(schema.pattern, [
        ...(byPattern.get(schema.pattern) ?? []),
        `${entity.label}.${property}`,
      ])
    }
  }
  return [...byPattern].map(([pattern, used]) => ({ pattern, used: used.join(', ') }))
}

const matchesInJava = async (value: string, pattern: string): Promise<boolean> => {
  const session = getDriver().session()
  try {
    const result = await session.readTransaction((transaction) =>
      transaction.run('RETURN $value =~ $pattern AS matches', { value, pattern }),
    )
    return result.records[0].get('matches') as boolean
  } finally {
    await session.close()
  }
}

afterAll(async () => {
  await closeDriver()
})

describe('every declared pattern reads the same in ajv and in Cypher', () => {
  it.each(patterns().map((entry) => [entry.used, entry.pattern] as const))(
    '%s',
    async (_used, pattern) => {
      // Compiling a pattern that is not a literal is the whole point here — it comes from the
      // declaration, which is the thing under test. The same string is what ajv compiles.
      // eslint-disable-next-line security/detect-non-literal-regexp
      const inJavaScript = new RegExp(pattern)

      for (const sample of samplesFor(pattern)) {
        // The sample itself first: a pattern that rejects its own valid value would make every
        // comparison below trivially "false === false".
        expect({ sample, ajv: inJavaScript.test(sample) }).toEqual({ sample, ajv: true })
        expect({ sample, cypher: await matchesInJava(sample, pattern) }).toEqual({
          sample,
          cypher: true,
        })

        for (const [name, character] of TRICKY) {
          const value = `${sample.slice(0, 1)}${character}${sample.slice(1)}`
          expect({
            character: name,
            value: JSON.stringify(value),
            ajv: inJavaScript.test(value),
          }).toEqual({
            character: name,
            value: JSON.stringify(value),
            ajv: await matchesInJava(value, pattern),
          })
        }
      }
    },
  )
})
