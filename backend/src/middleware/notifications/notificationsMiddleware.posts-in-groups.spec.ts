/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { changeGroupMemberRoleMutation } from '@graphql/queries/changeGroupMemberRoleMutation'
import { createGroupMutation } from '@graphql/queries/createGroupMutation'
import { CreatePost } from '@graphql/queries/CreatePost'
import { joinGroupMutation } from '@graphql/queries/joinGroupMutation'
import { muteGroup } from '@graphql/queries/muteGroup'
import { unmuteGroup } from '@graphql/queries/unmuteGroup'
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

let postAuthor, groupMember, pendingMember, emaillessMember

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

const markAllAsRead = async () =>
  mutate({
    mutation: gql`
      mutation {
        markAllAsRead {
          id
        }
      }
    `,
  })

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
      mutation: createGroupMutation(),
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
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g-1',
        userId: 'group-member',
      },
    })
    authenticatedUser = await pendingMember.toJson()
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g-1',
        userId: 'pending-member',
      },
    })
    authenticatedUser = await emaillessMember.toJson()
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'g-1',
        userId: 'group-member',
      },
    })
    authenticatedUser = await postAuthor.toJson()
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g-1',
        userId: 'group-member',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
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
      jest.clearAllMocks()
      authenticatedUser = await groupMember.toJson()
      await markAllAsRead()
      authenticatedUser = await postAuthor.toJson()
      await markAllAsRead()
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
          query: notificationQuery,
          variables: {
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
          query: notificationQuery,
          variables: {
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
          query: notificationQuery,
          variables: {
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
        jest.clearAllMocks()
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
            query: notificationQuery,
            variables: {
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
          jest.clearAllMocks()
          await groupMember.update({ emailNotificationsPostInGroup: false })
        })

        it('sends notification when another post is posted', async () => {
          authenticatedUser = await groupMember.toJson()
          await markAllAsRead()
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
              query: notificationQuery,
              variables: {
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
        await markAllAsRead()
        jest.clearAllMocks()
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
            query: notificationQuery,
            variables: {
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
        await markAllAsRead()
        jest.clearAllMocks()
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
            query: notificationQuery,
            variables: {
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
