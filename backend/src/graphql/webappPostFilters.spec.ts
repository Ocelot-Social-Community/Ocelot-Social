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
// Two readers, because one is not enough:
//
//  - by SUFFIX (`_some`, `_in`, `_gte`, …) anywhere in the sources. Catches operators that
//    are assembled dynamically, e.g. `update(filter, 'categories_some.id_in', …)`.
//  - by FILTER OBJECT: the top-level keys of every `filter: { … }` / `postFilter: { … }`
//    literal. Catches suffix-FREE keys, which the first reader structurally cannot see.
//
// The second reader exists because the first one missed a second production bug of the same
// kind: `skipPinnedFilter`, sent by the map page, carries no operator suffix and was likewise
// absent from `_PostFilter` — so the map died on variable coercion exactly as the hashtag
// filter had. One reader with a documented blind spot is a reader that will be surprised
// again.

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
  hasLocation: true,
}

/**
 * Client-facing flags that a WRAPPER consumes before postFilterToCypher ever sees them. They
 * must be declared on `_PostFilter` — the client sends them — but the translation would
 * reject them, so they get no fixture.
 *
 *  - `postsInMyGroups`: filterPostsOfMyGroups turns it into the `inGroupsOf` operator, which
 *    carries the viewer whose memberships decide the answer.
 *  - `skipPinnedFilter`: the Post resolver reads and deletes it, then skips
 *    maintainPinnedPosts. The map page sends it because it orders by location, not by pins.
 */
const TRANSLATED_BY_A_WRAPPER = ['postsInMyGroups', 'skipPinnedFilter']

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

/**
 * Keys found inside `filter: { … }` literals that are NOT post filters.
 *
 * Kept as an explicit list, like BELONGS_TO_ANOTHER_INPUT: filtering them out by comparing
 * against `_PostFilter` would hide precisely the missing field this test looks for.
 */
const NOT_A_POST_FILTER: Record<string, string> = {
  type: 'OcelotSelect.vue — a Vue prop named `filter` that holds a function; this is its type',
  default: 'OcelotSelect.vue — the default value of that same prop',
  categoryId: 'index.spec.js — a $route.query mock, not a GraphQL filter',
  existing: 'profile/_slug.methods.spec.js — a placeholder value in a "filter unchanged" case',
}

/** Filters whose Cypher binds no value, so the fixture check must not demand a parameter. */
const VALUE_LESS_FILTERS = new Set(['hasLocation'])

/** `filter: { … }` and `postFilter: { … }`, but not `userFilter`, `groupFilter`, … */
const FILTER_OBJECT_START = /(?:^|[^a-zA-Z])(?:postFilter|filter)\s*[:=]\s*\{/g

/** Top-level keys of one object literal, given the source and the index of its `{`. */
const topLevelKeys = (source: string, braceIndex: number): string[] => {
  let depth = 0
  let end = braceIndex
  for (; end < source.length; end++) {
    if (source[end] === '{') {
      depth++
    } else if (source[end] === '}' && --depth === 0) {
      break
    }
  }
  // Flatten: drop everything nested, so only this object's own keys remain.
  let nested = 0
  let flat = ''
  for (const character of source.slice(braceIndex + 1, end)) {
    if ('{['.includes(character)) {
      nested++
    } else if ('}]'.includes(character)) {
      nested--
    } else if (nested === 0) {
      flat += character
    }
  }
  return [...flat.matchAll(/(?:^|,)\s*\.{0,3}([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)].map((m) => m[1])
}

const readSources = (): string[] => {
  assertWebappReadable()
  const files: string[] = []
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) {
      return
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') {
          walk(full)
        }
        // Webapp SPECS are read too, deliberately: store/posts.js assembles its filter
        // dynamically, so those operator names never appear as literals in the production
        // source — its spec is where the concrete shape is written down. Reading production
        // files alone finds 6 of the 11 operators actually sent.
      } else if (/\.(vue|js|ts)$/.test(entry.name)) {
        files.push(fs.readFileSync(full, 'utf8'))
      }
    }
  }
  for (const dir of SEARCH_DIRS) {
    walk(path.join(WEBAPP_ROOT, dir))
  }
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

/** Every filter key the webapp uses: suffixed operators plus filter-object literals. */
const operatorsUsedByWebapp = (): string[] => {
  const found = new Set<string>()
  for (const source of readSources()) {
    for (const match of source.matchAll(OPERATOR_SUFFIX)) {
      found.add(match[1])
    }
    for (const match of source.matchAll(FILTER_OBJECT_START)) {
      for (const key of topLevelKeys(source, source.indexOf('{', match.index))) {
        found.add(key)
      }
    }
  }
  return [...found].filter((key) => !(key in NOT_A_POST_FILTER)).sort()
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
    // Wrapper-consumed flags are exempt: they never reach the translation, so a fixture for
    // them would assert the opposite of what happens.
    const withoutFixture = expectedOnPostFilter.filter(
      (key) => !(key in FILTER_FIXTURES) && !TRANSLATED_BY_A_WRAPPER.includes(key),
    )

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
    expect(where).not.toBeNull()

    // Values must be BOUND, never interpolated into the statement. `hasLocation` is the one
    // exception and needs no parameter at all: it is a pure existence check
    // (`EXISTS { (post)-[:IS_IN]->() }`) whose flag picks the clause rather than appearing
    // in it. Expressed as a minimum rather than an `if`, so the assertion always runs.
    const boundValuesExpected = VALUE_LESS_FILTERS.has(key) ? 0 : 1
    expect(Object.keys(params).length).toBeGreaterThanOrEqual(boundValuesExpected)
  })
})
