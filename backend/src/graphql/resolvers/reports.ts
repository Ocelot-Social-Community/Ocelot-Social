/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import {
  memberRoleHolds,
  nonMemberReadsContent,
  optionalMemberRoleMatch,
  visibilityOf,
} from './helpers/groupAccessCypher'

import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'

/**
 * Blank the content of a report whose subject sits in a group this moderator may not read.
 *
 * The queue used to return `resource {.*}` with no group filtering at all, which made reporting
 * content the way to read it: a moderator saw the inside of a closed or hidden group here while
 * the same post was invisible to them everywhere else (#9405, concept E19). Metadata stays — the
 * report is still there to be escalated — and `resourceHidden` tells the UI to say why.
 *
 * Three ways the content stays visible, and the first two come from the query because they are
 * about the GROUP rather than about the network role: the group opened its content to
 * non-members, or the moderator's own role in that group lets them read it. Only then does the
 * per-visibility network right decide. `visibility = 'public'` is deliberately NOT a shortcut any
 * more — a public group that closed its content closed it here too.
 *
 * A reported USER carries no group, so nothing is masked for them.
 *
 * Exported for its own spec: it is a pure decision over a report row, and driving it through a
 * seeded moderation queue would say less about it than handing it the rows directly.
 */
/** A report row as the queue's statement returns it, plus the two facts it computes. */
export interface ReportRow {
  [field: string]: unknown
  visibility?: string | null
  readableHere?: boolean
  resource?: Record<string, unknown> | null
}

export const maskUnreadableGroupContent = (
  report: ReportRow,
  effectivePermissions: Context['effectivePermissions'],
): ReportRow & { resourceHidden: boolean } => {
  const visibility = report.visibility
  if (!visibility || report.readableHere === true) {
    return { ...report, resourceHidden: false }
  }
  const readable = effectivePermissions.has(`group.content.read.any_${visibility}` as PermissionKey)
  if (readable) {
    return { ...report, resourceHidden: false }
  }
  const resource = report.resource ?? null
  return {
    ...report,
    resourceHidden: true,
    resource: resource
      ? {
          ...resource,
          title: null,
          content: null,
          contentExcerpt: null,
          image: null,
          post: null,
        }
      : resource,
  }
}

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
        await session.close()
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
            // The group the reported content lives in, so the queue can mask what this moderator
            // may not read (concept E19). A comment is reached through its post; a reported user
            // belongs to no group.
            [(resource)-[:IN]->(g:Group) | g][0] as directGroup,
            [(resource)-[:COMMENTS]->(:Post)-[:IN]->(g:Group) | g][0] as commentedGroup,
            resource {.*, __typename: [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'User']][0] } as resourceWithType
            WITH report, optionalAuthors, optionalCommentedPosts, reviewed, filed,
            coalesce(directGroup, commentedGroup) as group,
            resourceWithType {.*, post: optionalCommentedPosts[0], author: optionalAuthors[0] } as finalResource
            // Whether the content is readable BY THE GROUP's own answer: it opened its content
            // to non-members, or this moderator's role in it grants reading. The network-side
            // per-type right is folded in afterwards, in maskUnreadableGroupContent.
            ${optionalMemberRoleMatch('group', '$viewerId')}
            WITH report, reviewed, filed, finalResource, group,
            (group IS NULL
              OR ${nonMemberReadsContent('group')}
              OR ${memberRoleHolds('group.content.read')}) as readableHere
            RETURN report {.*, resource: finalResource, filed: filed, reviewed: reviewed, visibility: ${visibilityOf('group')}, readableHere: readableHere }
            ${orderByClause}
            ${offset} ${limit}
          `,
          { viewerId: context.user.id },
        )
        return reportsTransactionResponse.records.map((record) => record.get('report'))
      })
      try {
        // `records.map(...)` is always an array, so the `|| []` that used to stand here could
        // not run — an empty result set is already `[]`.
        const reports = await reportsReadTxPromise
        return reports.map((report) =>
          maskUnreadableGroupContent(
            report as ReportRow,
            context.effectivePermissions as Context['effectivePermissions'],
          ),
        )
      } finally {
        await session.close()
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
        await session.close()
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
        await session.close()
      }
      return reviewed
    },
  },
}
