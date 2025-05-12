/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/dot-notation */
import { Context } from '@src/server'

export default {
  Query: {
    statistics: async (_parent, _args, context: Context) => {
      const statistics = {
        users: 0,
        usersDeleted: 0,
        posts: 0,
        comments: 0,
        notifications: 0,
        emails: 0,
        follows: 0,
        shouts: 0,
        invites: 0,
        chatMessages: 0,
        chatRooms: 0,
        tags: 0,
        locations: 0,
        groups: 0,
        inviteCodes: 0,
        inviteCodesExpired: 0,
        inviteCodesRedeemed: 0,
        badgesRewarded: 0,
        badgesDisplayed: 0,
        usersVerified: 0,
        reports: 0,
      }
      const [metaStats] = (
        await context.database.query({
          query: `CALL apoc.meta.stats() YIELD labels, relTypesCount
              RETURN labels, relTypesCount`,
        })
      ).records.map((record) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return { ...record.get('labels'), ...record.get('relTypesCount') }
      })

      const deletedUsers = parseInt(
        (
          await context.database.query({
            query: `MATCH (u:User) WHERE NOT (u)-[:PRIMARY_EMAIL]->(:EmailAddress) RETURN toString(count(u)) AS count`,
          })
        ).records[0].get('count') as string,
      )

      const invalidInviteCodes = parseInt(
        (
          await context.database.query({
            query: `MATCH (i:InviteCode) WHERE NOT i.expiresAt IS NULL OR i.expiresAt >= datetime()  RETURN toString(count(i)) AS count`,
          })
        ).records[0].get('count') as string,
      )

      statistics.users = metaStats['User'].toNumber() - deletedUsers
      statistics.usersDeleted = deletedUsers
      statistics.posts = metaStats['Post'].toNumber()
      statistics.comments = metaStats['Comment'].toNumber()
      statistics.notifications = metaStats['NOTIFIED'].toNumber()
      statistics.emails = metaStats['EmailAddress'].toNumber()
      statistics.follows = metaStats['FOLLOWS'].toNumber()
      statistics.shouts = metaStats['SHOUTED'].toNumber()
      statistics.invites = statistics.emails - statistics.users
      statistics.chatMessages = metaStats['Message'].toNumber()
      statistics.chatRooms = metaStats['Room'].toNumber()
      statistics.tags = metaStats['Tag'].toNumber()
      statistics.locations = metaStats['Location'].toNumber()
      statistics.groups = metaStats['Group'].toNumber()
      statistics.inviteCodes = metaStats['InviteCode'].toNumber() - invalidInviteCodes
      statistics.inviteCodesExpired = invalidInviteCodes
      statistics.inviteCodesRedeemed = metaStats['REDEEMED'].toNumber()
      statistics.badgesRewarded = metaStats['REWARDED'].toNumber()
      statistics.badgesDisplayed = metaStats['SELECTED'].toNumber()
      statistics.usersVerified = metaStats['VERIFIES'].toNumber()
      statistics.reports = metaStats['InviteCode'].toNumber()
      return statistics
    },
  },
}
