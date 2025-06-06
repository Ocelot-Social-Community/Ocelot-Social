/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
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

let postAuthor, firstCommenter, secondCommenter, emaillessObserver

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

describe('notifications for users that observe a post', () => {
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
    firstCommenter = await Factory.build(
      'user',
      {
        id: 'first-commenter',
        name: 'First Commenter',
        slug: 'first-commenter',
      },
      {
        email: 'first-commenter@example.org',
        password: '1234',
      },
    )
    secondCommenter = await Factory.build(
      'user',
      {
        id: 'second-commenter',
        name: 'Second Commenter',
        slug: 'second-commenter',
      },
      {
        email: 'second-commenter@example.org',
        password: '1234',
      },
    )
    emaillessObserver = await database.neode.create('User', {
      id: 'email-less-observer',
      name: 'Email-less Observer',
      slug: 'email-less-observer',
    })
    authenticatedUser = await postAuthor.toJson()
    await mutate({
      mutation: createPostMutation,
      variables: {
        id: 'post',
        title: 'This is the post',
        content: 'This is the content of the post',
      },
    })
    authenticatedUser = await emaillessObserver.toJson()
    await mutate({
      mutation: toggleObservePostMutation,
      variables: {
        id: 'post',
        value: true,
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

    it('sends one email', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'post-author@example.org',
          reason: 'commented_on_post',
        }),
      )
    })

    describe('second comment on post', () => {
      beforeAll(async () => {
        jest.clearAllMocks()
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

      it('sends two emails', () => {
        expect(sendNotificationMailMock).toHaveBeenCalledTimes(2)
        expect(sendNotificationMailMock).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'post-author@example.org',
            reason: 'commented_on_post',
          }),
        )
        expect(sendNotificationMailMock).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'first-commenter@example.org',
            reason: 'commented_on_post',
          }),
        )
      })
    })

    describe('first commenter unfollows the post and post author comments post', () => {
      beforeAll(async () => {
        jest.clearAllMocks()
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

      it('sends one email', () => {
        expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
        expect(sendNotificationMailMock).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'second-commenter@example.org',
            reason: 'commented_on_post',
          }),
        )
      })
    })
  })
})
