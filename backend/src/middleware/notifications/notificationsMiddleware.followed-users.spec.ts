/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { CreateGroup } from '@graphql/queries/CreateGroup'
import { CreatePost } from '@graphql/queries/CreatePost'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const sendNotificationMailMock: (notification) => void = jest.fn()
jest.mock('@src/emails/sendEmail', () => ({
  sendNotificationMail: (notification) => sendNotificationMailMock(notification),
}))

let authenticatedUser: Context['user']
const config = { CATEGORIES_ACTIVE: false }
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

let postAuthor, firstFollower, secondFollower, thirdFollower, emaillessFollower

const notificationQuery = gql`
  query ($read: Boolean) {
    notifications(read: $read, orderBy: updatedAt_desc) {
      read
      reason
      createdAt
      relatedUser {
        id
      }
      from {
        __typename
        ... on Post {
          id
          content
        }
        ... on Comment {
          id
          content
        }
        ... on Group {
          id
        }
      }
    }
  }
`

const followUserMutation = gql`
  mutation ($id: ID!) {
    followUser(id: $id) {
      id
    }
  }
`

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('following users notifications', () => {
  beforeAll(async () => {
    postAuthor = await Factory.build(
      'user',
      {
        id: 'post-author',
        name: 'Post Author',
        slug: 'post-author',
      },
      {
        email: 'post-author@example.org',
        password: '1234',
      },
    )
    firstFollower = await Factory.build(
      'user',
      {
        id: 'first-follower',
        name: 'First Follower',
        slug: 'first-follower',
      },
      {
        email: 'first-follower@example.org',
        password: '1234',
      },
    )
    secondFollower = await Factory.build(
      'user',
      {
        id: 'second-follower',
        name: 'Second Follower',
        slug: 'second-follower',
      },
      {
        email: 'second-follower@example.org',
        password: '1234',
      },
    )
    thirdFollower = await Factory.build(
      'user',
      {
        id: 'third-follower',
        name: 'Third Follower',
        slug: 'third-follower',
      },
      {
        email: 'third-follower@example.org',
        password: '1234',
      },
    )
    emaillessFollower = await database.neode.create('User', {
      id: 'email-less-follower',
      name: 'Email-less Follower',
      slug: 'email-less-follower',
    })
    await secondFollower.update({ emailNotificationsFollowingUsers: false })
    authenticatedUser = await firstFollower.toJson()
    await mutate({
      mutation: followUserMutation,
      variables: { id: 'post-author' },
    })
    authenticatedUser = await secondFollower.toJson()
    await mutate({
      mutation: followUserMutation,
      variables: { id: 'post-author' },
    })
    authenticatedUser = await thirdFollower.toJson()
    await mutate({
      mutation: followUserMutation,
      variables: { id: 'post-author' },
    })
    authenticatedUser = await emaillessFollower.toJson()
    await mutate({
      mutation: followUserMutation,
      variables: { id: 'post-author' },
    })
    jest.clearAllMocks()
  })

  describe('the followed user writes a post', () => {
    beforeAll(async () => {
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'post',
          title: 'This is the post',
          content: 'This is the content of the post',
        },
      })
    })

    it('sends NO notification to the post author', async () => {
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [],
        },
        errors: undefined,
      })
    })

    it('sends notification to the first follower', async () => {
      authenticatedUser = await firstFollower.toJson()
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [
            {
              from: {
                __typename: 'Post',
                id: 'post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
          ],
        },
        errors: undefined,
      })
    })

    it('sends notification to the second follower', async () => {
      authenticatedUser = await secondFollower.toJson()
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [
            {
              from: {
                __typename: 'Post',
                id: 'post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
          ],
        },
        errors: undefined,
      })
    })

    it('sends notification to the email-less follower', async () => {
      authenticatedUser = await emaillessFollower.toJson()
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [
            {
              from: {
                __typename: 'Post',
                id: 'post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
          ],
        },
        errors: undefined,
      })
    })

    it('sends only two emails, as second follower has emails disabled and email-less follower has no email', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(2)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'first-follower@example.org',
          reason: 'followed_user_posted',
        }),
      )
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'third-follower@example.org',
          reason: 'followed_user_posted',
        }),
      )
    })
  })

  describe('followed user posts in public group', () => {
    beforeAll(async () => {
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: CreateGroup,
        variables: {
          id: 'g-1',
          name: 'A group',
          description: 'A group to test the follow user notification',
          groupType: 'public',
          actionRadius: 'national',
        },
      })
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'group-post',
          title: 'This is the post in the group',
          content: 'This is the content of the post in the group',
          groupId: 'g-1',
        },
      })
    })

    it('sends NO notification to the post author', async () => {
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [],
        },
        errors: undefined,
      })
    })

    it('sends a notification to the first follower', async () => {
      authenticatedUser = await firstFollower.toJson()
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [
            {
              from: {
                __typename: 'Post',
                id: 'group-post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
            {
              from: {
                __typename: 'Post',
                id: 'post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
          ],
        },
        errors: undefined,
      })
    })
  })

  describe('followed user posts in closed group', () => {
    beforeAll(async () => {
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: CreateGroup,
        variables: {
          id: 'g-2',
          name: 'A closed group',
          description: 'A group to test the follow user notification',
          groupType: 'closed',
          actionRadius: 'national',
        },
      })
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'closed-group-post',
          title: 'This is the post in the closed group',
          content: 'This is the content of the post in the closed group',
          groupId: 'g-2',
        },
      })
    })

    it('sends NO notification to the post author', async () => {
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [],
        },
        errors: undefined,
      })
    })

    it('sends NO notification to the first follower', async () => {
      authenticatedUser = await firstFollower.toJson()
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [
            {
              from: {
                __typename: 'Post',
                id: 'group-post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
            {
              from: {
                __typename: 'Post',
                id: 'post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
          ],
        },
        errors: undefined,
      })
    })
  })

  describe('followed user posts in hidden group', () => {
    beforeAll(async () => {
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: CreateGroup,
        variables: {
          id: 'g-3',
          name: 'A hidden group',
          description: 'A hidden group to test the follow user notification',
          groupType: 'hidden',
          actionRadius: 'national',
        },
      })
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'hidden-group-post',
          title: 'This is the post in the hidden group',
          content: 'This is the content of the post in the hidden group',
          groupId: 'g-3',
        },
      })
    })

    it('sends NO notification to the post author', async () => {
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [],
        },
        errors: undefined,
      })
    })

    it('sends NO notification to the first follower', async () => {
      authenticatedUser = await firstFollower.toJson()
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [
            {
              from: {
                __typename: 'Post',
                id: 'group-post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
            {
              from: {
                __typename: 'Post',
                id: 'post',
              },
              read: false,
              reason: 'followed_user_posted',
            },
          ],
        },
        errors: undefined,
      })
    })
  })
})
