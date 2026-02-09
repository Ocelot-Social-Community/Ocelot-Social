/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export default {
  Mutation: {
    fileReport: async (_parent, params, context, _resolveInfo) => {
      const { resourceId, reasonCategory, reasonDescription } = params
      const { driver, user } = context
      const session = driver.session()
      const fileReportWriteTxResultPromise = session.writeTransaction(async (transaction) => {
        const fileReportTransactionResponse = await transaction.run(
          `
            MATCH (submitter:User {id: $submitterId})
            MATCH (resource {id: $resourceId})
            WHERE resource:User OR resource:Post OR resource:Comment
            MERGE (resource)<-[:BELONGS_TO]-(report:Report {closed: false})
            ON CREATE SET report.id = randomUUID(), report.createdAt = $createdAt, report.updatedAt = $createdAt, report.rule = 'latestReviewUpdatedAtRules', report.disable = resource.disabled, report.closed = false
            WITH submitter, resource, report
            CREATE (report)<-[filed:FILED {createdAt: $createdAt, reasonCategory: $reasonCategory, reasonDescription: $reasonDescription}]-(submitter)

            WITH filed, report, resource {.*, __typename: [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'User']][0]} AS finalResource
            RETURN filed {.*, reportId: report.id, resource: properties(finalResource)} AS filedReport
          `,
          {
            resourceId,
            submitterId: user.id,
            createdAt: new Date().toISOString(),
            reasonCategory,
            reasonDescription,
          },
        )
        return fileReportTransactionResponse.records.map((record) => record.get('filedReport'))
      })
      try {
        const [filedReport] = await fileReportWriteTxResultPromise
        return filedReport || null
      } finally {
        session.close()
      }
    },
  },
  Query: {
    reports: async (_parent, params, context, _resolveInfo) => {
      const { driver } = context
      const session = driver.session()
      let orderByClause
      const filterClauses: string[] = []
      switch (params.orderBy) {
        case 'createdAt_asc':
          orderByClause = 'ORDER BY report.createdAt ASC'
          break
        case 'createdAt_desc':
          orderByClause = 'ORDER BY report.createdAt DESC'
          break
        default:
          orderByClause = ''
      }

      switch (params.reviewed) {
        case true:
          filterClauses.push('AND ((report)<-[:REVIEWED]-(:User))')
          break
        case false:
          filterClauses.push('AND NOT ((report)<-[:REVIEWED]-(:User))')
          break
      }

      switch (params.closed) {
        case true:
          filterClauses.push('AND report.closed = true')
          break
        case false:
          filterClauses.push('AND report.closed = false')
          break
      }

      const filterClause = filterClauses.join(' ')

      const offset =
        params.offset && typeof params.offset === 'number' ? `SKIP ${params.offset}` : ''
      const limit = params.first && typeof params.first === 'number' ? `LIMIT ${params.first}` : ''

      const reportsReadTxPromise = session.readTransaction(async (transaction) => {
        const reportsTransactionResponse = await transaction.run(
          // !!! this Cypher query returns multiple reports on the same resource! i will create an issue for refactoring (bug fixing)
          `
            MATCH (report:Report)-[:BELONGS_TO]->(resource)
            WHERE (resource:User OR resource:Post OR resource:Comment)
            ${filterClause}
            WITH report, resource,
            [(submitter:User)-[filed:FILED]->(report) |  filed {.*, submitter: properties(submitter)} ] as filed,
            [(moderator:User)-[reviewed:REVIEWED]->(report) |  reviewed {.*, moderator: properties(moderator)} ] as reviewed,
            [(resource)<-[:WROTE]-(author:User) | author {.*} ] as optionalAuthors,
            [(resource)-[:COMMENTS]->(post:Post)<-[:WROTE]-(author:User) | post {.*, author: properties(author), postType: [l IN labels(post) WHERE NOT l = 'Post']} ] as optionalCommentedPosts,
            resource {.*, __typename: [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'User']][0] } as resourceWithType
            WITH report, optionalAuthors, optionalCommentedPosts, reviewed, filed,
            resourceWithType {.*, post: optionalCommentedPosts[0], author: optionalAuthors[0] } as finalResource
            RETURN report {.*, resource: finalResource, filed: filed, reviewed: reviewed }
            ${orderByClause}
            ${offset} ${limit}
          `,
        )
        return reportsTransactionResponse.records.map((record) => record.get('report'))
      })
      try {
        const reports = await reportsReadTxPromise
        return reports || []
      } finally {
        session.close()
      }
    },
  },
  Report: {
    // This field is inline queried in the cypher statement above
    /* filed: async (parent, _params, context, _resolveInfo) => {
      if (typeof parent.filed !== 'undefined') return parent.filed
      const session = context.driver.session()
      const { id } = parent
      let filed
      const readTxPromise = session.readTransaction(async (transaction) => {
        const filedReportsTransactionResponse = await transaction.run(
          `
            MATCH (submitter:User)-[filed:FILED]->(report:Report {id: $id})
            RETURN filed, submitter
          `,
          { id },
        )
        return filedReportsTransactionResponse.records.map((record) => ({
          submitter: record.get('submitter').properties,
          filed: record.get('filed').properties,
        }))
      })
      try {
        const filedReports = await readTxPromise
        filed = filedReports.map((reportedRecord) => {
          const { submitter, filed } = reportedRecord
          const relationshipWithNestedAttributes = {
            ...filed,
            submitter,
          }
          return relationshipWithNestedAttributes
        })
      } finally {
        session.close()
      }
      return filed
    }, */
    reviewed: async (parent, _params, context, _resolveInfo) => {
      // if (typeof parent.reviewed !== 'undefined') return parent.reviewed
      const session = context.driver.session()
      const { id } = parent
      let reviewed
      const readTxPromise = session.readTransaction(async (transaction) => {
        const reviewedReportsTransactionResponse = await transaction.run(
          `
            MATCH (resource)<-[:BELONGS_TO]-(report:Report {id: $id})<-[review:REVIEWED]-(moderator:User)
            RETURN moderator, review
            ORDER BY report.updatedAt DESC, review.updatedAt DESC
          `,
          { id },
        )
        return reviewedReportsTransactionResponse.records.map((record) => ({
          review: record.get('review').properties,
          moderator: record.get('moderator').properties,
        }))
      })
      try {
        const reviewedReports = await readTxPromise
        reviewed = reviewedReports.map((reportedRecord) => {
          const { review, moderator } = reportedRecord
          const relationshipWithNestedAttributes = {
            ...review,
            moderator,
          }
          return relationshipWithNestedAttributes
        })
      } finally {
        session.close()
      }
      return reviewed
    },
  },
}
