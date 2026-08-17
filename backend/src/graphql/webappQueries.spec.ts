// Reading the webapp sources is the point of this test, and it indexes its own literal
// maps by file path — neither is an injection sink.
/* eslint-disable n/no-sync */
/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-fs-filename */
// A failed parse is exactly the signal this test looks for; the offending file is collected
// and asserted on below rather than swallowed.
/* eslint-disable no-catch-all/no-catch-all */
import fs from 'node:fs'
import path from 'node:path'

import { buildSchema, Kind, parse, Source, validate } from 'graphql'

import { buildAugmentedSdl } from './print-schema'

// Validates the webapp's GraphQL documents against the backend schema.
//
// This exists because of a real outage: removing neo4j-graphql-js also removed the
// arguments it silently added to every @relation field (`filter`, `first`, `offset`,
// `orderBy`). None of them were declared in our .gql files, so nothing in the backend
// noticed — but the webapp sends `comments(orderBy: createdAt_asc)`, and every post page
// started failing with GRAPHQL_VALIDATION_FAILED.
//
// Backend tests could not catch that: they only use backend queries. The contract that
// matters is what the CLIENT sends, so that is what this reads — the actual gql`` templates
// under webapp/, checked against the actual schema.
//
// Kept in the backend on purpose: the schema lives here, so a schema change and its
// verification stay in one commit.

const WEBAPP_ROOT = path.resolve(__dirname, '../../../webapp')
const SEARCH_DIRS = ['graphql', 'components', 'pages', 'store', 'mixins', 'composables']

/**
 * `${…}` inside a template is either a fragment being spliced in (resolved by concatenating
 * everything into one document) or a value inside a string, e.g. `name(lang: "${lang}")`.
 * Blanking both is enough to parse; it is the FIELDS and ARGUMENTS we want to check, not
 * the interpolated values.
 */
const stripInterpolations = (template: string) => template.replace(/\$\{[^}]*\}/g, '')

/**
 * Two webapp documents interpolate an IDENTIFIER rather than a value, so blanking it would
 * silently change what is being validated — `${type}(first: …)` would attach those arguments
 * to whatever field precedes it. Both are enumerated here with their real call sites, so the
 * fields behind them stay covered.
 *
 * A new case of this kind shows up as an unparseable file or a validation error, not as a
 * silent gap.
 */
const IDENTIFIER_INTERPOLATIONS: Record<string, { placeholder: string; values: string[] }> = {
  // User.js:43 restricts `type` to exactly these two.
  'graphql/User.js': { placeholder: '${type}', values: ['following', 'followedBy'] },
}

const collectTemplates = (): { file: string; body: string }[] => {
  const files: string[] = []
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(js|ts|vue)$/.test(entry.name) && !entry.name.includes('.spec.')) files.push(full)
    }
  }
  SEARCH_DIRS.forEach((dir) => {
    walk(path.join(WEBAPP_ROOT, dir))
  })

  const templates: { file: string; body: string }[] = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf-8')
    const relative = path.relative(WEBAPP_ROOT, file)
    const identifiers = IDENTIFIER_INTERPOLATIONS[relative]

    for (const match of source.matchAll(/gql`([\s\S]*?)`/g)) {
      const variants = identifiers
        ? identifiers.values.map((value) => match[1].split(identifiers.placeholder).join(value))
        : [match[1]]

      for (const variant of variants) {
        const body = stripInterpolations(variant)
        if (body.trim()) templates.push({ file: relative, body })
      }
    }
  }
  return templates
}

// graphql/fragments/location.js builds its fragment name AND target type from a parameter
// (`locationOn${type} on ${type}`), so blanking the interpolations leaves invalid syntax.
// It is called with 'User' and 'Group'; both are spelled out here so the fragment — and
// the fields inside it — are still validated.
const PARAMETERISED_FRAGMENTS = ['User', 'Group'].map(
  (type) => `
    fragment locationOn${type} on ${type} {
      locationName
      location { id name(lang: "") lng lat distanceToMe }
    }
  `,
)

describe('webapp GraphQL documents', () => {
  it('are valid against the backend schema', () => {
    const schema = buildSchema(buildAugmentedSdl())
    const templates = collectTemplates()

    // Guard the harness itself: a broken path would make this pass vacuously.
    expect(templates.length).toBeGreaterThan(50)

    const parseable: string[] = []
    const unparseable: string[] = []
    for (const { file, body } of templates) {
      try {
        parse(new Source(body))
        parseable.push(body)

        // signal we want; the file is reported below rather than swallowed.
      } catch {
        unparseable.push(file)
      }
    }

    // Only the parameterised fragment factory may resist parsing; it is supplied above.
    expect([...new Set(unparseable)]).toEqual(['graphql/fragments/location.js'])

    // Validate each OPERATION on its own, with every fragment available. Concatenating the
    // lot would trip over rules that are about a document rather than a query — several
    // webapp operations are anonymous, and only one of those is allowed per document.
    const all = parse(new Source([...parseable, ...PARAMETERISED_FRAGMENTS].join('\n')))
    const fragments = all.definitions.filter((d) => d.kind === Kind.FRAGMENT_DEFINITION)
    const operations = all.definitions.filter((d) => d.kind === Kind.OPERATION_DEFINITION)

    expect(operations.length).toBeGreaterThan(50)

    const messages = new Set<string>()
    for (const operation of operations) {
      const errors = validate(schema, {
        kind: Kind.DOCUMENT,
        definitions: [operation, ...fragments],
      }).filter(
        // Every fragment is in scope for every operation here, so "unused" is expected.
        (error) => !error.message.includes('is never used'),
      )
      for (const error of errors) messages.add(error.message)
    }

    expect([...messages]).toEqual([])
  })
})
