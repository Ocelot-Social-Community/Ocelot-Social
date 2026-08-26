import { closeDriver, getDriver } from '@db/neo4j'
import { cypherString } from '@db/schema/derive/audit'
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
 * Values a pattern accepts, each marked with `|` where the tricky character is to be injected.
 *
 * The position is DECLARED, not assumed. It used to be index 1 for every sample, and for
 * `FOLLOWABLE_URL` index 1 falls inside the scheme — the `[tT]` of `https`, the `[aA]` of
 * `mailto`. Both engines then reject the value because the scheme no longer spells a scheme,
 * whatever the injected character is, and the comparison degenerates to `false === false`.
 * Every negated class in that pattern went unmeasured: `[^@/?#WS]` in the authority, `[^WS]`
 * in the path, `[^@.,?%WS]` in the mailto address. Those are the classes this file exists for,
 * and the ones a `\s` shorthand would have silently broken.
 *
 * A LIST per pattern, because an alternation has more than one accepting branch and they do
 * not share their character classes: `FOLLOWABLE_URL` excludes `,` and `?` from the mailto
 * address but not from a web address, so one sample would leave the other branch unmeasured —
 * in the half where the classes are narrower and a disagreement is therefore more likely. Same
 * reasoning within a branch, which is why the http samples mark the authority and the path
 * separately: they are different classes.
 *
 * Keyed by the exported constant rather than guessed from the pattern text: a pattern that
 * gets tightened — `URI` became `HTTP_URL`, then `FOLLOWABLE_URL` — would silently
 * fall through to a sample it no longer matches, and every comparison below would degenerate
 * to "false equals false" for a second reason. The self-check in the test turns that into a
 * failure instead.
 */
const SAMPLES = new Map<string, readonly string[]>([
  [SLUG, ['p|eter-pan']],
  [EMAIL, ['some|one@example.org', 'someone@exam|ple.org']],
  // One entry per class the pattern actually has, since each is a separate opportunity for the
  // two engines to disagree.
  [
    FOLLOWABLE_URL,
    [
      'https://exam|ple.org/path', //     authority, [^@/?#WS]
      'https://example.org/pa|th', //     path, [^WS] — wider, and reached only past the first /
      'https://mastodon.social/@us|er', // path after an `@`, which the authority may not carry
      'mailto:some|one@example.org', //   local part, [^@,?%WS]
      'mailto:someone@exam|ple.org', //   domain label, [^@.,?%WS]
    ],
  ],
  [ISO_DATE_TIME, ['2026-08-21T10:00:00.000|Z']],
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

const MARKER = '|'

/**
 * A marked sample as the value it stands for, plus the offset the tricky character goes at.
 *
 * The marker has to be there and has to be alone: a sample that lost it during an edit would
 * otherwise inject at offset -1 or 0 and quietly stop measuring the class it was written for,
 * which is exactly the failure this indirection exists to end.
 */
const placed = (marked: string): { value: string; at: number } => {
  const at = marked.indexOf(MARKER)
  if (at < 0 || marked.includes(MARKER, at + 1)) {
    throw new Error(
      `The sample ${JSON.stringify(marked)} needs exactly one ${MARKER}, marking where the ` +
        `tricky character is injected. Put it inside the character class under test.`,
    )
  }
  return { value: marked.replace(MARKER, ''), at }
}

/** The sample itself, then one variant per tricky character at the marked offset. */
const variantsOf = (marked: string): { character: string; value: string }[] => {
  const { value, at } = placed(marked)
  return [
    { character: 'none — the sample itself', value },
    ...TRICKY.map(([name, character]) => ({
      character: name,
      value: `${value.slice(0, at)}${character}${value.slice(at)}`,
    })),
  ]
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

/**
 * The same question, with the pattern spliced into a Cypher LITERAL — which is how the audit
 * queries carry it, since the runner takes a query string and no parameters.
 */
const matchesInJavaLiteral = async (value: string, pattern: string): Promise<boolean> => {
  const session = getDriver().session()
  try {
    const result = await session.readTransaction((transaction) =>
      transaction.run(`RETURN $value =~ ${cypherString(pattern)} AS matches`, { value }),
    )
    return result.records[0].get('matches') as boolean
  } finally {
    await session.close()
  }
}

afterAll(async () => {
  await closeDriver()
})

describe('a pattern in an audit query means what it meant in the declaration', () => {
  // A third reader, after ajv and Cypher-with-a-parameter: Cypher parsing a string LITERAL. It
  // processes escape sequences before the regex engine sees them, so an interpolated pattern is
  // read twice, and one that survives a single reading can quietly change under two. The audit
  // would then ask a different question and report nothing — the silent half of a wrong answer,
  // which is what this file exists to rule out.
  it.each(patterns().map((entry) => [entry.used, entry.pattern] as const))(
    '%s',
    async (_used, pattern) => {
      for (const sample of samplesFor(pattern)) {
        for (const { value } of variantsOf(sample)) {
          expect({
            value: JSON.stringify(value),
            literal: await matchesInJavaLiteral(value, pattern),
          }).toEqual({
            value: JSON.stringify(value),
            literal: await matchesInJava(value, pattern),
          })
        }
      }
    },
  )
})

describe('every declared pattern reads the same in ajv and in Cypher', () => {
  it.each(patterns().map((entry) => [entry.used, entry.pattern] as const))(
    '%s',
    async (_used, pattern) => {
      // Compiling a pattern that is not a literal is the whole point here — it comes from the
      // declaration, which is the thing under test. The same string is what ajv compiles.
      // eslint-disable-next-line security/detect-non-literal-regexp
      const inJavaScript = new RegExp(pattern)

      for (const marked of samplesFor(pattern)) {
        // The sample itself first: a pattern that rejects its own valid value would make every
        // comparison below trivially "false === false" — and so would an injection point that
        // lands outside the class under test, which is why `variantsOf` declares where it goes.
        const { value: sample } = placed(marked)
        expect({ sample, ajv: inJavaScript.test(sample) }).toEqual({ sample, ajv: true })
        expect({ sample, cypher: await matchesInJava(sample, pattern) }).toEqual({
          sample,
          cypher: true,
        })

        for (const { character, value } of variantsOf(marked)) {
          expect({
            character,
            value: JSON.stringify(value),
            ajv: inJavaScript.test(value),
          }).toEqual({
            character,
            value: JSON.stringify(value),
            ajv: await matchesInJava(value, pattern),
          })
        }
      }
    },
  )
})
