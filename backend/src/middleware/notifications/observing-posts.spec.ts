import gql from 'graphql-tag'
import { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import createServer from '@src/server'
import { createTestClient } from 'apollo-server-testing'

import CONFIG from '@config/index'

CONFIG.CATEGORIES_ACTIVE = false

let server, query, mutate, authenticatedUser

let postAuthor, firstCommenter, secondCommenter

const driver = getDriver()
const neode = getNeode()

const createPostMutation = gql`
  mutation ($id: ID, $title: String!, $content: String!) {
    CreatePost(id: $id, title: $title, content: $content) {
      id
      title
      content
    }
  }
`

const createCommentMutation = gql`
  mutation ($id: ID, $postId: ID!, $content: String!) {
    CreateComment(id: $id, postId: $postId, content: $content) {
      id
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

const toggleObservePostMutation = gql`
  mutation ($id: ID!, $value: Boolean!) {
    toggleObservePost(id: $id, value: $value) {
      isObservedByMe
      observingUsersCount
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

describe('notifications for users that observe a post', () => {
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
    firstCommenter = await neode.create(
      'User',
      {
        id: 'first-commenter',
        name: 'First Commenter',
        slug: 'first-commenter',
      },
      {
        email: 'test2@example.org',
        password: '1234',
      },
    )
    secondCommenter = await neode.create(
      'User',
      {
        id: 'second-commenter',
        name: 'Second Commenter',
        slug: 'second-commenter',
      },
      {
        email: 'test3@example.org',
        password: '1234',
      },
    )
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

  describe('first comment on the post', () => {
    beforeAll(async () => {
      authenticatedUser = await firstCommenter.toJson()
      await mutate({
        mutation: createCommentMutation,
        variables: {
          postId: 'post',
          id: 'c-1',
          content: 'first comment of first commenter',
        },
      })
    })

    it('sends NO notification to the commenter', async () => {
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

    it('sends notification to the author', async () => {
      authenticatedUser = await postAuthor.toJson()
      await expect(
        query({
          query: notificationQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [
            {
              from: {
                __typename: 'Comment',
                id: 'c-1',
              },
              read: false,
              reason: 'commented_on_post',
            },
          ],
        },
        errors: undefined,
      })
    })

    describe('second comment on post', () => {
      beforeAll(async () => {
        authenticatedUser = await secondCommenter.toJson()
        await mutate({
          mutation: createCommentMutation,
          variables: {
            postId: 'post',
            id: 'c-2',
            content: 'first comment of second commenter',
          },
        })
      })

      it('sends NO notification to the commenter', async () => {
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

      it('sends notification to the author', async () => {
        authenticatedUser = await postAuthor.toJson()
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                from: {
                  __typename: 'Comment',
                  id: 'c-2',
                },
                read: false,
                reason: 'commented_on_post',
              },
              {
                from: {
                  __typename: 'Comment',
                  id: 'c-1',
                },
                read: false,
                reason: 'commented_on_post',
              },
            ],
          },
          errors: undefined,
        })
      })

      it('sends notification to first commenter', async () => {
        authenticatedUser = await firstCommenter.toJson()
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                from: {
                  __typename: 'Comment',
                  id: 'c-2',
                },
                read: false,
                reason: 'commented_on_post',
              },
            ],
          },
          errors: undefined,
        })
      })
    })

    describe('first commenter unfollows the post and post author comments post', () => {
      beforeAll(async () => {
        authenticatedUser = await firstCommenter.toJson()
        await mutate({
          mutation: toggleObservePostMutation,
          variables: {
            id: 'post',
            value: false,
          },
        })

        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: createCommentMutation,
          variables: {
            postId: 'post',
            id: 'c-3',
            content: 'first comment of post author',
          },
        })
      })

      it('sends no new notification to the post author', async () => {
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                from: {
                  __typename: 'Comment',
                  id: 'c-2',
                },
                read: false,
                reason: 'commented_on_post',
              },
              {
                from: {
                  __typename: 'Comment',
                  id: 'c-1',
                },
                read: false,
                reason: 'commented_on_post',
              },
            ],
          },
          errors: undefined,
        })
      })

      it('sends no new notification to first commenter', async () => {
        authenticatedUser = await firstCommenter.toJson()
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                from: {
                  __typename: 'Comment',
                  id: 'c-2',
                },
                read: false,
                reason: 'commented_on_post',
              },
            ],
          },
          errors: undefined,
        })
      })

      it('sends notification to second commenter', async () => {
        authenticatedUser = await secondCommenter.toJson()
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                from: {
                  __typename: 'Comment',
                  id: 'c-3',
                },
                read: false,
                reason: 'commented_on_post',
              },
            ],
          },
          errors: undefined,
        })
      })
    })
  })
})
