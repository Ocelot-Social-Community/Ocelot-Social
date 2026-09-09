/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UserInputError } from '@graphql/errors'

export default {
  Mutation: {
    review: async (_object, params, context, _resolveInfo) => {
      const { user: moderator, driver } = context

      const session = driver.session()
      try {
        const cypher = ` 
            MATCH (moderator:User {id: $moderatorId})
            MATCH (resource {id: $params.resourceId})<-[:BELONGS_TO]-(report:Report {closed: false})
            WHERE resource:User OR resource:Post OR resource:Comment
            MERGE (report)<-[review:REVIEWED]-(moderator)
            ON CREATE SET review.createdAt = $dateTime, review.updatedAt = $dateTime
            ON MATCH SET review.updatedAt = $dateTime
            SET review.disable = $params.disable
            SET report.updatedAt = $dateTime, report.disable = review.disable, report.closed = $params.closed
            SET resource.disabled = report.disable

            WITH review, report, resource {.*, __typename: [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'User']][0]} AS finalResource
            RETURN review {.*, report: properties(report), resource: properties(finalResource)}
          `
        const reviewWriteTxResultPromise = session.writeTransaction(async (txc) => {
          const reviewTransactionResponse = await txc.run(cypher, {
            params,
            moderatorId: moderator.id,
            dateTime: new Date().toISOString(),
          })
          return reviewTransactionResponse.records.map((record) => record.get('review'))
        })
        const [reviewed] = await reviewWriteTxResultPromise
        // Preconditions (resource exists, has an open report, not self/own-content) are
        // enforced by the validateReview middleware before this resolver runs, so a
        // missing report surfaces there with a specific message rather than as a null
        // here. `?? null` only covers the negligible race where the report is closed
        // between validation and this write.
        /* v8 ignore next -- the race described above; validateReview rejects every other case */
        return reviewed ?? null
      } finally {
        await session.close()
      }
    },

    // Directly deactivate / reactivate a user account — the reversible, moderator-grade
    // counterpart to the irreversible, admin-only DeleteUser. Unlike `review` it needs
    // no report; it just toggles user.disabled. The shield gates it on the user.disable
    // permission AND the act-on hierarchy (canActOnTargetUser), so a moderator cannot
    // disable a peer or a higher-privileged user.
    disableUser: async (_object, params, context) => {
      const { id, disable } = params
      const session = context.driver.session()
      try {
        const writeTxResultPromise = session.writeTransaction(async (txc) => {
          const response = await txc.run(
            `
              MATCH (user:User {id: $id})
              SET user.disabled = $disable
              RETURN user {.*}
            `,
            { id, disable },
          )
          return response.records.map((record) => record.get('user'))
        })
        const [user] = await writeTxResultPromise
        if (!user) {
          // No User with that id (deleted concurrently). The shield's dominance check
          // treats a missing target as a baseline user and lets it through, so this is
          // reachable; fail loudly rather than returning a success-looking null.
          throw new UserInputError('Could not find User')
        }
        return user
      } finally {
        await session.close()
      }
    },
  },
}
