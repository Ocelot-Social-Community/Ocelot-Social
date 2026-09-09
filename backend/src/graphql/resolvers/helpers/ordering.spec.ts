import { Kind } from 'graphql'
import { describe, expect, it, vi } from 'vitest'

import { UserInputError } from '@graphql/errors'

import { orderClause } from './ordering'

// `orderClause` interpolates field names straight into Cypher, so what it accepts is a security
// boundary and not merely an input check: the only thing between a request value and the query
// text is the lookup against the `_*Ordering` enum. These tests pin both halves of that — which
// values pass, and that everything else is rejected before it can reach a statement.
//
// The second thing pinned here is the id tiebreaker. It is invisible in a single response and
// only misbehaves across PAGES (a row served twice, another never), which is exactly the kind of
// bug a resolver spec never notices.

describe(orderClause, () => {
  it('turns an enum value into a property ordering', () => {
    expect(
      orderClause('name_asc', { enumName: '_UserOrdering', alias: 'user', fallback: 'x' }),
    ).toBe('user.name ASC, user.id ASC')
  })

  it('reads the direction off the suffix', () => {
    expect(
      orderClause('createdAt_desc', { enumName: '_UserOrdering', alias: 'user', fallback: 'x' }),
    ).toBe('user.createdAt DESC, user.id ASC')
  })

  // The GraphQL argument is a LIST (`orderBy: [_UserOrdering]`), so a single value and a list of
  // one must produce the same clause — the webapp sends both shapes depending on the query.
  it('accepts a single value and a list alike', () => {
    const options = { enumName: '_UserOrdering', alias: 'user', fallback: 'x' }

    expect(orderClause(['name_asc'], options)).toBe(orderClause('name_asc', options))
  })

  it('keeps the order of a multi-key ordering', () => {
    expect(
      orderClause(['locale_asc', 'name_desc'], {
        enumName: '_UserOrdering',
        alias: 'user',
        fallback: 'x',
      }),
    ).toBe('user.locale ASC, user.name DESC, user.id ASC')
  })

  // `orderBy` is optional in the schema, and an absent argument arrives as undefined while an
  // explicit `orderBy: null` arrives as null. Neither may fall through to an empty ORDER BY,
  // which Cypher rejects outright.
  it.each([[undefined], [null]])('falls back when the caller passes %s', (missing) => {
    expect(
      orderClause(missing, {
        enumName: '_PostOrdering',
        alias: 'post',
        fallback: 'post.createdAt DESC',
      }),
    ).toBe('post.createdAt DESC, post.id ASC')
  })

  describe('rejected input', () => {
    // The rejection is a UserInputError rather than an internal one: the value came from the
    // request, so the client gets BAD_USER_INPUT instead of the query blowing up in the driver.
    it('rejects a value the enum does not list', () => {
      expect(() =>
        orderClause('language_asc', { enumName: '_UserOrdering', alias: 'user', fallback: 'x' }),
      ).toThrow(UserInputError)
    })

    // The whole reason the allow-list exists. Anything unlisted is refused BEFORE it is
    // interpolated, so a crafted orderBy cannot append clauses of its own to the statement.
    it('rejects an injected Cypher fragment', () => {
      expect(() =>
        orderClause('id ASC WITH 1 AS x MATCH (n) DETACH DELETE n //', {
          enumName: '_UserOrdering',
          alias: 'user',
          fallback: 'x',
        }),
      ).toThrow(UserInputError)
    })

    // Not everything reaching this helper comes through GraphQL's enum validation — internal
    // callers pass their own values — so a non-string must be refused rather than stringified
    // into the query.
    it('rejects a non-string value', () => {
      expect(() =>
        orderClause([{ name: 'asc' }], { enumName: '_UserOrdering', alias: 'user', fallback: 'x' }),
      ).toThrow(UserInputError)
    })

    // A programming error, not a request error: the enum name is written by us. Failing loudly
    // beats silently accepting nothing, which would turn every orderBy into "unsupported".
    it('throws when the schema has no such ordering enum', () => {
      expect(() =>
        orderClause('name_asc', { enumName: '_NoSuchOrdering', alias: 'user', fallback: 'x' }),
      ).toThrow('Ordering enum _NoSuchOrdering not found in the schema.')
    })

    // `values` is OPTIONAL on an enum definition node, so an enum that carries none is a shape
    // the type system allows even though parsed SDL never produces it. What matters is the
    // direction of the failure: an allow-list built from a valueless enum must permit nothing,
    // not crash on `undefined.map` and not degrade into permitting everything.
    it('fails closed on an ordering enum that lists no values', async () => {
      vi.resetModules()
      vi.doMock('@graphql/types/index', () => ({
        default: {
          kind: Kind.DOCUMENT,
          definitions: [
            {
              kind: Kind.ENUM_TYPE_DEFINITION,
              name: { kind: Kind.NAME, value: '_EmptyOrdering' },
            },
          ],
        },
      }))

      const { orderClause: isolated } = await import('./ordering')

      // Asserted by message, not by class: `resetModules` gives the isolated import its own copy
      // of the errors module, so its UserInputError is a different constructor than ours.
      expect(() =>
        isolated('id_asc', { enumName: '_EmptyOrdering', alias: 'node', fallback: 'x' }),
      ).toThrow("Unsupported orderBy 'id_asc'.")

      vi.doUnmock('@graphql/types/index')
      vi.resetModules()
    })
  })

  describe('computed fields', () => {
    // Without the mapping, `taggedCount_desc` would sort by a node property that does not exist:
    // Cypher answers null for every row and the ordering silently does nothing — the trending
    // tags widget then shows an arbitrary selection instead of the most used tags.
    it('sorts by the expression instead of a property', () => {
      expect(
        orderClause('taggedCount_desc', {
          enumName: '_TagOrdering',
          alias: 'tag',
          fallback: 'x',
          computed: { taggedCount: 'size(taggedPosts)' },
        }),
      ).toBe('size(taggedPosts) DESC, tag.id ASC')
    })

    it('still sorts stored fields by their property', () => {
      expect(
        orderClause('id_asc', {
          enumName: '_TagOrdering',
          alias: 'tag',
          fallback: 'x',
          computed: { taggedCount: 'size(taggedPosts)' },
        }),
      ).toBe('tag.id ASC')
    })
  })

  describe('the id tiebreaker', () => {
    // Rows tying on the requested key come back in no particular order, and these queries are
    // paged with SKIP/LIMIT: over a partial order the same row can appear on two consecutive
    // pages while another never appears at all. Ties are the norm here — createdAt is
    // second-resolution in seed and import data.
    it('appends the id to every ordering', () => {
      expect(
        orderClause('createdAt_desc', {
          enumName: '_PostOrdering',
          alias: 'post',
          fallback: 'x',
        }),
      ).toBe('post.createdAt DESC, post.id ASC')
    })

    it('appends the id to the fallback too', () => {
      expect(
        orderClause(undefined, {
          enumName: '_PostOrdering',
          alias: 'post',
          fallback: 'post.pinned DESC',
        }),
      ).toBe('post.pinned DESC, post.id ASC')
    })

    // Already total on its own — a second `post.id` clause would be noise Neo4j has to parse on
    // every request.
    it('is left out when the caller already sorts by id', () => {
      expect(
        orderClause('id_desc', { enumName: '_PostOrdering', alias: 'post', fallback: 'x' }),
      ).toBe('post.id DESC')
    })

    // The alias is part of the check: `comment.id` must not count as the tiebreaker for a query
    // aliased `post`, or the ordering stays partial while looking complete.
    it('is added when another alias sorts by ITS id', () => {
      expect(
        orderClause(undefined, {
          enumName: '_PostOrdering',
          alias: 'post',
          fallback: 'comment.id DESC',
        }),
      ).toBe('comment.id DESC, post.id ASC')
    })
  })

  // The allowed set is memoised per enum and SHARED between requests. Two calls must therefore
  // agree, and neither may have been able to alter what the other sees.
  it('answers repeated calls for the same enum identically', () => {
    const options = { enumName: '_UserOrdering', alias: 'user', fallback: 'x' }

    expect(orderClause('slug_asc', options)).toBe('user.slug ASC, user.id ASC')
    expect(orderClause('slug_asc', options)).toBe('user.slug ASC, user.id ASC')
    expect(() => orderClause('language_asc', options)).toThrow(UserInputError)
  })
})
