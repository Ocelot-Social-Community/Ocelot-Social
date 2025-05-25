import gql from 'graphql-tag'

export const Statistics = gql`
  query {
    statistics {
      users
      usersDeleted
      posts
      comments
      notifications
      emails
      follows
      shouts
      invites
      chatMessages
      chatRooms
      tags
      locations
      groups
      inviteCodes
      inviteCodesExpired
      inviteCodesRedeemed
      badgesRewarded
      badgesDisplayed
      usersVerified
      reports
    }
  }
`
