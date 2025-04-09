import gql from 'graphql-tag'
import { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'
import { createGroupMutation, joinGroupMutation } from '../../graphql/groups'

import CONFIG from '../../config'

CONFIG.CATEGORIES_ACTIVE = false

let server, query, mutate, authenticatedUser

let postAuthor, firstFollower, secondFollower

const driver = getDriver()
const neode = getNeode()

const createPostMutation = gql`
  mutation ($id: ID, $title: String!, $content: String!, $groupId: ID) {
    CreatePost(id: $id, title: $title, content: $content, groupId: $groupId) {
      id
      title
      content
    }
  }
`

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

  const createServerResult = createServer({
    context: () => {
      return {
        user: authenticatedUser,
        neode,
        driver,
        cypherParams: {
          currentUserId: authenticatedUser ? authenticatedUser.id : null,
        },
      }
    },
  })
  server = createServerResult.server
  const createTestClientResult = createTestClient(server)
  query = createTestClientResult.query
  mutate = createTestClientResult.mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

describe('following users notifications', () => {
  beforeAll(async () => {
    postAuthor = await neode.create(
      'User',
      {
        id: 'post-author',
        name: 'Post Author',
        slug: 'post-author',
      },
      {
        email: 'test@example.org',
        password: '1234',
      },
    )
    firstFollower = await neode.create(
      'User',
      {
        id: 'first-follower',
        name: 'First Follower',
        slug: 'first-follower',
      },
      {
        email: 'test2@example.org',
        password: '1234',
      },
    )
    secondFollower = await neode.create(
      'User',
      {
        id: 'second-follower',
        name: 'Second Follower',
        slug: 'second-follower',
      },
      {
        email: 'test3@example.org',
        password: '1234',
      },
    )
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
  })

  describe('the followed user writes a post', () => {
    beforeAll(async () => {
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: createPostMutation,
        variables: {
          id: 'post',
          title: 'This is the post',
          content: 'This is the content of the post',
        },
      })
    })

    it('sends no notification to the post author', async () => {
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
  })

  describe('followed user posts in group', () => {
    beforeAll(async () => {
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: createGroupMutation(),
        variables: {
          id: 'g-1',
          name: 'A group',
          description: 'A group to test the follow user notification',
          groupType: 'public',
          actionRadius: 'national',
        },
      })
      authenticatedUser = await firstFollower.toJson()
      await mutate({
        mutation: joinGroupMutation(),
        variables: {
          groupId: 'g-1',
          userId: 'first-follower',
        },
      })
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: createPostMutation,
        variables: {
          id: 'group-post',
          title: 'This is the post in the group',
          content: 'This is the content of the post in the group',
          groupId: 'g-1',
        },
      })
    })

    it('sends the join group notification to the post author', async () => {
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [
            {
              from: {
                __typename: 'Group',
                id: 'g-1',
              },
              read: false,
              reason: 'user_joined_group',
              relatedUser: {
                id: 'first-follower',
              },
            },
          ],
        },
        errors: undefined,
      })
    })

    it('sends a notification to the first follower but with the reason post-in-group', async () => {
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
              reason: 'post_in_group',
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
