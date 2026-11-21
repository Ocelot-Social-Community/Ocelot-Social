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
        userData.chatDrafts = await session.readTransaction(async (transaction) => {
          const drafts = await transaction.run(chatDraftsCypher, { id })
          return drafts.records.map((record) => record.get('draft'))
        })
        return userData
      } finally {
        await session.close()
      }
    },
  },
}

// The user's unsent drafts (SaveRoomDraft, AddRoomDraftFile), each named after its chat as the
// chat list names it: the group, the group a call takes place in, or the other participant of a
// direct conversation.
const chatDraftsCypher = `
  MATCH (user:User { id: $id })-[chatsIn:CHATS_IN]->(room:Room)
  WHERE chatsIn.draftUpdatedAt IS NOT NULL
  OPTIONAL MATCH (room)-[:ROOM_FOR]->(call:VideoCallSession)
  OPTIONAL MATCH (room)-[:ROOM_FOR|CALL_IN*1..2]->(group:Group)
  OPTIONAL MATCH (room)<-[:CHATS_IN]-(partner:User)
    WHERE group IS NULL AND call IS NULL AND partner.id <> $id
  WITH user, room, chatsIn, call, group, collect(partner)[0] AS partner
  OPTIONAL MATCH (user)-[:DRAFT_FILE]->(file:File)-[:DRAFT_FILE_IN]->(room)
  WITH room, chatsIn, call, group, partner, file ORDER BY datetime(file.createdAt)
  WITH room, chatsIn, call, group, partner, collect(file { .* }) AS files
  RETURN {
    roomId: room.id,
    roomName: COALESCE(group.name, partner.name),
    isCallRoom: call IS NOT NULL,
    text: chatsIn.draft,
    files: files,
    updatedAt: chatsIn.draftUpdatedAt
  } AS draft
  ORDER BY datetime(chatsIn.draftUpdatedAt)
`

export const byCreationDate = (a, b) => {
  if (a.createdAt < b.createdAt) {
    return -1
  }
  if (a.createdAt > b.createdAt) {
    return 1
  }
  return 0
}
