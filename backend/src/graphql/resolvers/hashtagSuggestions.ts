import type { Context } from '@src/context'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 25

// The tags of the current user's own posts are collected once, from that user outwards, instead
// of being checked as a pattern for every tag.
//
// Within a relation an exact match comes first — the editor reads off the list whether the typed
// tag exists already — then the tags carried by the most posts.
const hashtagSuggestionsCypher = `
  MATCH (me:User {id: $userId})
  WITH [(me)-[:WROTE]->(:Post)-[:TAGGED]->(mine:Tag) | mine.id] AS myTagIds
  MATCH (tag:Tag)
  WHERE NOT coalesce(tag.deleted, false)
    AND NOT coalesce(tag.disabled, false)
    AND ($term = '' OR toLower(tag.id) STARTS WITH $term)
  WITH tag,
    CASE WHEN tag.id IN myTagIds THEN 0 ELSE 1 END AS rank,
    size([(tag)<-[:TAGGED]-(post:Post) | post]) AS taggedCount
  RETURN tag {.*} AS tag, rank
  ORDER BY
    rank,
    CASE WHEN toLower(tag.id) = $term THEN 0 ELSE 1 END,
    taggedCount DESC,
    toLower(tag.id)
  LIMIT toInteger($limit)
`

// Index = the rank the statement returns.
const RELATIONS = ['usedByMe', 'popular']

const toNumber = (value: unknown): number =>
  typeof value === 'number' ? value : (value as { toNumber: () => number }).toNumber()

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
      if (!context.user) {
        return []
      }
      const result = await context.database.query({
        query: hashtagSuggestionsCypher,
        variables: {
          userId: context.user.id,
          term: (args.query ?? '').trim().toLowerCase(),
          limit: Math.min(Math.max(args.first ?? DEFAULT_LIMIT, 1), MAX_LIMIT),
        },
      })
      return result.records.map((record): Suggestion => ({
        tag: record.get('tag') as Record<string, unknown>,
        relation: RELATIONS[toNumber(record.get('rank'))],
      }))
    },
  },
}
