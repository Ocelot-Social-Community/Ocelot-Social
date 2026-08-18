// Reading the webapp sources is the point of this test, and it indexes its own literal map
// by filter key — neither is an injection sink.
/* eslint-disable n/no-sync */
/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'

import { buildSchema, Kind } from 'graphql'

import { buildSchemaSdl } from './print-schema'
import { postFilterToCypher } from './resolvers/helpers/postFilter'

import type { InputObjectTypeDefinitionNode } from 'graphql'

// Post filters the webapp sends, against the schema that must declare them and the
// translation that must understand them.
//
// The companion of webappQueries.spec.ts, covering the gap that one structurally cannot see.
// It validates the client's DOCUMENTS, but a filter travels as a VARIABLE VALUE — `filter:
// $filter` parses and validates no matter what the object inside eventually contains.
// Coercion against `_PostFilter` happens per request, at runtime, in production.
//
// That gap already cost us: `_PostFilter` was hand-written during the neo4j-graphql-js
// migration from the operators the resolver implements, while the library had GENERATED it
// from the type's relations. Three the webapp actually sends were left out — `tags_some`
// (the start page's hashtag filter) and `comments_some` / `shoutedBy_some` (the profile
// tabs) — so those requests failed on variable coercion. Same shape as the `orderBy` outage:
// what was verified was what the schema DECLARED, not what the client SENDS.
//
// Scope, stated plainly: this collects keys carrying a filter operator SUFFIX (`_some`,
// `_in`, `_gte`, …). Suffix-free relation filters like `author` are not caught — their names
// collide with ordinary object keys throughout a Vue codebase, and the noise would drown the
// signal. The suffixed operators are the class that broke here.

const WEBAPP_ROOT = path.resolve(__dirname, '../../../webapp')
const SEARCH_DIRS = ['graphql', 'components', 'pages', 'store', 'mixins', 'composables']

const OPERATOR_SUFFIX =
  /\b([a-zA-Z][a-zA-Z0-9]*_(?:some|none|every|single|in|not_in|not|gte|lte|gt|lt|contains|starts_with|ends_with))\s*:/g

/**
 * Operator keys the webapp uses that belong to some OTHER input than `_PostFilter`, and so
 * are not expected to be declared on it.
 *
 * Deliberately explicit. Deriving this by intersecting with `_PostFilter` would defeat the
 * purpose — a missing field would silently drop out of the comparison, which is precisely
 * the bug this test exists to catch. Adding an entry here is a decision someone has to make.
 */
const BELONGS_TO_ANOTHER_INPUT: Record<string, string> = {
  followedBy_some: '_PostAuthorFilter — nested under `author`',
  emotion_in: '_PostEMOTEDFilter — nested under `emotions_some`',
}

/**
 * A representative value per filter, supplying the SHAPE the operator expects, which the key
 * alone does not carry. Every key found in the webapp must appear here (asserted below), so
 * a newly used filter cannot pass by having no fixture.
 */
const FILTER_FIXTURES: Record<string, unknown> = {
  id_in: ['p1'],
  id_not_in: ['p2'],
  language_in: ['de'],
  postType_in: ['Article'],
  eventStart_gte: '2026-01-01T00:00:00.000Z',
  eventEnd_gte: '2026-01-01T00:00:00.000Z',
  categories_some: { id_in: ['c1'] },
  emotions_some: { emotion_in: ['funny'] },
  tags_some: { id: 'hashtag' },
  comments_some: { author: { id: 'u1' } },
  shoutedBy_some: { id: 'u1' },

  // Suffix-free filters the webapp also sends. The extraction above cannot find these — the
  // names are ordinary object keys — so they are listed by hand, from reading the call sites:
  // pages/profile/…/_slug.vue (author.id, and author.followedBy_some via store/posts.js) and
  // pages/groups/…/_slug.vue (group.id).
  author: { id: 'u1' },
  group: { id: 'g1' },
}

/**
 * Filters a WRAPPER rewrites before postFilterToCypher ever sees them, so they must be
 * declared on `_PostFilter` but would be rejected by the translation.
 *
 * `postsInMyGroups` is a client-facing flag; filterPostsOfMyGroups turns it into the
 * `inGroupsOf` operator, which carries the viewer whose memberships decide the answer.
 */
const TRANSLATED_BY_A_WRAPPER = ['postsInMyGroups']

/**
 * Fails with the actual cause rather than "expected >= N, received 0".
 *
 * The sources live OUTSIDE this package, and the backend test image only contains `backend/`.
 * Without the read-only `./webapp:/webapp` mount from docker-compose.test.yml the reader finds
 * nothing, and every count-based assertion below then reports a number instead of the reason.
 */
const assertWebappReadable = () => {
  if (!fs.existsSync(WEBAPP_ROOT)) {
    throw new Error(
      `Webapp sources not found at ${WEBAPP_ROOT}. This spec reads the CLIENT's files to ` +
        'check them against the schema. In Docker they arrive through the read-only mount ' +
        'in docker-compose.test.yml (`./webapp:/webapp:ro`); locally the repository checkout ' +
        'provides them.',
    )
  }
}

const readSources = (): string[] => {
  assertWebappReadable()
  const files: string[] = []
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full)
        // Webapp SPECS are read too, deliberately: store/posts.js assembles its filter
        // dynamically, so those operator names never appear as literals in the production
        // source — its spec is where the concrete shape is written down. Reading production
        // files alone finds 6 of the 11 operators actually sent.
      } else if (/\.(vue|js|ts)$/.test(entry.name)) {
        files.push(fs.readFileSync(full, 'utf8'))
      }
    }
  }
  for (const dir of SEARCH_DIRS) walk(path.join(WEBAPP_ROOT, dir))
  return files
}

/** The fields `_PostFilter` declares — read from the schema, not copied from it. */
const postFilterFields = (): Set<string> => {
  const definition = buildSchema(buildSchemaSdl()).getType('_PostFilter')?.astNode as
    InputObjectTypeDefinitionNode | undefined
  if (definition?.kind !== Kind.INPUT_OBJECT_TYPE_DEFINITION) {
    throw new Error('_PostFilter not found in the schema')
  }
  return new Set(definition.fields?.map((field) => field.name.value) ?? [])
}

/** Every suffixed operator key appearing anywhere in the webapp sources. */
const operatorsUsedByWebapp = (): string[] => {
  const found = new Set<string>()
  for (const source of readSources()) {
    for (const match of source.matchAll(OPERATOR_SUFFIX)) found.add(match[1])
  }
  return [...found].sort()
}

describe('post filters used by the webapp', () => {
  const used = operatorsUsedByWebapp()
  const expectedOnPostFilter = used.filter((key) => !(key in BELONGS_TO_ANOTHER_INPUT))

  it('finds filter operators in the webapp sources', () => {
    // Guards the reader itself: a moved directory or a changed extension would empty the
    // list, and every assertion below would pass by checking nothing.
    expect(used.length).toBeGreaterThanOrEqual(10)
    expect(used).toEqual(expect.arrayContaining(['tags_some', 'comments_some', 'shoutedBy_some']))
  })

  it('declares every operator the webapp sends on _PostFilter', () => {
    // The failing direction is invisible from the backend: the document validates, and the
    // request dies on variable coercion once a user opens the page.
    const declared = postFilterFields()
    const undeclared = expectedOnPostFilter.filter((key) => !declared.has(key))

    expect(undeclared).toEqual([])
  })

  it('has a fixture for every operator the webapp sends', () => {
    const withoutFixture = expectedOnPostFilter.filter((key) => !(key in FILTER_FIXTURES))

    expect(withoutFixture).toEqual([])
  })

  it('declares every hand-listed filter on _PostFilter', () => {
    // Covers the suffix-free filters the extraction cannot see. They are checked here rather
    // than trusted, because they fail exactly like the three that broke: schema-valid
    // document, request rejected during variable coercion.
    const declared = postFilterFields()
    const undeclared = [...Object.keys(FILTER_FIXTURES), ...TRANSLATED_BY_A_WRAPPER].filter(
      (key) => !declared.has(key),
    )

    expect(undeclared).toEqual([])
  })

  it.each(Object.keys(FILTER_FIXTURES))('translates %s to Cypher', (key) => {
    const { where, params } = postFilterToCypher({ filter: { [key]: FILTER_FIXTURES[key] } })

    // A filter translating to nothing would return EVERY post — the direction that leaks,
    // and indistinguishable in the response from having sent no filter at all.
    expect(where).not.toBe('')
    expect(Object.keys(params).length).toBeGreaterThan(0)
  })
})
