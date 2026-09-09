import type { Context } from '@src/context'

// Both mutations return the OTHER user, as the schema declares — following someone tells you
// about them, not about yourself.
//
// The old note here said neode "doesn't provide an easy method for retrieving or removing
// relationships" and that pure Cypher "looks cleaner IMO". Both halves have now been acted on.

export default {
  Mutation: {
    followUser: async (
      _object,
      params: { id: string },
      context: Context,
      _resolveInfo,
    ): Promise<unknown> => {
      const { id: followedUserId } = params
      if (!context.user || context.user.id === followedUserId) {
        return null
      }
      // `createdAt` on the edge came from the FOLLOWS property default in db/models/User.ts;
      // db/schema/relationships.ts requires it, so it is written here. ON CREATE, so that
      // following someone twice does not move the date.
      const result = await context.database.write({
        query: `
          MATCH (user:User {id: $currentUserId}), (followedUser:User {id: $followedUserId})
          MERGE (user)-[follows:FOLLOWS]->(followedUser)
          ON CREATE SET follows.createdAt = toString(datetime())
          RETURN followedUser {.*}
        `,
        variables: { currentUserId: context.user.id, followedUserId },
      })
      return result.records[0]?.get('followedUser') ?? null
    },

    unfollowUser: async (
      _object,
      params: { id: string },
      context: Context,
      _resolveInfo,
    ): Promise<unknown> => {
      const { id: followedUserId } = params
      if (!context.user || context.user.id === followedUserId) {
        return null
      }
      // OPTIONAL MATCH on the edge: unfollowing someone you do not follow is a no-op that
      // still returns the user, which is what the previous two-statement version did.
      const result = await context.database.write({
        query: `
          MATCH (followedUser:User {id: $followedUserId})
          OPTIONAL MATCH (:User {id: $currentUserId})-[follows:FOLLOWS]->(followedUser)
          DELETE follows
          RETURN followedUser {.*}
        `,
        variables: { currentUserId: context.user.id, followedUserId },
      })
      return result.records[0]?.get('followedUser') ?? null
    },
  },
}
