/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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

// Imported after the mock registrations, not above them: `unstable_mockModule`
// does not hoist, so a static import would bind the real module first.
const { default: Factory, cleanDatabase } = await import('@db/factories')
const { default: ChangeGroupMemberRole } =
  await import('@graphql/queries/groups/ChangeGroupMemberRole.gql')
const { default: CreateGroup } = await import('@graphql/queries/groups/CreateGroup.gql')
const { default: JoinGroup } = await import('@graphql/queries/groups/JoinGroup.gql')
const { default: muteGroup } = await import('@graphql/queries/groups/muteGroup.gql')
const { default: unmuteGroup } = await import('@graphql/queries/groups/unmuteGroup.gql')
const { default: markAllAsRead } = await import('@graphql/queries/notifications/markAllAsRead.gql')
const { default: notifications } = await import('@graphql/queries/notifications/notifications.gql')
const { default: CreatePost } = await import('@graphql/queries/posts/CreatePost.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

let postAuthor, groupMember, pendingMember, emaillessMember

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

describe('notify group members of new posts in group', () => {
  beforeEach(async () => {
    postAuthor = await Factory.build(
      'user',
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
    groupMember = await Factory.build(
      'user',
      {
        id: 'group-member',
        name: 'Group Member',
        slug: 'group-member',
      },
      {
        email: 'group.member@example.org',
        password: '1234',
      },
    )
    pendingMember = await Factory.build(
      'user',
      {
        id: 'pending-member',
        name: 'Pending Member',
        slug: 'pending-member',
      },
      {
        email: 'test3@example.org',
        password: '1234',
      },
    )
    emaillessMember = await database.neode.create('User', {
      id: 'email-less-member',
      name: 'Email-less Member',
      slug: 'email-less-member',
    })

    authenticatedUser = await postAuthor.toJson()
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'g-1',
        name: 'A closed group',
        description: 'A closed group to test the notifications to group members',
        groupType: 'closed',
        actionRadius: 'national',
      },
    })
    authenticatedUser = await groupMember.toJson()
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g-1',
        userId: 'group-member',
      },
    })
    authenticatedUser = await pendingMember.toJson()
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g-1',
        userId: 'pending-member',
      },
    })
    authenticatedUser = await emaillessMember.toJson()
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'g-1',
        userId: 'email-less-member',
      },
    })
    authenticatedUser = await postAuthor.toJson()
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g-1',
        userId: 'group-member',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: {
        groupId: 'g-1',
        userId: 'email-less-member',
        roleInGroup: 'usual',
      },
    })
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('group owner posts in group', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      authenticatedUser = await groupMember.toJson()
      await mutate({ mutation: markAllAsRead })
      authenticatedUser = await postAuthor.toJson()
      await mutate({ mutation: markAllAsRead })
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'post',
          title: 'This is the new post in the group',
          content: 'This is the content of the new post in the group',
          groupId: 'g-1',
        },
      })
    })

    it('sends NO notification to the author of the post', async () => {
      await expect(
        query({
          query: notifications,
          variables: {
            orderBy: 'updatedAt_desc',
            read: false,
          },
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [],
        },
        errors: undefined,
      })
    })

    it('sends NO notification to the pending group member', async () => {
      authenticatedUser = await pendingMember.toJson()

      await expect(
        query({
          query: notifications,
          variables: {
            orderBy: 'updatedAt_desc',
            read: false,
          },
        }),
      ).resolves.toMatchObject({
        data: {
          notifications: [],
        },
        errors: undefined,
      })
    })

    it('sends notification to the group member', async () => {
      authenticatedUser = await groupMember.toJson()

      await expect(
        query({
          query: notifications,
          variables: {
            orderBy: 'updatedAt_desc',
            read: false,
          },
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
              reason: 'post_in_group',
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
          reason: 'post_in_group',
          email: 'group.member@example.org',
        }),
      )
    })

    describe('group member mutes group', () => {
      beforeEach(async () => {
        authenticatedUser = await groupMember.toJson()
        await mutate({
          mutation: muteGroup,
          variables: {
            groupId: 'g-1',
          },
        })
        vi.clearAllMocks()
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: CreatePost,
          variables: {
            id: 'post-1',
            title: 'This is another  post in the group',
            content: 'This is the content of another post in the group',
            groupId: 'g-1',
          },
        })
      })

      it('sends NO notification when another post is posted', async () => {
        await expect(
          query({
            query: notifications,
            variables: {
              orderBy: 'updatedAt_desc',
              read: false,
            },
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [],
          },
          errors: undefined,
        })
      })

      it('sends NO email', () => {
        expect(sendNotificationMailMock).not.toHaveBeenCalled()
      })

      describe('group member unmutes group again but disables email', () => {
        beforeEach(async () => {
          authenticatedUser = await groupMember.toJson()
          await mutate({
            mutation: unmuteGroup,
            variables: {
              groupId: 'g-1',
            },
          })
          vi.clearAllMocks()
          await groupMember.update({ emailNotificationsPostInGroup: false })
        })

        it('sends notification when another post is posted', async () => {
          authenticatedUser = await groupMember.toJson()
          await mutate({ mutation: markAllAsRead })
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'post-2',
              title: 'This is yet another  post in the group',
              content: 'This is the content of yet another post in the group',
              groupId: 'g-1',
            },
          })
          authenticatedUser = await groupMember.toJson()

          await expect(
            query({
              query: notifications,
              variables: {
                orderBy: 'updatedAt_desc',
                read: false,
              },
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: [
                {
                  from: {
                    __typename: 'Post',
                    id: 'post-2',
                  },
                  read: false,
                  reason: 'post_in_group',
                },
              ],
            },
            errors: undefined,
          })
        })

        it('sends NO email', () => {
          expect(sendNotificationMailMock).not.toHaveBeenCalled()
        })
      })
    })

    describe('group member blocks author', () => {
      beforeEach(async () => {
        await groupMember.relateTo(postAuthor, 'blocked')
        authenticatedUser = await groupMember.toJson()
        await mutate({ mutation: markAllAsRead })
        vi.clearAllMocks()
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: CreatePost,
          variables: {
            id: 'post-1',
            title: 'This is another  post in the group',
            content: 'This is the content of another post in the group',
            groupId: 'g-1',
          },
        })
      })

      it('sends no notification to the user', async () => {
        authenticatedUser = await groupMember.toJson()

        await expect(
          query({
            query: notifications,
            variables: {
              orderBy: 'updatedAt_desc',
              read: false,
            },
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [],
          },
          errors: undefined,
        })
      })

      it('sends NO email', () => {
        expect(sendNotificationMailMock).not.toHaveBeenCalled()
      })
    })

    describe('group member mutes author', () => {
      beforeEach(async () => {
        await groupMember.relateTo(postAuthor, 'muted')
        authenticatedUser = await groupMember.toJson()
        await mutate({ mutation: markAllAsRead })
        vi.clearAllMocks()
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: CreatePost,
          variables: {
            id: 'post-1',
            title: 'This is another  post in the group',
            content: 'This is the content of another post in the group',
            groupId: 'g-1',
          },
        })
      })

      it('sends no notification to the user', async () => {
        authenticatedUser = await groupMember.toJson()

        await expect(
          query({
            query: notifications,
            variables: {
              orderBy: 'updatedAt_desc',
              read: false,
            },
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [],
          },
          errors: undefined,
        })
      })

      it('sends NO email', () => {
        expect(sendNotificationMailMock).not.toHaveBeenCalled()
      })
    })
  })
})
