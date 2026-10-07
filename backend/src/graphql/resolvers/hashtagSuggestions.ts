import type { Context } from '@src/context'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 25

// The tags of the current user's own posts are collected once, from that user outwards, instead
// of being checked as a pattern for every tag.
//
// Within a relation an exact match comes first — the editor reads off the list whether the typed
// tag exists already — then the tags carried by the most posts.
const hashtagSuggestionsCypher = `
  MATCH (me:User {id: $user.id})
  WITH [(me)-[:WROTE]->(:Post)-[:TAGGED]->(mine:Tag) | mine.id] AS myTagIds
  MATCH (tag:Tag)
  WHERE NOT coalesce(tag.deleted, false)
    AND NOT coalesce(tag.disabled, false)
    AND ($term = '' OR toLower(tag.id) STARTS WITH $term)
  WITH tag,
    CASE WHEN tag.id IN myTagIds THEN 0 ELSE 1 END AS rank,
    size([(tag)<-[:TAGGED]-(post:Post) | post]) AS taggedCount
  RETURN tag {.*} AS tag, $relations[rank] AS relation
  ORDER BY
    rank,
    CASE WHEN toLower(tag.id) = $term THEN 0 ELSE 1 END,
    taggedCount DESC,
    toLower(tag.id)
  LIMIT toInteger($limit)
`

// Index = the rank the statement computes; it looks the name up itself ($relations[rank]).
const RELATIONS = ['usedByMe', 'popular']

interface Suggestion {
  tag: Record<string, unknown>
  relation: string
}

export default {
  Query: {
    hashtagSuggestions: async (
      _parent,
      args: { query?: string | null; first?: number | null },
      context: Context,
      _resolveInfo,
    ): Promise<Suggestion[]> => {
      const result = await context.database.query({
        query: hashtagSuggestionsCypher,
        variables: {
          // Always set — the shield rule for this query is isAuthenticated.
          user: context.user,
          relations: RELATIONS,
          term: (args.query ?? '').trim().toLowerCase(),
          limit: Math.min(Math.max(args.first ?? DEFAULT_LIMIT, 1), MAX_LIMIT),
        },
      })
      return result.records.map((record): Suggestion => ({
        tag: record.get('tag') as Record<string, unknown>,
        relation: record.get('relation') as string,
      }))
    },
  },
}
