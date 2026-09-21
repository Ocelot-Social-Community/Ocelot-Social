// Indexes here are field names from the literal EQUALITY_FIELDS list and parameter names
// this module generates — never attacker-controlled keys.
/* eslint-disable security/detect-object-injection */
import { UserInputError } from '@graphql/errors'

import { orderClause } from './ordering'

// Translates the `_PostFilter` tree into a Cypher WHERE clause — the part neo4j-graphql-js
// used to do for the Post and profilePagePosts queries (migration stage C2).
//
// Scope is deliberately the operators this codebase actually produces: the ones the webapp
// sends (store/posts.js, MapQuery.js) plus the ones the filter wrappers add
// (filterInvisiblePosts, filterForMutedUsers, filterPostsOfMyGroups, maintainPinnedPosts).
// Everything else THROWS.
//
// Rejecting beats ignoring here, and not only for tidiness: two of these operators are
// access control. `id_not_in` carries the posts the viewer must not see, and `author_not`
// the muted authors. An unrecognised operator that were silently dropped would widen the
// result set — exactly the direction that leaks data. A loud error cannot.
//
// Values are always bound as parameters; only fixed, code-defined strings are interpolated.

/**
 * Arguments of the Post / profilePagePosts queries, as they travel through the filter
 * wrappers on their way here.
 *
 * Shared on purpose. filterInvisiblePosts, filterForMutedUsers and filterPostsOfMyGroups each
 * declared their own copy, and the copies had already diverged — only one of them knew about
 * `id` and `slug`, the very fields it uses to exempt single-post lookups from muting. The
 * three run as a CHAIN, each handing its output to the next and the last to this module, so a
 * type that describes something slightly different in the middle of that chain is a type that
 * describes nothing.
 *
 * The index signature is what makes the scalar arguments (title, slug, visibility, …) usable
 * without listing every one of them; `id` and `slug` are named because wrappers read them.
 */
export interface PostQueryParams {
  filter?: Record<string, unknown>
  id?: string
  slug?: string
  first?: number | null
  offset?: number | null
  orderBy?: unknown
  [argument: string]: unknown
}

interface CypherFragment {
  /** Boolean Cypher expression over the `post` alias, or null when nothing constrains. */
  where: string | null
  params: Record<string, unknown>
}

const EMPTY: CypherFragment = { where: null, params: {} }

/**
 * Soft-delete flags. They get their own handling because softDeleteMiddleware sets them as
 * TOP-LEVEL arguments (`args.deleted = false`, and `args.disabled = false` for anyone
 * without content.moderate) rather than inside `filter`. Missing them here means deleted
 * and disabled posts are served to everyone — so they are matched through coalesce(),
 * which also covers nodes that never had the property set.
 */
const SOFT_DELETE_FIELDS = ['deleted', 'disabled']

/** Scalar post properties usable as an equality match, both as filter keys and query args. */
const EQUALITY_FIELDS = [
  'id',
  'title',
  'slug',
  'content',
  'visibility',
  'pinned',
  'groupPinned',
  'createdAt',
  'updatedAt',
  'language',
  'imageBlurred',
  'imageAspectRatio',
]

const combine = (fragments: CypherFragment[], operator: 'AND' | 'OR'): CypherFragment => {
  // An unconstrained fragment is logically TRUE. Under AND that is the identity and can be
  // dropped; under OR it makes the whole disjunction TRUE, so the other branches must go
  // instead. maintainPinnedPosts relies on exactly this: it builds
  // `OR: [{ pinned: true }, {}]`, where the empty branch means "or anything else".
  // Dropping it would narrow the feed to pinned posts only.
  if (operator === 'OR' && fragments.some((fragment) => fragment.where === null)) {
    return EMPTY
  }

  const present = fragments.filter((fragment) => fragment.where !== null)
  if (present.length === 0) {
    return EMPTY
  }
  return {
    where:
      present.length === 1
        ? present[0].where
        : `(${present.map((fragment) => fragment.where).join(` ${operator} `)})`,
    params: Object.assign({}, ...present.map((fragment) => fragment.params)) as Record<
      string,
      unknown
    >,
  }
}

/**
 * Builds the WHERE expression for one filter object.
 *
 * `next()` hands out unique parameter names so that repeated operators (an OR of two
 * branches both filtering on `id`) cannot overwrite each other's bindings.
 */
const translate = (
  filter: Record<string, unknown>,
  alias: string,
  next: () => string,
): CypherFragment => {
  const fragments: CypherFragment[] = []

  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) {
      continue
    }

    // --- boolean composition -------------------------------------------------------
    if (key === 'OR' || key === 'AND') {
      const branches = (value as Record<string, unknown>[]).map((branch) =>
        translate(branch, alias, next),
      )
      fragments.push(combine(branches, key))
      continue
    }

    const parameter = next()

    if (SOFT_DELETE_FIELDS.includes(key)) {
      fragments.push({
        where: `coalesce(${alias}.${key}, false) = $${parameter}`,
        params: { [parameter]: value },
      })
      continue
    }

    // --- scalar equality -----------------------------------------------------------
    if (EQUALITY_FIELDS.includes(key)) {
      fragments.push({ where: `${alias}.${key} = $${parameter}`, params: { [parameter]: value } })
      continue
    }

    switch (key) {
      // --- id sets ---------------------------------------------------------------
      case 'id_in':
        fragments.push({ where: `${alias}.id IN $${parameter}`, params: { [parameter]: value } })
        continue
      // Access control: the post visibility rule, read off the group.
      //
      // A post is visible unless it sits in a non-public group the viewer is not an active
      // member of — with one exception, your own posts stay yours. Nothing is stored: the
      // membership the rule consults is the same MEMBER_OF edge that grants access to the
      // group in the first place, so there is no second copy that can go stale.
      //
      // This replaces a materialised negative ACL, `(:User)-[:CANNOT_SEE]->(:Post)`, written by
      // five different mutations. Its cost grew as posts × users: profiled against 20.000 posts
      // it cost 3.551.945 db hits at 1.000 users and 9.142.613 at 2.000, where this rule costs
      // 124.395 at either size. It was only ever a workaround for neo4j-graphql-js, which could
      // not filter across a relation — and that library is gone.
      //
      // ONE expression for both viewer kinds rather than a branch. An anonymous visitor carries
      // an empty group list (`NOT g.id IN []` is true for every group) and a null id, which no
      // node matches — verified: a pattern property compared against null never binds. Access
      // control with fewer branches is worth more than the handful of db hits the unused
      // author clause costs a logged-out request.
      case 'invisibleTo': {
        const { viewerId, groupIds } = value as { viewerId: string | null; groupIds: string[] }
        const groupsParameter = next()
        fragments.push({
          where: `(
            NOT EXISTS {
              MATCH (${alias})-[:IN]->(g:Group)
              WHERE NOT g.groupType = 'public' AND NOT g.id IN $${groupsParameter}
            }
            OR EXISTS { MATCH (${alias})<-[:WROTE]-(:User { id: $${parameter} }) }
          )`,
          params: { [parameter]: viewerId, [groupsParameter]: groupIds },
        })
        continue
      }

      // Access control: posts written by someone the viewer muted.
      case 'mutedBy': {
        const viewerId = value as string | null
        if (!viewerId) {
          continue
        }
        fragments.push({
          where: `NOT EXISTS { MATCH (${alias})<-[:WROTE]-(:User)<-[:MUTED]-(:User { id: $${parameter} }) }`,
          params: { [parameter]: viewerId },
        })
        continue
      }

      // Posts in groups the viewer is an active member of — the same membership set
      // `invisibleTo` consults, resolved once per request in viewerGroups.ts instead of
      // re-derived here from the viewer id.
      case 'inGroupsOf': {
        const groupIds = value as string[]
        // No memberships ⇒ nothing matches, rather than "no restriction". An anonymous viewer
        // reaches this with an empty list, and `postsInMyGroups` must not widen to everything.
        if (groupIds.length === 0) {
          fragments.push({ where: 'false', params: {} })
          continue
        }
        fragments.push({
          where: `EXISTS { MATCH (${alias})-[:IN]->(g:Group) WHERE g.id IN $${parameter} }`,
          params: { [parameter]: groupIds },
        })
        continue
      }

      case 'hasLocation':
        if (!value) {
          continue
        }
        fragments.push({
          where: `EXISTS { MATCH (${alias})-[:IS_IN]->(:Location) }`,
          params: {},
        })
        continue

      // Kept for callers that still pass an explicit id list.
      case 'id_not_in':
        fragments.push({
          where: `NOT ${alias}.id IN $${parameter}`,
          params: { [parameter]: value },
        })
        continue

      case 'language_in':
        fragments.push({
          where: `${alias}.language IN $${parameter}`,
          params: { [parameter]: value },
        })
        continue

      // Post types are Neo4j LABELS, not a property (see Post.postType's @cypher).
      case 'postType_in':
        fragments.push({
          where: `any(label IN labels(${alias}) WHERE label IN $${parameter})`,
          params: { [parameter]: value },
        })
        continue

      // Dates arrive as ISO strings or Date objects; toISOString() keeps the comparison
      // against the stored ISO string well-defined instead of relying on coercion.
      case 'eventStart_gte':
      case 'eventEnd_gte': {
        const field = key === 'eventStart_gte' ? 'eventStart' : 'eventEnd'
        const bound = value instanceof Date ? value.toISOString() : (value as string)
        fragments.push({
          where: `${alias}.${field} >= $${parameter}`,
          params: { [parameter]: bound },
        })
        continue
      }

      // Exact match — but Cypher's `=` never matches NULL, so `{ eventEnd: null }`
      // (filterEventDates in posts.ts, finding events with no explicit end date)
      // needs its own IS NULL branch instead of landing in EQUALITY_FIELDS.
      case 'eventEnd':
        fragments.push(
          value === null
            ? { where: `${alias}.eventEnd IS NULL`, params: {} }
            : { where: `${alias}.eventEnd = $${parameter}`, params: { [parameter]: value } },
        )
        continue

      // --- relations -------------------------------------------------------------
      case 'categories_some': {
        const ids = (value as { id_in?: string[] }).id_in
        if (!ids) {
          throw new UserInputError('categories_some supports only `id_in`.')
        }
        fragments.push({
          where: `EXISTS { MATCH (${alias})-[:CATEGORIZED]->(c:Category) WHERE c.id IN $${parameter} }`,
          params: { [parameter]: ids },
        })
        continue
      }

      case 'emotions_some': {
        const emotions = (value as { emotion_in?: string[] }).emotion_in
        if (!emotions) {
          throw new UserInputError('emotions_some supports only `emotion_in`.')
        }
        fragments.push({
          where: `EXISTS { MATCH (${alias})<-[emoted:EMOTED]-(:User) WHERE emoted.emotion IN $${parameter} }`,
          params: { [parameter]: emotions },
        })
        continue
      }

      // The hashtag filter on the start page — pages/index.vue passes `{ id: <hashtag> }`.
      case 'tags_some': {
        const tag = value as { id?: string; id_in?: string[] }
        if (tag.id_in) {
          fragments.push({
            where: `EXISTS { MATCH (${alias})-[:TAGGED]->(t:Tag) WHERE t.id IN $${parameter} }`,
            params: { [parameter]: tag.id_in },
          })
          continue
        }
        if (tag.id) {
          fragments.push({
            where: `EXISTS { MATCH (${alias})-[:TAGGED]->(:Tag { id: $${parameter} }) }`,
            params: { [parameter]: tag.id },
          })
          continue
        }
        throw new UserInputError('tags_some supports only `id` and `id_in`.')
      }

      // The profile page's "comments" tab: posts the given user has commented on.
      //
      // Deliberately does NOT exclude deleted or disabled comments. Post.commentsCount does,
      // but adding it here would change which posts the tab lists — a behaviour change
      // smuggled into a migration whose job was to reproduce the generated filter.
      case 'comments_some': {
        const authorId = (value as { author?: { id?: string } }).author?.id
        if (!authorId) {
          throw new UserInputError('comments_some supports only `author.id`.')
        }
        fragments.push({
          where: `EXISTS {
            MATCH (${alias})<-[:COMMENTS]-(:Comment)<-[:WROTE]-(:User { id: $${parameter} })
          }`,
          params: { [parameter]: authorId },
        })
        continue
      }

      // The profile page's "shouts" tab.
      case 'shoutedBy_some': {
        const shouterId = (value as { id?: string }).id
        if (!shouterId) {
          throw new UserInputError('shoutedBy_some supports only `id`.')
        }
        fragments.push({
          where: `EXISTS { MATCH (${alias})<-[:SHOUTED]-(:User { id: $${parameter} }) }`,
          params: { [parameter]: shouterId },
        })
        continue
      }

      case 'author': {
        const author = value as { followedBy_some?: { id?: string }; id?: string }
        if (author.followedBy_some?.id) {
          fragments.push({
            where: `EXISTS { MATCH (${alias})<-[:WROTE]-(:User)<-[:FOLLOWS]-(:User { id: $${parameter} }) }`,
            params: { [parameter]: author.followedBy_some.id },
          })
          continue
        }
        if (author.id) {
          fragments.push({
            where: `EXISTS { MATCH (${alias})<-[:WROTE]-(:User { id: $${parameter} }) }`,
            params: { [parameter]: author.id },
          })
          continue
        }
        throw new UserInputError('author supports only `id` and `followedBy_some.id`.')
      }

      // Access control: hide posts by muted authors (filterForMutedUsers).
      case 'author_not': {
        const ids = (value as { id_in?: string[] }).id_in
        if (!ids) {
          throw new UserInputError('author_not supports only `id_in`.')
        }
        fragments.push({
          where: `NOT EXISTS { MATCH (${alias})<-[:WROTE]-(author:User) WHERE author.id IN $${parameter} }`,
          params: { [parameter]: ids },
        })
        continue
      }

      case 'group': {
        const group = value as { id_in?: string[]; id?: string }
        if (group.id_in) {
          fragments.push({
            where: `EXISTS { MATCH (${alias})-[:IN]->(g:Group) WHERE g.id IN $${parameter} }`,
            params: { [parameter]: group.id_in },
          })
          continue
        }
        if (group.id) {
          fragments.push({
            where: `EXISTS { MATCH (${alias})-[:IN]->(:Group { id: $${parameter} }) }`,
            params: { [parameter]: group.id },
          })
          continue
        }
        throw new UserInputError('group supports only `id` and `id_in`.')
      }

      default:
        throw new UserInputError(`Unsupported Post filter: ${key}.`)
    }
  }

  return combine(fragments, 'AND')
}

/**
 * Turns the resolver's `params` (scalar arguments plus `filter`) into one WHERE expression.
 * Returns `where: null` when nothing constrains the query.
 */
export const postFilterToCypher = (params: PostQueryParams, alias = 'post'): CypherFragment => {
  let counter = 0
  const next = () => `pf${String(counter++)}`

  const scalarArgs = Object.fromEntries(
    [...EQUALITY_FIELDS, ...SOFT_DELETE_FIELDS]
      .filter((field) => params[field] !== undefined && params[field] !== null)
      .map((field) => [field, params[field]]),
  )

  return combine(
    [
      translate(scalarArgs, alias, next),
      translate((params.filter as Record<string, unknown>) ?? {}, alias, next),
    ],
    'AND',
  )
}

/** ORDER BY from `_PostOrdering`; the allowed fields come from the enum itself. */
export const postOrderClause = (orderBy: unknown, alias = 'post'): string =>
  orderClause(orderBy, {
    enumName: '_PostOrdering',
    alias,
    fallback: `${alias}.createdAt DESC`,
  })
