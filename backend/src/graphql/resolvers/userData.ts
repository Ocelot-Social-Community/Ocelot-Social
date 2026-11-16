/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  optionalWithholdingGroupMatch,
  readsWithholdingGroupContent,
} from './helpers/groupAccessCypher'
import { groupReadScope } from './helpers/viewerGroups'

import type { Context } from '@src/context'

export default {
  Query: {
    userData: async (_object, _args, context, _resolveInfo) => {
      const id = context.user.id
      // The user's own posts come whole, and so does everything the user wrote under them — it is
      // their data. What others wrote there only where the user still reads the group: leaving
      // it keeps the post, not the members' comments (#10629). No elevation: an export is not a
      // look into one group.
      const { contentGroupIds } = await groupReadScope(context as Context)
      const cypher = `
        MATCH (user:User { id: $id })
        WITH user
        OPTIONAL MATCH (posts:Post)
        WHERE (user)-[:WROTE]->(posts)
        AND posts.deleted = FALSE
        AND posts.disabled = FALSE
        // Bound here: Neo4j 4.4 takes no EXISTS subquery inside the projection below.
        ${optionalWithholdingGroupMatch('posts', 'contentGroupIds', 'elevatedGroupIds')}
        WITH user, posts, ${readsWithholdingGroupContent} AS readsGroup
        RETURN { user: properties(user),
          posts: collect( 
            posts {
              .*,
              author: [
                (posts)<-[:WROTE]-(author:User) |
                author {
                  .*
                }  
              ][0],
              comments: [
                (posts)<-[:COMMENTS]-(comment:Comment)
                WHERE comment.disabled = FALSE
                AND comment.deleted = FALSE
                AND (readsGroup OR (comment)<-[:WROTE]-(user)) |
                  comment {
                    .*,
                    author: [ (comment)<-[:WROTE]-(commentator:User) |
                      commentator { .name, .slug, .id } ][0]
                  }
              ],
              categories: [ (posts)-[:CATEGORIZED]->(category:Category) |
                category { .name, .id } ]
          })
        } AS result`
      const session = context.driver.session()
      try {
        const result = await session.readTransaction(async (transaction) => {
          return await transaction.run(cypher, { id, contentGroupIds, elevatedGroupIds: [] })
        })
        const userData = result.records[0].get('result')
        userData.posts.sort(byCreationDate)
        userData.posts.forEach((post) => post.comments.sort(byCreationDate))
        return userData
      } finally {
        await session.close()
      }
    },
  },
}

export const byCreationDate = (a, b) => {
  if (a.createdAt < b.createdAt) {
    return -1
  }
  if (a.createdAt > b.createdAt) {
    return 1
  }
  return 0
}
