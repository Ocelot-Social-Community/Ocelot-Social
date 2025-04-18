/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import {
  createGroupMutation,
  joinGroupMutation,
  changeGroupMemberRoleMutation,
} from '@graphql/groups'
import CONFIG from '@src/config'
import createServer from '@src/server'

CONFIG.CATEGORIES_ACTIVE = false

const sendMailMock = jest.fn()
jest.mock('../helpers/email/sendMail', () => ({
  sendMail: () => sendMailMock(),
}))

let server, query, mutate, authenticatedUser

let postAuthor, groupMember, pendingMember

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

const muteGroupMutation = gql`
  mutation ($groupId: ID!) {
    muteGroup(groupId: $groupId) {
      id
      isMutedByMe
    }
  }
`

const unmuteGroupMutation = gql`
  mutation ($groupId: ID!) {
    unmuteGroup(groupId: $groupId) {
      id
      isMutedByMe
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
        email: 'test2@example.org',
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
    authenticatedUser = await postAuthor.toJson()
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'g-1',
        userId: 'group-member',
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
        mutation: createPostMutation,
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
      expect(sendMailMock).toHaveBeenCalledTimes(1)
    })

    describe('group member mutes group', () => {
      beforeEach(async () => {
        authenticatedUser = await groupMember.toJson()
        await mutate({
          mutation: muteGroupMutation,
          variables: {
            groupId: 'g-1',
          },
        })
        jest.clearAllMocks()
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: createPostMutation,
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
        expect(sendMailMock).not.toHaveBeenCalled()
      })

      describe('group member unmutes group again but disables email', () => {
        beforeEach(async () => {
          authenticatedUser = await groupMember.toJson()
          await mutate({
            mutation: unmuteGroupMutation,
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
            mutation: createPostMutation,
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
          expect(sendMailMock).not.toHaveBeenCalled()
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
          mutation: createPostMutation,
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
        expect(sendMailMock).not.toHaveBeenCalled()
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
          mutation: createPostMutation,
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
        expect(sendMailMock).not.toHaveBeenCalled()
      })
    })
  })
})
