/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
        return reviewed || null
      } finally {
        session.close()
      }
    },
  },
}
