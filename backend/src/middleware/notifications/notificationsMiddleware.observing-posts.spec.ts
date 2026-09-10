/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { beforeAll, afterAll, describe, it, expect } from 'vitest'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const sendNotificationMailMock: (notification) => void = vi.fn()
vi.mock('@src/emails/sendEmail', () => ({
  sendNotificationMail: (notification) => {
    sendNotificationMailMock(notification)
  },
  // ESM links the whole namespace: every named export ANY importer in the graph reaches
  // for must exist here, or the module fails to link (loginMiddleware pulls the
  // registration/verification mails in transitively). Under CommonJS a missing key was
  // simply undefined and only mattered if it was called. The stubs below carry no
  // behaviour — only the two above are asserted on.
  defaultParams: vi.fn(),
  sendChatMessageMail: vi.fn(),
  sendRegistrationMail: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendResetPasswordMail: vi.fn(),
  sendWrongEmail: vi.fn(),
}))

// Vitest clears mock call records before EVERY test (the v5 default), so an `it` can no longer
// read the calls its own `beforeAll` produced — and the mails in this file are a side effect of
// the mutations those hooks fire, several tests before the assertion. Captured in the hook
// itself, right after the triggering mutation; `.map` copies, so a later `vi.clearAllMocks()`
// cannot reach back into a snapshot already taken.
const capturedMails = (): unknown[] =>
  vi.mocked(sendNotificationMailMock).mock.calls.map(([notification]) => notification as unknown)

// Imported below the mock registrations — a carry-over from Jest's ESM mode, where the
// registration did not hoist. `vi.mock` does hoist, so a static import would bind the mock too.
const { default: Factory, cleanDatabase } = await import('@db/factories')
const { default: CreateComment } = await import('@graphql/queries/comments/CreateComment.gql')
const { default: notifications } = await import('@graphql/queries/notifications/notifications.gql')
const { default: CreatePost } = await import('@graphql/queries/posts/CreatePost.gql')
const { default: toggleObservePost } = await import('@graphql/queries/posts/toggleObservePost.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

let postAuthor, firstCommenter, secondCommenter, emaillessObserver

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
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
      mutation: CreatePost,
      variables: {
        id: 'post',
        title: 'This is the post',
        content: 'This is the content of the post',
      },
    })
    authenticatedUser = await emaillessObserver.toJson()
    await mutate({
      mutation: toggleObservePost,
      variables: {
        id: 'post',
        value: true,
      },
    })
  })

  describe('first comment on the post', () => {
    let mails: unknown[]

    beforeAll(async () => {
      authenticatedUser = await firstCommenter.toJson()
      await mutate({
        mutation: CreateComment,
        variables: {
          postId: 'post',
          id: 'c-1',
          content: 'first comment of first commenter',
        },
      })
      mails = capturedMails()
    })

    it('sends NO notification to the commenter', async () => {
      await expect(
        query({
          query: notifications,
          variables: { orderBy: 'updatedAt_desc' },
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
          query: notifications,
          variables: { orderBy: 'updatedAt_desc' },
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
      expect(mails).toHaveLength(1)
      expect(mails).toContainEqual(
        expect.objectContaining({
          email: 'post-author@example.org',
          reason: 'commented_on_post',
        }),
      )
    })

    describe('second comment on post', () => {
      let secondCommentMails: unknown[]

      beforeAll(async () => {
        vi.clearAllMocks()
        authenticatedUser = await secondCommenter.toJson()
        await mutate({
          mutation: CreateComment,
          variables: {
            postId: 'post',
            id: 'c-2',
            content: 'first comment of second commenter',
          },
        })
        secondCommentMails = capturedMails()
      })

      it('sends NO notification to the commenter', async () => {
        await expect(
          query({
            query: notifications,
            variables: { orderBy: 'updatedAt_desc' },
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
            query: notifications,
            variables: { orderBy: 'updatedAt_desc' },
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
            query: notifications,
            variables: { orderBy: 'updatedAt_desc' },
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
        expect(secondCommentMails).toHaveLength(2)
        expect(secondCommentMails).toContainEqual(
          expect.objectContaining({
            email: 'post-author@example.org',
            reason: 'commented_on_post',
          }),
        )
        expect(secondCommentMails).toContainEqual(
          expect.objectContaining({
            email: 'first-commenter@example.org',
            reason: 'commented_on_post',
          }),
        )
      })
    })

    describe('first commenter unfollows the post and post author comments post', () => {
      let authorCommentMails: unknown[]

      beforeAll(async () => {
        vi.clearAllMocks()
        authenticatedUser = await firstCommenter.toJson()
        await mutate({
          mutation: toggleObservePost,
          variables: {
            id: 'post',
            value: false,
          },
        })

        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: CreateComment,
          variables: {
            postId: 'post',
            id: 'c-3',
            content: 'first comment of post author',
          },
        })
        authorCommentMails = capturedMails()
      })

      it('sends no new notification to the post author', async () => {
        await expect(
          query({
            query: notifications,
            variables: { orderBy: 'updatedAt_desc' },
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
            query: notifications,
            variables: { orderBy: 'updatedAt_desc' },
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
            query: notifications,
            variables: { orderBy: 'updatedAt_desc' },
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
        expect(authorCommentMails).toHaveLength(1)
        expect(authorCommentMails).toContainEqual(
          expect.objectContaining({
            email: 'second-commenter@example.org',
            reason: 'commented_on_post',
          }),
        )
      })
    })
  })
})
