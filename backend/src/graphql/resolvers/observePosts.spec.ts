/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import gql from 'graphql-tag'

import CONFIG from '@config/index'
import Factory, { cleanDatabase } from '@db/factories'
import { createPostMutation } from '@graphql/queries/createPostMutation'

CONFIG.CATEGORIES_ACTIVE = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { authenticateUser, client } = global as any

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
beforeAll(async () => {
  await cleanDatabase()
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
    authenticateUser(await user.toJson())
  })

  describe('creating posts', () => {
    it('has the author of the post observing the post', async () => {
      await expect(
        client.mutate({
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
      authenticateUser(await otherUser.toJson())
    })

    it('has another user NOT observing the post BEFORE commenting it', async () => {
      await expect(
        client.query({
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
        client.mutate({
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
        client.query({
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
      authenticateUser(await otherUser.toJson())
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
          client.mutate({
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
          client.mutate({
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
          client.query({
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
          client.mutate({
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
