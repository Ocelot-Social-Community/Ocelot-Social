import { describe, expect, it } from 'vitest'

import { UserInputError } from '@graphql/errors'

import { postFilterToCypher, postOrderClause } from './postFilter'

// The `_PostFilter` tree is translated into Cypher here, and the translation is pure string and
// parameter building — no database is involved, which is why this spec talks to the function
// directly instead of through a query. That directness is what makes the two properties this
// module actually has to hold assertable at all:
//
//  1. Nothing is silently dropped. Two of the operators are ACCESS CONTROL — `id_not_in`
//     carries the posts the viewer must not see and `author_not` the muted authors — so an
//     operator that went unrecognised and unmentioned would WIDEN the result set. Widening is
//     the direction that leaks, and it is invisible in a response: more posts look exactly
//     like "no filter was sent".
//  2. Values are bound, never interpolated. Only fixed, code-defined strings may end up inside
//     the statement text.
//
// Both are checked as such below, not just implied by a handful of happy paths.

describe('postFilterToCypher scalar arguments', () => {
  // softDeleteMiddleware sets `deleted`/`disabled` as TOP-LEVEL arguments, not inside `filter`,
  // and matches them through coalesce() because a node that never had the property set must
  // still count as not-deleted. Comparing `post.deleted = false` directly would return NULL for
  // those nodes and drop them from every feed.
  it('matches the soft-delete flags through coalesce', () => {
    const { where, params } = postFilterToCypher({ deleted: false, disabled: false })

    expect(where).toBe(
      '(coalesce(post.deleted, false) = $pf0 AND coalesce(post.disabled, false) = $pf1)',
    )
    expect(params).toEqual({ pf0: false, pf1: false })
  })

  it('translates a scalar query argument into an equality match', () => {
    const { where, params } = postFilterToCypher({ slug: 'my-post' })

    expect(where).toBe('post.slug = $pf0')
    expect(params).toEqual({ pf0: 'my-post' })
  })

  // Every resolver argument arrives on the same object, including the ones this module has no
  // business filtering on. Picking them up by name from EQUALITY_FIELDS is what keeps `first`,
  // `offset` and `orderBy` out of the WHERE clause.
  it('ignores arguments that are not post properties', () => {
    const { where } = postFilterToCypher({ first: 10, offset: 20, orderBy: 'createdAt_desc' })

    expect(where).toBeNull()
  })

  // GraphQL hands over an explicit `null` for an argument the client sent as null, and
  // `undefined` for one it omitted. Neither may become `post.id = $pf0`, because Cypher's `=`
  // never matches NULL and the query would return nothing at all.
  it('drops arguments that are null or undefined', () => {
    // The `null` is cast in on purpose. The declared argument type is `string | undefined`, so
    // the type system cannot express this case — but GraphQL does deliver it, and the runtime
    // handles it. Narrowing the test to `undefined` would leave exactly the branch untested
    // that would otherwise emit `slug = NULL` and silently match nothing.
    const args = { id: undefined, slug: null } as unknown as Parameters<
      typeof postFilterToCypher
    >[0]
    const { where, params } = postFilterToCypher(args)

    expect(where).toBeNull()
    expect(params).toEqual({})
  })

  it('returns no constraint for an empty request', () => {
    expect(postFilterToCypher({})).toEqual({ where: null, params: {} })
  })

  // The scalar arguments and the `filter` object are two independent sources that both end up
  // in one WHERE — a single-post lookup by id combined with the soft-delete flags is the
  // everyday case, and they must AND rather than one replacing the other.
  it('combines scalar arguments with the filter object', () => {
    const { where, params } = postFilterToCypher({ id: 'p1', filter: { language_in: ['de'] } })

    expect(where).toBe('(post.id = $pf0 AND post.language IN $pf1)')
    expect(params).toEqual({ pf0: 'p1', pf1: ['de'] })
  })

  it('writes against the requested alias', () => {
    const { where } = postFilterToCypher({ filter: { hasLocation: true } }, 'p')

    expect(where).toBe('EXISTS { MATCH (p)-[:IS_IN]->(:Location) }')
  })
})

describe('postFilterToCypher boolean composition', () => {
  // maintainPinnedPosts builds `OR: [{ pinned: true }, {}]`, where the empty branch means "or
  // anything else". An empty fragment is logically TRUE, so under OR it makes the whole
  // disjunction TRUE — dropping it the way an AND identity would be dropped narrows the feed to
  // pinned posts only.
  it('drops the whole disjunction when one OR branch is unconstrained', () => {
    const { where, params } = postFilterToCypher({ filter: { OR: [{ pinned: true }, {}] } })

    expect(where).toBeNull()
    expect(params).toEqual({})
  })

  // The counterpart: under AND an unconstrained branch is the identity and may go, but the
  // constrained ones must survive it.
  it('keeps the constrained branches of an AND', () => {
    const { where, params } = postFilterToCypher({ filter: { AND: [{}, { pinned: true }] } })

    expect(where).toBe('post.pinned = $pf0')
    expect(params).toEqual({ pf0: true })
  })

  // Parameter names are handed out by a single counter for the entire tree precisely so that
  // two branches filtering on the SAME field cannot overwrite each other's binding — with one
  // name per field, this query would silently degrade to `id = 'b' OR id = 'b'`.
  it('gives each branch its own parameter name when they filter on the same field', () => {
    const { where, params } = postFilterToCypher({ filter: { OR: [{ id: 'a' }, { id: 'b' }] } })

    expect(where).toBe('(post.id = $pf0 OR post.id = $pf1)')
    expect(params).toEqual({ pf0: 'a', pf1: 'b' })
  })

  it('parenthesises a nested composition', () => {
    const { where, params } = postFilterToCypher({
      filter: { AND: [{ OR: [{ language: 'de' }, { language: 'en' }] }, { pinned: true }] },
    })

    expect(where).toBe('((post.language = $pf0 OR post.language = $pf1) AND post.pinned = $pf2)')
    expect(params).toEqual({ pf0: 'de', pf1: 'en', pf2: true })
  })

  // The webapp assembles filter objects incrementally and leaves keys behind as `undefined`
  // rather than deleting them. Such a key must not consume a parameter name either, or the
  // names would depend on which keys happened to be present.
  it('skips undefined values without consuming a parameter name', () => {
    const { where, params } = postFilterToCypher({ filter: { id: undefined, title: 'kept' } })

    expect(where).toBe('post.title = $pf0')
    expect(params).toEqual({ pf0: 'kept' })
  })
})

describe('postFilterToCypher access control operators', () => {
  // filterInvisiblePosts used to COLLECT every id the viewer must not see and pass them in as a
  // parameter array; for an anonymous visitor that was every post in a non-public group — a
  // list that grows with the database and travels with each request. The relation is asked
  // about in the graph instead, which is why there are two distinct clauses here.
  it('excludes posts the viewer cannot see', () => {
    const { where, params } = postFilterToCypher({ filter: { invisibleTo: 'viewer-id' } })

    expect(where).toBe('NOT EXISTS { MATCH (post)<-[:CANNOT_SEE]-(:User { id: $pf0 }) }')
    expect(params).toEqual({ pf0: 'viewer-id' })
  })

  // Anonymous visitors have no CANNOT_SEE edges to check, so the rule is the group type — and
  // it still has to constrain. Returning "no restriction" for a logged-out request would put
  // every closed and hidden group's posts on the public start page.
  it('excludes posts in non-public groups for an anonymous viewer', () => {
    const { where, params } = postFilterToCypher({ filter: { invisibleTo: null } })

    expect(where).toBe(
      "NOT EXISTS { MATCH (post)-[:IN]->(g:Group) WHERE NOT g.groupType = 'public' }",
    )
    expect(params).toEqual({})
  })

  it('excludes posts written by an author the viewer muted', () => {
    const { where, params } = postFilterToCypher({ filter: { mutedBy: 'viewer-id' } })

    expect(where).toBe(
      'NOT EXISTS { MATCH (post)<-[:WROTE]-(:User)<-[:MUTED]-(:User { id: $pf0 }) }',
    )
    expect(params).toEqual({ pf0: 'viewer-id' })
  })

  // Muting is per viewer, so with no viewer there is nothing to mute — this one drops out
  // rather than matching nothing, which is the opposite decision from `inGroupsOf` below and
  // the reason both are pinned here.
  it('adds no muting clause for an anonymous viewer', () => {
    expect(postFilterToCypher({ filter: { mutedBy: null } }).where).toBeNull()
  })

  it('restricts to groups the viewer is an active member of', () => {
    const { where, params } = postFilterToCypher({ filter: { inGroupsOf: 'viewer-id' } })

    expect(where).toContain(
      'MATCH (post)-[:IN]->(:Group)<-[membership:MEMBER_OF]-(:User { id: $pf0 })',
    )
    expect(where).toContain("WHERE membership.role IN ['usual', 'admin', 'owner']")
    expect(params).toEqual({ pf0: 'viewer-id' })
  })

  // No viewer means no memberships, and "posts in my groups" then has to match NOTHING. Falling
  // through as an absent constraint would turn the my-groups feed into the unrestricted feed
  // for exactly the requests that are not allowed to see it.
  it('matches nothing for the my-groups feed of an anonymous viewer', () => {
    const { where, params } = postFilterToCypher({ filter: { inGroupsOf: null } })

    expect(where).toBe('false')
    expect(params).toEqual({})
  })

  // filterForMutedUsers' operator. The negation is the whole point: a `NOT EXISTS` that turned
  // into an `EXISTS`, or went missing, shows every muted author's posts.
  it('excludes posts by the listed authors', () => {
    const { where, params } = postFilterToCypher({
      filter: { author_not: { id_in: ['muted-1', 'muted-2'] } },
    })

    expect(where).toBe(
      'NOT EXISTS { MATCH (post)<-[:WROTE]-(author:User) WHERE author.id IN $pf0 }',
    )
    expect(params).toEqual({ pf0: ['muted-1', 'muted-2'] })
  })

  it('excludes an explicit list of post ids', () => {
    const { where, params } = postFilterToCypher({ filter: { id_not_in: ['hidden'] } })

    expect(where).toBe('NOT post.id IN $pf0')
    expect(params).toEqual({ pf0: ['hidden'] })
  })
})

describe('postFilterToCypher content operators', () => {
  it('matches an id set', () => {
    const { where, params } = postFilterToCypher({ filter: { id_in: ['p1', 'p2'] } })

    expect(where).toBe('post.id IN $pf0')
    expect(params).toEqual({ pf0: ['p1', 'p2'] })
  })

  it('matches a language set', () => {
    const { where, params } = postFilterToCypher({ filter: { language_in: ['de', 'en'] } })

    expect(where).toBe('post.language IN $pf0')
    expect(params).toEqual({ pf0: ['de', 'en'] })
  })

  // Post types are Neo4j LABELS, not a property — `post.postType IN $x` would compare against
  // NULL on every node and return an empty feed.
  it('matches post types against the node labels', () => {
    const { where, params } = postFilterToCypher({ filter: { postType_in: ['Event'] } })

    expect(where).toBe('any(label IN labels(post) WHERE label IN $pf0)')
    expect(params).toEqual({ pf0: ['Event'] })
  })

  it('adds an existence check for posts with a location', () => {
    const { where, params } = postFilterToCypher({ filter: { hasLocation: true } })

    expect(where).toBe('EXISTS { MATCH (post)-[:IS_IN]->(:Location) }')
    expect(params).toEqual({})
  })

  // `hasLocation: false` is not "posts without a location" — the map page only ever sends the
  // flag to ask for the ones it can place, so a false flag means the filter is off.
  it('adds no location clause when the flag is off', () => {
    expect(postFilterToCypher({ filter: { hasLocation: false } }).where).toBeNull()
  })

  it('matches an event start bound', () => {
    const { where, params } = postFilterToCypher({ filter: { eventStart_gte: '2026-01-01' } })

    expect(where).toBe('post.eventStart >= $pf0')
    expect(params).toEqual({ pf0: '2026-01-01' })
  })

  // Dates reach this point either as ISO strings or as Date objects, and the stored value is an
  // ISO STRING. A Date bound as a driver value compares as a temporal against a string and the
  // result is not the one anybody intended, so it is normalised here rather than left to
  // coercion.
  it('normalises a Date bound to its ISO string', () => {
    const { where, params } = postFilterToCypher({
      filter: { eventEnd_gte: new Date('2026-01-01T00:00:00.000Z') },
    })

    expect(where).toBe('post.eventEnd >= $pf0')
    expect(params).toEqual({ pf0: '2026-01-01T00:00:00.000Z' })
  })

  it('matches an explicit event end', () => {
    const { where, params } = postFilterToCypher({ filter: { eventEnd: '2026-02-01' } })

    expect(where).toBe('post.eventEnd = $pf0')
    expect(params).toEqual({ pf0: '2026-02-01' })
  })

  // Cypher's `=` never matches NULL, so `{ eventEnd: null }` — filterEventDates asking for
  // events with no explicit end date — would match zero rows as an equality. It needs the
  // IS NULL form, which is also why `eventEnd` cannot simply live in EQUALITY_FIELDS.
  it('matches a missing event end with IS NULL', () => {
    const { where, params } = postFilterToCypher({ filter: { eventEnd: null } })

    expect(where).toBe('post.eventEnd IS NULL')
    expect(params).toEqual({})
  })
})

describe('postFilterToCypher relation operators', () => {
  it('matches posts in any of the given categories', () => {
    const { where, params } = postFilterToCypher({
      filter: { categories_some: { id_in: ['cat-1'] } },
    })

    expect(where).toBe('EXISTS { MATCH (post)-[:CATEGORIZED]->(c:Category) WHERE c.id IN $pf0 }')
    expect(params).toEqual({ pf0: ['cat-1'] })
  })

  it('matches posts carrying any of the given emotions', () => {
    const { where, params } = postFilterToCypher({
      filter: { emotions_some: { emotion_in: ['funny'] } },
    })

    expect(where).toBe(
      'EXISTS { MATCH (post)<-[emoted:EMOTED]-(:User) WHERE emoted.emotion IN $pf0 }',
    )
    expect(params).toEqual({ pf0: ['funny'] })
  })

  // The start page's hashtag filter sends the single-tag form; both shapes exist and both are
  // reachable from the client, so neither may fall through to the throw.
  it('matches a single tag', () => {
    const { where, params } = postFilterToCypher({ filter: { tags_some: { id: 'peace' } } })

    expect(where).toBe('EXISTS { MATCH (post)-[:TAGGED]->(:Tag { id: $pf0 }) }')
    expect(params).toEqual({ pf0: 'peace' })
  })

  it('matches a set of tags', () => {
    const { where, params } = postFilterToCypher({
      filter: { tags_some: { id_in: ['peace', 'love'] } },
    })

    expect(where).toBe('EXISTS { MATCH (post)-[:TAGGED]->(t:Tag) WHERE t.id IN $pf0 }')
    expect(params).toEqual({ pf0: ['peace', 'love'] })
  })

  it('matches posts the given user commented on', () => {
    const { where, params } = postFilterToCypher({
      filter: { comments_some: { author: { id: 'u1' } } },
    })

    expect(where).toContain('MATCH (post)<-[:COMMENTS]-(:Comment)<-[:WROTE]-(:User { id: $pf0 })')
    expect(params).toEqual({ pf0: 'u1' })
  })

  it('matches posts the given user shouted', () => {
    const { where, params } = postFilterToCypher({ filter: { shoutedBy_some: { id: 'u1' } } })

    expect(where).toBe('EXISTS { MATCH (post)<-[:SHOUTED]-(:User { id: $pf0 }) }')
    expect(params).toEqual({ pf0: 'u1' })
  })

  it('matches posts by a given author', () => {
    const { where, params } = postFilterToCypher({ filter: { author: { id: 'u1' } } })

    expect(where).toBe('EXISTS { MATCH (post)<-[:WROTE]-(:User { id: $pf0 }) }')
    expect(params).toEqual({ pf0: 'u1' })
  })

  // The "followed" feed. It is checked separately from `author.id` because the two are nested
  // in the SAME operator and the followed form is tried first — a mix-up would quietly serve
  // the wrong feed rather than fail.
  it('matches posts by authors the viewer follows', () => {
    const { where, params } = postFilterToCypher({
      filter: { author: { followedBy_some: { id: 'viewer-id' } } },
    })

    expect(where).toBe('EXISTS { MATCH (post)<-[:WROTE]-(:User)<-[:FOLLOWS]-(:User { id: $pf0 }) }')
    expect(params).toEqual({ pf0: 'viewer-id' })
  })

  it('matches posts in a single group', () => {
    const { where, params } = postFilterToCypher({ filter: { group: { id: 'g1' } } })

    expect(where).toBe('EXISTS { MATCH (post)-[:IN]->(:Group { id: $pf0 }) }')
    expect(params).toEqual({ pf0: 'g1' })
  })

  it('matches posts in a set of groups', () => {
    const { where, params } = postFilterToCypher({ filter: { group: { id_in: ['g1', 'g2'] } } })

    expect(where).toBe('EXISTS { MATCH (post)-[:IN]->(g:Group) WHERE g.id IN $pf0 }')
    expect(params).toEqual({ pf0: ['g1', 'g2'] })
  })
})

describe('postFilterToCypher rejects what it cannot translate', () => {
  // The reason the default case throws instead of `continue`-ing. `_PostFilter` is
  // hand-maintained since the neo4j-graphql-js migration, so a field can be declared on it
  // before the translation knows it — and the two operators that would then go missing are the
  // access-control ones. A dropped `id_not_in` or `author_not` does not fail: it returns MORE
  // posts, which is indistinguishable in the response from an unfiltered query.
  it.each([
    ['id_not_in', { id_not_in: ['secret'] }],
    ['author_not', { author_not: { id_in: ['muted'] } }],
  ])('would not have ignored the access-control operator %s', (_name, filter) => {
    expect(postFilterToCypher({ filter }).where).not.toBeNull()
  })

  it('throws on an unknown operator rather than widening the result set', () => {
    expect(() => postFilterToCypher({ filter: { author_none: { id: 'u1' } } })).toThrow(
      UserInputError,
    )
    expect(() => postFilterToCypher({ filter: { author_none: { id: 'u1' } } })).toThrow(
      'Unsupported Post filter: author_none.',
    )
  })

  // An operator whose SHAPE is unsupported is the same hazard one level down: `categories_some:
  // { id_not_in: [...] }` reads like an exclusion and would become an inclusion — or nothing at
  // all — if the unrecognised inner key were skipped. Each of these is a nested form the schema
  // permits or a client could plausibly send.
  it.each([
    ['categories_some without id_in', { categories_some: { id: 'cat-1' } }, 'categories_some'],
    ['emotions_some without emotion_in', { emotions_some: { emotion: 'funny' } }, 'emotions_some'],
    ['tags_some without id or id_in', { tags_some: { name: 'peace' } }, 'tags_some'],
    ['comments_some without author', { comments_some: {} }, 'comments_some'],
    ['comments_some without author.id', { comments_some: { author: {} } }, 'comments_some'],
    ['shoutedBy_some without id', { shoutedBy_some: { name: 'u1' } }, 'shoutedBy_some'],
    ['author without id', { author: { name: 'u1' } }, 'author'],
    ['author with an empty followedBy_some', { author: { followedBy_some: {} } }, 'author'],
    ['author_not without id_in', { author_not: { id: 'muted' } }, 'author_not'],
    ['group without id or id_in', { group: { name: 'g1' } }, 'group'],
  ])('throws on %s', (_name, filter, operator) => {
    expect(() => postFilterToCypher({ filter })).toThrow(UserInputError)
    expect(() => postFilterToCypher({ filter })).toThrow(operator)
  })
})

describe('postFilterToCypher parameter binding', () => {
  // The injection guarantee, asserted directly instead of inferred from the individual clauses:
  // whatever a client puts into a filter VALUE ends up in `params`, and the statement text
  // contains only `$pfN` references to it. Every operator that carries a value is listed, so a
  // new one that interpolated its value would have to be added here to pass — and could not be
  // added without someone reading this.
  const payload = "' OR true // and a `backtick` and a {brace}"

  const valueCarryingFilters = {
    id: payload,
    title: payload,
    slug: payload,
    content: payload,
    visibility: payload,
    language: payload,
    id_in: [payload],
    id_not_in: [payload],
    language_in: [payload],
    postType_in: [payload],
    invisibleTo: payload,
    mutedBy: payload,
    inGroupsOf: payload,
    eventStart_gte: payload,
    eventEnd_gte: payload,
    eventEnd: payload,
    categories_some: { id_in: [payload] },
    emotions_some: { emotion_in: [payload] },
    tags_some: { id: payload },
    comments_some: { author: { id: payload } },
    shoutedBy_some: { id: payload },
    author: { id: payload },
    author_not: { id_in: [payload] },
    group: { id: payload },
  }

  it.each(Object.entries(valueCarryingFilters))('binds the value of %s', (key, value) => {
    const { where, params } = postFilterToCypher({ filter: { [key]: value } })

    expect(where).not.toBeNull()
    expect(where).not.toContain(payload)
    expect(JSON.stringify(Object.values(params))).toContain(payload)
  })
})

describe(postOrderClause, () => {
  // The fallback exists because a feed with no ORDER BY is not "unordered once" — it is ordered
  // differently per page, and SKIP/LIMIT over that shows the same post twice while another
  // never appears.
  it('orders newest first when the caller asks for nothing', () => {
    expect(postOrderClause(undefined)).toBe('post.createdAt DESC, post.id ASC')
  })

  it('translates an ordering from the _PostOrdering enum', () => {
    expect(postOrderClause(['eventStart_asc'], 'p')).toBe('p.eventStart ASC, p.id ASC')
  })

  // Ordering fields are INTERPOLATED into Cypher, so the enum is the only thing standing
  // between a request value and the statement text.
  it('rejects an ordering the enum does not declare', () => {
    expect(() => postOrderClause('password_asc')).toThrow(UserInputError)
  })
})
