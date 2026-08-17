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
  if (operator === 'OR' && fragments.some((fragment) => fragment.where === null)) return EMPTY

  const present = fragments.filter((fragment) => fragment.where !== null)
  if (present.length === 0) return EMPTY
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
    if (value === undefined) continue

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
      // Access control, evaluated in the graph instead of as an id list.
      //
      // These two replace what filterInvisiblePosts and the location helper used to do by
      // COLLECTING every matching id and passing it in as a parameter array. For an
      // anonymous visitor that meant every post in a non-public group — an unbounded list
      // sent with each request, growing with the database. The library could not filter on
      // a relation, so the ids were the only way; hand-written Cypher can just ask.
      case 'invisibleTo': {
        const viewerId = value as string | null
        fragments.push(
          viewerId
            ? {
                where: `NOT EXISTS { MATCH (${alias})<-[:CANNOT_SEE]-(:User { id: $${parameter} }) }`,
                params: { [parameter]: viewerId },
              }
            : {
                // Anonymous: posts inside a non-public group are not visible.
                where: `NOT EXISTS { MATCH (${alias})-[:IN]->(g:Group) WHERE NOT g.groupType = 'public' }`,
                params: {},
              },
        )
        continue
      }

      // Access control: posts written by someone the viewer muted.
      case 'mutedBy': {
        const viewerId = value as string | null
        if (!viewerId) continue
        fragments.push({
          where: `NOT EXISTS { MATCH (${alias})<-[:WROTE]-(:User)<-[:MUTED]-(:User { id: $${parameter} }) }`,
          params: { [parameter]: viewerId },
        })
        continue
      }

      // Posts in groups the viewer is an active member of. The roles mirror what
      // filterPostsOfMyGroups used to query for before handing over an id list.
      case 'inGroupsOf': {
        const viewerId = value as string | null
        // No viewer ⇒ no groups ⇒ nothing matches, rather than "no restriction".
        if (!viewerId) {
          fragments.push({ where: 'false', params: {} })
          continue
        }
        fragments.push({
          where: `EXISTS {
            MATCH (${alias})-[:IN]->(:Group)<-[membership:MEMBER_OF]-(:User { id: $${parameter} })
            WHERE membership.role IN ['usual', 'admin', 'owner']
          }`,
          params: { [parameter]: viewerId },
        })
        continue
      }

      case 'hasLocation':
        if (!value) continue
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

      // --- relations -------------------------------------------------------------
      case 'categories_some': {
        const ids = (value as { id_in?: string[] }).id_in
        if (!ids) throw new UserInputError('categories_some supports only `id_in`.')
        fragments.push({
          where: `EXISTS { MATCH (${alias})-[:CATEGORIZED]->(c:Category) WHERE c.id IN $${parameter} }`,
          params: { [parameter]: ids },
        })
        continue
      }

      case 'emotions_some': {
        const emotions = (value as { emotion_in?: string[] }).emotion_in
        if (!emotions) throw new UserInputError('emotions_some supports only `emotion_in`.')
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
        if (!authorId) throw new UserInputError('comments_some supports only `author.id`.')
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
        if (!shouterId) throw new UserInputError('shoutedBy_some supports only `id`.')
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
        if (!ids) throw new UserInputError('author_not supports only `id_in`.')
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
export const postFilterToCypher = (
  params: Record<string, unknown>,
  alias = 'post',
): CypherFragment => {
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
