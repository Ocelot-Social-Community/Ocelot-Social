/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { beforeAll, afterAll, describe, beforeEach, afterEach, it, expect } from 'vitest'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const sendNotificationMailMock: (notification) => void = vi.fn()
vi.mock('@src/emails/sendEmail', () => ({
  sendNotificationMail: (notification) => {
    sendNotificationMailMock(notification)
  },
  // ESM links the whole namespace: every named export ANY importer in the graph reaches
  // for must exist here, or the module fails to link. The stubs below carry no behaviour.
  defaultParams: vi.fn(),
  sendChatMessageMail: vi.fn(),
  sendRegistrationMail: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendResetPasswordMail: vi.fn(),
  sendWrongEmail: vi.fn(),
}))

// Imported below the mock registrations — a carry-over from Jest's ESM mode, where the
// registration did not hoist. `vi.mock` does hoist, so a static import would bind the mock too.
const { default: pubsubContext } = await import('@context/pubsub')
const { default: Factory, cleanDatabase } = await import('@db/factories')
const { default: CreateComment } = await import('@graphql/queries/comments/CreateComment.gql')
const { default: UpdateComment } = await import('@graphql/queries/comments/UpdateComment.gql')
const { default: notifications } = await import('@graphql/queries/notifications/notifications.gql')
const { default: CreatePost } = await import('@graphql/queries/posts/CreatePost.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')

const pubsub = pubsubContext()
const pubsubSpy = vi.spyOn(pubsub, 'publish')

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy, pubsub })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

let author, reader

const mentionOfReader =
  '<a class="mention" data-mention-id="reader" href="/profile/reader/reader">@reader</a>'

const commentAsAuthor = async (content: string) => {
  authenticatedUser = await author.toJson()
  return mutate({ mutation: CreateComment, variables: { id: 'reply', postId: 'post', content } })
}

const notificationsOfReader = async (): Promise<unknown> => {
  authenticatedUser = await reader.toJson()
  const result = await query({ query: notifications, variables: { orderBy: 'updatedAt_desc' } })
  return result.data?.notifications as unknown
}

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

// The reader commented on the author's post and so observes it: every comment on it is news
// for them, and a comment that also mentions them used to show up twice in their bell.
describe('one notification per comment and recipient', () => {
  beforeEach(async () => {
    author = await Factory.build(
      'user',
      { id: 'author', name: 'Author', slug: 'author' },
      { email: 'author@example.org', password: '1234' },
    )
    reader = await Factory.build(
      'user',
      { id: 'reader', name: 'Reader', slug: 'reader' },
      { email: 'reader@example.org', password: '1234' },
    )
    authenticatedUser = await author.toJson()
    await mutate({
      mutation: CreatePost,
      variables: { id: 'post', title: 'A post', content: 'Something to talk about' },
    })
    authenticatedUser = await reader.toJson()
    await mutate({
      mutation: CreateComment,
      variables: { id: 'question', postId: 'post', content: 'A question' },
    })
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('the author replies and mentions the observer', () => {
    beforeEach(async () => {
      await commentAsAuthor(`Thanks ${mentionOfReader}`)
    })

    it('notifies them once, for the mention', async () => {
      await expect(notificationsOfReader()).resolves.toMatchObject([
        { from: { __typename: 'Comment', id: 'reply' }, reason: 'mentioned_in_comment' },
      ])
    })

    it('publishes that one notification live, and nothing for the outranked reason', () => {
      expect(pubsubSpy).toHaveBeenCalledTimes(1)
      expect(pubsubSpy).toHaveBeenCalledWith('NOTIFICATION_ADDED', {
        notificationAdded: expect.objectContaining({
          reason: 'mentioned_in_comment',
          to: expect.objectContaining({ id: 'reader' }),
        }),
      })
    })

    it('sends one email', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'mentioned_in_comment', email: 'reader@example.org' }),
      )
    })
  })

  describe('the author mentions the observer in an edit of the reply', () => {
    beforeEach(async () => {
      await commentAsAuthor('Thanks')
      vi.clearAllMocks()
      await mutate({
        mutation: UpdateComment,
        variables: { id: 'reply', content: `Thanks ${mentionOfReader}` },
      })
    })

    it('replaces the comment notification with the mention', async () => {
      await expect(notificationsOfReader()).resolves.toMatchObject([
        { from: { __typename: 'Comment', id: 'reply' }, reason: 'mentioned_in_comment' },
      ])
    })

    it('sends the email for the mention only', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'mentioned_in_comment', email: 'reader@example.org' }),
      )
    })
  })

  // An edit is not a new comment: the fallback to the comment's mail is for new comments only.
  describe('the observer turned off mails for mentions and is mentioned in an edit', () => {
    beforeEach(async () => {
      await reader.update({ emailNotificationsMention: false })
      await commentAsAuthor('Thanks')
      vi.clearAllMocks()
      await mutate({
        mutation: UpdateComment,
        variables: { id: 'reply', content: `Thanks ${mentionOfReader}` },
      })
    })

    it('sends no email about the old comment', () => {
      expect(sendNotificationMailMock).not.toHaveBeenCalled()
    })
  })
})
