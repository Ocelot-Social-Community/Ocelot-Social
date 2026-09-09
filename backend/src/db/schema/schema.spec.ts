import { Ajv } from 'ajv'
import { describe, expect, it } from 'vitest'

import { sourcesOf, targetsOf } from './derive/rules'
import { jsonSchemaFor, relationshipJsonSchemaFor } from './types'
import { validateProperty } from './validate'

import { entities, labels, PasswordReset, relationships, relationshipTypes, User } from './index'

import type { Post, Role } from './index'
import type { EntityProperties, RelationshipDefinition } from './types'

const ajv = new Ajv({ allErrors: true })

describe('the declaration', () => {
  it.each(entities.map((entity) => [entity.label, entity] as const))(
    '%s compiles to a valid JSON Schema',
    (_label, entity) => {
      expect(() => ajv.compile(jsonSchemaFor(entity))).not.toThrow()
    },
  )

  it('names only declared properties in required, unique, indexed and fulltext', () => {
    // The generic constraint on defineEntity already makes this a compile error. Asserted at
    // runtime as well, because a future entity might be assembled rather than written out.
    for (const entity of entities) {
      const declared = Object.keys(entity.properties)
      const referenced = [
        ...entity.required,
        ...(entity.unique ?? []).flat(),
        ...(entity.indexed ?? []),
        ...(entity.fulltext ?? []).flatMap((index) => index.properties),
      ]

      expect(declared).toEqual(expect.arrayContaining(referenced))
    }
  })

  it('connects only declared entities', () => {
    for (const relationship of relationships) {
      for (const source of sourcesOf(relationship)) {
        expect(labels()).toContain(source.label)
      }
      for (const target of targetsOf(relationship)) {
        expect(labels()).toContain(target.label)
      }
    }
  })

  it('allows a relationship to name several target entities', () => {
    // WROTE points at both Post and Comment; a single-target declaration would report every
    // comment edge as an endpoint violation.
    const wrote = relationships.find((relationship) => relationship.type === 'WROTE')

    expect(wrote).toBeDefined()
    expect(targetsOf(wrote as RelationshipDefinition).map((entity) => entity.label)).toEqual([
      'Post',
      'Comment',
    ])
  })

  it('exposes secondary labels, so (:Post:Article) is not reported as unknown', () => {
    expect(labels()).toEqual(expect.arrayContaining(['Post', 'Article', 'Event']))
  })

  it('lists relationship types without duplicates', () => {
    expect(new Set(relationshipTypes()).size).toBe(relationshipTypes().length)
  })
})

describe('validation', () => {
  const validateUser = ajv.compile(jsonSchemaFor(User))

  it('accepts a well-formed node', () => {
    expect(
      validateUser({
        id: 'u1',
        name: 'Peter Lustig',
        slug: 'peter-lustig',
        createdAt: '2026-08-19T10:00:00.000Z',
        updatedAt: '2026-08-19T10:00:00.000Z',
      }),
    ).toBe(true)
  })

  it('rejects a slug that violates the pattern', () => {
    expect(
      validateUser({
        id: 'u1',
        name: 'Peter Lustig',
        slug: 'Peter Lustig',
        createdAt: '2026-08-19T10:00:00.000Z',
        updatedAt: '2026-08-19T10:00:00.000Z',
      }),
    ).toBe(false)
    expect(ajv.errorsText(validateUser.errors)).toContain('must match pattern')
  })

  it('rejects a property nobody declared', () => {
    // additionalProperties: false is the mechanism behind "the database cannot contain
    // undefined types" — an undeclared property fails on write AND on read.
    expect(
      validateUser({
        id: 'u1',
        name: 'Peter Lustig',
        slug: 'peter-lustig',
        createdAt: '2026-08-19T10:00:00.000Z',
        updatedAt: '2026-08-19T10:00:00.000Z',
        role: 'admin',
      }),
    ).toBe(false)
    expect(ajv.errorsText(validateUser.errors)).toContain('must NOT have additional properties')
  })

  it('rejects a missing required property', () => {
    expect(validateUser({ id: 'u1', name: 'Peter Lustig', slug: 'peter-lustig' })).toBe(false)
  })

  it('validates edge properties against the edge declaration', () => {
    const [observes] = relationships.filter((relationship) => relationship.type === 'OBSERVES')
    const validate = ajv.compile(relationshipJsonSchemaFor(observes))

    expect(validate({ createdAt: '2026-08-19T10:00:00.000Z', active: true })).toBe(true)
    expect(validate({ createdAt: 'yesterday', active: true })).toBe(false)
  })
})

describe(validateProperty, () => {
  // The single-property path exists for resolvers that check an input before there is a node
  // to write — AddEmailAddress validates the address the user typed, while the node it will
  // eventually create also carries a nonce and a timestamp that do not exist yet.

  it('answers for a property that violates its pattern', () => {
    expect(validateProperty(User, 'slug', 'peter-pan')).toBeNull()
    expect(validateProperty(User, 'slug', 'Peter Pan')).toContain('must match pattern')
  })

  it.each([
    ['a native datetime', 'issuedAt', new Date()],
    ['a nullable datetime holding a value', 'usedAt', new Date()],
    ['a nullable datetime holding null', 'usedAt', null],
  ])('answers for %s instead of throwing', (_case, property, value) => {
    // `datetime` is this schema's type, not one ajv knows. Compiling the declaration raw made
    // every call for such a property throw "schema is invalid" — a 500 where a verdict was
    // asked for. Latent while no caller validated a timestamp, which is exactly how long it
    // would have stayed unnoticed.
    expect(() => validateProperty(PasswordReset, property, value)).not.toThrow()
    expect(validateProperty(PasswordReset, property, value)).toBeNull()
  })

  it('refuses an ISO string where the declaration says native datetime', () => {
    // The distinction the `datetime` type exists to make: PasswordReset writes
    // `datetime($issuedAt)`, every other timestamp in this schema is a string.
    expect(validateProperty(PasswordReset, 'issuedAt', '2026-08-21T10:00:00Z')).toContain(
      'must be object',
    )
  })

  it('throws for a property nobody declared', () => {
    // A typo in a resolver is a programming error, not user input — it must not read as
    // "valid".
    expect(() => validateProperty(User, 'nope', 'x')).toThrow('declares no property nope')
  })

  it.each(entities.map((entity) => [entity.label, entity] as const))(
    'compiles every declared property of %s',
    (_label, entity) => {
      // The general form of the datetime case: whatever a property is declared as has to
      // survive being compiled on its own, or the resolver that first validates it gets an
      // exception instead of an answer. The counterpart to "%s compiles to a valid JSON
      // Schema" above, which only ever exercises the whole-node path.
      for (const property of Object.keys(entity.properties)) {
        expect(() => validateProperty(entity, property, null)).not.toThrow()
      }
    },
  )
})

describe('patterns', () => {
  // Every pattern is read by ajv as a JS regex and by Cypher's `=~` as a Java regex. Only
  // constructs both dialects agree on are allowed; these are the ones that would differ.
  //
  // The class shorthands are on the list because ECMAScript defines them over Unicode and
  // Java over ASCII. `\s` was the one that got through: `[^@\s]` excluded U+00A0 for ajv and
  // admitted it for Cypher, so the write path rejected an address the audit called clean —
  // the audit missing precisely what it exists to find. `\v` is worse than a mismatch of
  // sets: ECMAScript reads it as the single vertical tab, Java as a whole class.
  //
  // This is a cheap syntactic guard. The semantic one is patternParity.spec.ts, which asks a
  // real Neo4j.
  const forbidden = [
    // `(?i)` and friends: Java honours an inline flag, ajv compiles the pattern without
    // flags and ECMAScript has no such syntax at all, so the same string would be
    // case-insensitive on one side only.
    /\(\?[a-zA-Z]+[):]/,
    /\(\?</,
    /\\d/,
    /\\D/,
    /\\w/,
    /\\W/,
    /\\s/,
    /\\S/,
    /\\v/,
    /\\b/,
    /\\p\{/,
    /\(\?<[=!]/,
  ]

  it.each(entities.map((entity) => [entity.label, entity] as const))(
    '%s uses only dialect-neutral patterns',
    (_label, entity) => {
      for (const schema of Object.values(entity.properties)) {
        if (schema.pattern === undefined) {
          continue
        }
        for (const construct of forbidden) {
          expect(schema.pattern).not.toMatch(construct)
        }
      }
    },
  )
})

describe('derived types', () => {
  it('types required properties as present and optional ones as optional', () => {
    // A compile-time assertion: the object below is only assignable if `id`/`name` are
    // required strings, `about` is an optional nullable string, and `role` — which
    // db/types/User.ts still declares — does not exist at all.
    const user: EntityProperties<typeof User> = {
      id: 'u1',
      name: 'Peter Lustig',
      slug: 'peter-lustig',
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
      about: null,
    }

    expect(user.about).toBeNull()
  })

  it('narrows an enum property to its literal values', () => {
    const post: Pick<EntityProperties<typeof Post>, 'postType'> = { postType: 'Article' }

    expect(post.postType).toBe('Article')
  })

  it('types a boolean property as boolean', () => {
    const role: Pick<EntityProperties<typeof Role>, 'protected'> = { protected: true }

    expect(role.protected).toBe(true)
  })
})
