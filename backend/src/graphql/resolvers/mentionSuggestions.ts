import type { Context } from '@src/context'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 25

const ACTIVE_MEMBER_ROLES = `['usual', 'admin', 'owner']`

// The suggestions come from two statements, because ranking EVERY user against the post, the
// group and the follow edges costs a handful of pattern checks per user — measured at 140–250 ms
// for a thousand users with nothing typed yet, and growing with the network:
//
// 1. `relatedCypher` walks the edges that make someone related (participant, group member,
//    following, follower) outwards from the post, the group and the current user. Its cost depends
//    on how many such people there are, not on the size of the network.
// 2. `othersCypher` fills what is left of the limit with everyone else. It only runs when the
//    first statement came back short — which also means it has seen ALL related users, so their
//    ids are enough to keep them out of the second one.
//
// Both leave out everyone a mention would not REACH. The exclusions mirror notifyUsersOfMention
// in notificationsMiddleware.ts (blocks, non-public groups), with one deliberate exception: users
// who have MUTED the current user stay in. They are not notified either, but dropping them would
// let anyone read off the list who has muted them.

// The post (if any), its author and the group. A post or group the current user may not see
// yields no row at all, so neither statement can be used to read the members of a closed or
// hidden group off the list.
const contextCypher = `
  MATCH (me:User {id: $user.id})
  OPTIONAL MATCH (post:Post {id: $postId})
  OPTIONAL MATCH (post)<-[:WROTE]-(postAuthor:User)
  OPTIONAL MATCH (postGroup:Group)<-[:IN]-(post)
  OPTIONAL MATCH (givenGroup:Group {id: $groupId})
  WITH me, post, postAuthor, CASE WHEN post IS NULL THEN givenGroup ELSE postGroup END AS group
  OPTIONAL MATCH (me)-[myMembership:MEMBER_OF]->(group)
  WITH me, post, postAuthor, group, myMembership
  WHERE group IS NULL
    OR group.groupType = 'public'
    OR coalesce(myMembership.role IN ${ACTIVE_MEMBER_ROLES}, false)
    OR postAuthor = me
  // Collected once from the few edges of the current user (and the post's author), instead of
  // being checked as a pattern for every candidate.
  WITH me, post, group,
    [(me)-[:BLOCKED]-(blocked:User) | blocked.id]
      + [(postAuthor)-[:BLOCKED]-(blocked:User) | blocked.id] AS blockedIds,
    [(me)-[:MUTED]->(muted:User) | muted.id] AS mutedIds
`

// Matches the start of the slug or of any word of the name. Not the fulltext index: it tokenises
// slugs at their hyphens, so "peter-l" would not find "peter-lustig" through it.
const candidateFilter = `
  user <> me
  AND NOT coalesce(user.deleted, false)
  AND NOT coalesce(user.disabled, false)
  AND NOT user.id IN blockedIds
  AND (
    $term = ''
    OR toLower(user.slug) STARTS WITH $term
    OR toLower(user.name) STARTS WITH $term
    OR toLower(user.name) CONTAINS (' ' + $term)
  )
`

// Within a relation: users the current user has muted last, slug matches before name matches,
// then alphabetically — which also puts an exact slug match first.
const orderAndLimit = `
  ORDER BY
    rank,
    user.id IN mutedIds,
    CASE WHEN toLower(user.slug) STARTS WITH $term THEN 0 ELSE 1 END,
    toLower(user.slug)
  LIMIT toInteger($limit)
`

// "Mentioned" is read from the NOTIFIED edges the mention notifications leave behind; there is no
// edge for the mention itself.
//
// A user can come out of several branches; the lowest rank wins.
const relatedCypher = `
  ${contextCypher}
  CALL {
    WITH post
    MATCH (post)<-[:WROTE]-(user:User)
    RETURN user, 0 AS rank
    UNION
    WITH post
    MATCH (post)<-[:COMMENTS]-(:Comment)<-[:WROTE]-(user:User)
    RETURN user, 0 AS rank
    UNION
    WITH post
    MATCH (post)-[notified:NOTIFIED]->(user:User)
    WHERE notified.reason = 'mentioned_in_post'
    RETURN user, 0 AS rank
    UNION
    WITH post
    MATCH (post)<-[:COMMENTS]-(:Comment)-[notified:NOTIFIED]->(user:User)
    WHERE notified.reason = 'mentioned_in_comment'
    RETURN user, 0 AS rank
    UNION
    WITH group
    MATCH (group)<-[membership:MEMBER_OF]-(user:User)
    WHERE membership.role IN ${ACTIVE_MEMBER_ROLES}
    RETURN user, 1 AS rank
    UNION
    WITH me
    MATCH (me)-[:FOLLOWS]->(user:User)
    RETURN user, 2 AS rank
    UNION
    WITH me
    MATCH (user:User)-[:FOLLOWS]->(me)
    RETURN user, 3 AS rank
  }
  WITH me, group, blockedIds, mutedIds, user, min(rank) AS rank
  WHERE ${candidateFilter}
    AND (
      group IS NULL
      OR group.groupType = 'public'
      OR size([(user)-[membership:MEMBER_OF]->(group)
               WHERE membership.role IN ${ACTIVE_MEMBER_ROLES} | 1]) > 0
    )
  RETURN user {.*} AS user, $relations[rank] AS relation
  ${orderAndLimit}
`

// In a closed or hidden group only active members can be mentioned, and those are all related —
// so there is nobody left to fill up with, and the statement returns nothing.
const othersCypher = `
  ${contextCypher}
  WITH me, group, blockedIds, mutedIds
  WHERE group IS NULL OR group.groupType = 'public'
  MATCH (user:User)
  WHERE ${candidateFilter}
    AND NOT user.id IN $relatedIds
  WITH user, mutedIds, 4 AS rank
  RETURN user {.*} AS user, $relations[rank] AS relation
  ${orderAndLimit}
`

// Index = the rank the statements compute; they look the name up themselves ($relations[rank]).
const RELATIONS = ['participant', 'groupMember', 'following', 'follower', 'other']

interface Suggestion {
  user: Record<string, unknown>
  relation: string
}

export default {
  Query: {
    mentionSuggestions: async (
      _parent,
      args: {
        query?: string | null
        postId?: string | null
        groupId?: string | null
        first?: number | null
      },
      context: Context,
      _resolveInfo,
    ): Promise<Suggestion[]> => {
      const limit = Math.min(Math.max(args.first ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
      const variables = {
        // Always set — the shield rule for this query is isAuthenticated.
        user: context.user,
        relations: RELATIONS,
        term: (args.query ?? '').trim().toLowerCase(),
        postId: args.postId ?? null,
        groupId: args.groupId ?? null,
      }
      const suggestions = async (query: string, extra: Record<string, unknown>) =>
        (
          await context.database.query({ query, variables: { ...variables, ...extra } })
        ).records.map((record): Suggestion => ({
          user: record.get('user') as Record<string, unknown>,
          relation: record.get('relation') as string,
        }))

      const related = await suggestions(relatedCypher, { limit })
      if (related.length >= limit) {
        return related
      }
      const others = await suggestions(othersCypher, {
        limit: limit - related.length,
        relatedIds: related.map(({ user }) => user.id),
      })
      return [...related, ...others]
    },
  },
}
