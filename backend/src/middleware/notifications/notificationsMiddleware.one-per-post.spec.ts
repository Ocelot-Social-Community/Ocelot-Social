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
const { default: CreateGroup } = await import('@graphql/queries/groups/CreateGroup.gql')
const { default: JoinGroup } = await import('@graphql/queries/groups/JoinGroup.gql')
const { default: muteGroup } = await import('@graphql/queries/groups/muteGroup.gql')
const { default: followUser } = await import('@graphql/queries/interactions/followUser.gql')
const { default: notifications } = await import('@graphql/queries/notifications/notifications.gql')
const { default: CreatePost } = await import('@graphql/queries/posts/CreatePost.gql')
const { default: UpdatePost } = await import('@graphql/queries/posts/UpdatePost.gql')
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

const createPostInGroup = async (content = 'Some news for the group') =>
  mutate({
    mutation: CreatePost,
    variables: { id: 'post', title: 'A post in the group', content, groupId: 'g-1' },
  })

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

// The reader follows the author AND is a member of the public group the author posts in: every
// announcer of a new post applies to them, and each used to leave its own entry in the bell.
describe('one notification per post and recipient', () => {
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
      mutation: CreateGroup,
      variables: {
        id: 'g-1',
        name: 'A public group',
        description: 'A public group to test that a post is announced only once',
        template: 'public',
        actionRadius: 'national',
      },
    })
    authenticatedUser = await reader.toJson()
    await mutate({ mutation: JoinGroup, variables: { groupId: 'g-1', userId: 'reader' } })
    await mutate({ mutation: followUser, variables: { id: 'author' } })
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('the author posts in the group', () => {
    beforeEach(async () => {
      authenticatedUser = await author.toJson()
      await createPostInGroup()
    })

    it('notifies the follower who is a member once, as a member', async () => {
      await expect(notificationsOfReader()).resolves.toMatchObject([
        { from: { __typename: 'Post', id: 'post' }, reason: 'post_in_group' },
      ])
    })

    it('publishes that one notification live, and nothing for the outranked reason', () => {
      expect(pubsubSpy).toHaveBeenCalledTimes(1)
      expect(pubsubSpy).toHaveBeenCalledWith('NOTIFICATION_ADDED', {
        notificationAdded: expect.objectContaining({
          reason: 'post_in_group',
          to: expect.objectContaining({ id: 'reader' }),
        }),
      })
    })

    it('sends one email', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'post_in_group', email: 'reader@example.org' }),
      )
    })
  })

  // Telling them once in the bell must not swallow the mail they asked for under the other reason.
  describe('the member turned off mails for posts in groups, but not for followed users', () => {
    beforeEach(async () => {
      await reader.update({ emailNotificationsPostInGroup: false })
      authenticatedUser = await author.toJson()
      await createPostInGroup()
    })

    it('still notifies them once, as a member', async () => {
      await expect(notificationsOfReader()).resolves.toMatchObject([
        { from: { __typename: 'Post', id: 'post' }, reason: 'post_in_group' },
      ])
    })

    it('sends the email for following the author', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'followed_user_posted', email: 'reader@example.org' }),
      )
    })
  })

  // Muting the group silences the group's announcement, not the author they chose to follow.
  describe('the member muted the group', () => {
    beforeEach(async () => {
      await mutate({ mutation: muteGroup, variables: { groupId: 'g-1' } })
      authenticatedUser = await author.toJson()
      await createPostInGroup()
    })

    it('notifies them once, as a follower', async () => {
      await expect(notificationsOfReader()).resolves.toMatchObject([
        { from: { __typename: 'Post', id: 'post' }, reason: 'followed_user_posted' },
      ])
    })
  })

  describe('the author mentions them in the post', () => {
    beforeEach(async () => {
      authenticatedUser = await author.toJson()
      await createPostInGroup(`Hello ${mentionOfReader}`)
    })

    it('notifies them once, for the mention', async () => {
      await expect(notificationsOfReader()).resolves.toMatchObject([
        { from: { __typename: 'Post', id: 'post' }, reason: 'mentioned_in_post' },
      ])
    })

    it('sends one email', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'mentioned_in_post', email: 'reader@example.org' }),
      )
    })
  })

  describe('the author mentions them in an edit of the post', () => {
    beforeEach(async () => {
      authenticatedUser = await author.toJson()
      await createPostInGroup()
      await mutate({
        mutation: UpdatePost,
        variables: { id: 'post', title: 'A post in the group', content: `Hi ${mentionOfReader}` },
      })
    })

    it('replaces the announcement with the mention', async () => {
      await expect(notificationsOfReader()).resolves.toMatchObject([
        { from: { __typename: 'Post', id: 'post' }, reason: 'mentioned_in_post', read: false },
      ])
    })
  })
})
