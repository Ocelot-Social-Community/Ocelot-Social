/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import CONFIG from '@config/index'
import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import { createPostMutation } from '@graphql/queries/createPostMutation'
import createServer, { getContext } from '@src/server'

CONFIG.CATEGORIES_ACTIVE = false

let query
let mutate
let authenticatedUser
let user
let otherUser

const createCommentMutation = gql`
  mutation ($id: ID, $postId: ID!, $content: String!) {
    CreateComment(id: $id, postId: $postId, content: $content) {
      id
      isPostObservedByMe
      postObservingUsersCount
    }
  }
`

const postQuery = gql`
  query Post($id: ID) {
    Post(id: $id) {
      isObservedByMe
      observingUsersCount
    }
  }
`

const database = databaseContext()

let server: ApolloServer
beforeAll(async () => {
  await cleanDatabase()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await
  const contextUser = async (_req) => authenticatedUser
  const context = getContext({ user: contextUser, database })

  server = createServer({ context }).server

  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('observing posts', () => {
  beforeAll(async () => {
    user = await Factory.build('user', {
      id: 'user',
      name: 'User',
      about: 'I am a user',
    })
    otherUser = await Factory.build('user', {
      id: 'other-user',
      name: 'Other User',
      about: 'I am another user',
    })
    authenticatedUser = await user.toJson()
  })

  describe('creating posts', () => {
    it('has the author of the post observing the post', async () => {
      await expect(
        mutate({
          mutation: createPostMutation(),
          variables: {
            id: 'p2',
            title: 'A post the author should observe',
            content: 'The author of this post is expected to observe the post',
          },
        }),
      ).resolves.toMatchObject({
        data: {
          CreatePost: {
            isObservedByMe: true,
            observingUsersCount: 1,
          },
        },
        errors: undefined,
      })
    })
  })

  describe('commenting posts', () => {
    beforeAll(async () => {
      authenticatedUser = await otherUser.toJson()
    })

    it('has another user NOT observing the post BEFORE commenting it', async () => {
      await expect(
        query({
          query: postQuery,
          variables: { id: 'p2' },
        }),
      ).resolves.toMatchObject({
        data: {
          Post: [
            {
              isObservedByMe: false,
              observingUsersCount: 1,
            },
          ],
        },
        errors: undefined,
      })
    })

    it('has another user observing the post AFTER commenting it', async () => {
      await expect(
        mutate({
          mutation: createCommentMutation,
          variables: {
            postId: 'p2',
            content: 'After commenting the post, I should observe the post automatically',
          },
        }),
      ).resolves.toMatchObject({
        data: {
          CreateComment: {
            isPostObservedByMe: true,
            postObservingUsersCount: 2,
          },
        },
      })

      await expect(
        query({
          query: postQuery,
          variables: { id: 'p2' },
        }),
      ).resolves.toMatchObject({
        data: {
          Post: [
            {
              isObservedByMe: true,
              observingUsersCount: 2,
            },
          ],
        },
        errors: undefined,
      })
    })
  })

  describe('toggle observe post', () => {
    beforeAll(async () => {
      authenticatedUser = await otherUser.toJson()
    })

    const toggleObservePostMutation = gql`
      mutation ($id: ID!, $value: Boolean!) {
        toggleObservePost(id: $id, value: $value) {
          isObservedByMe
          observingUsersCount
        }
      }
    `

    describe('switch off observation', () => {
      it('does not observe the post anymore', async () => {
        await expect(
          mutate({
            mutation: toggleObservePostMutation,
            variables: {
              id: 'p2',
              value: false,
            },
          }),
        ).resolves.toMatchObject({
          data: {
            toggleObservePost: {
              isObservedByMe: false,
              observingUsersCount: 1,
            },
          },
          errors: undefined,
        })
      })
    })

    describe('comment the post again', () => {
      it('does NOT alter the observation state', async () => {
        await expect(
          mutate({
            mutation: createCommentMutation,
            variables: {
              postId: 'p2',
              content:
                'After commenting the post I do not observe again, I should NOT observe the post',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            CreateComment: {
              isPostObservedByMe: false,
              postObservingUsersCount: 1,
            },
          },
        })

        await expect(
          query({
            query: postQuery,
            variables: { id: 'p2' },
          }),
        ).resolves.toMatchObject({
          data: {
            Post: [
              {
                isObservedByMe: false,
                observingUsersCount: 1,
              },
            ],
          },
          errors: undefined,
        })
      })
    })

    describe('switch on observation', () => {
      it('does observe the post again', async () => {
        await expect(
          mutate({
            mutation: toggleObservePostMutation,
            variables: {
              id: 'p2',
              value: true,
            },
          }),
        ).resolves.toMatchObject({
          data: {
            toggleObservePost: {
              isObservedByMe: true,
              observingUsersCount: 2,
            },
          },
          errors: undefined,
        })
      })
    })
  })
})
