import gql from 'graphql-tag'
import { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'
import {
  createGroupMutation,
  joinGroupMutation,
  changeGroupMemberRoleMutation,
} from '../../graphql/groups'

import CONFIG from '../../config'

CONFIG.CATEGORIES_ACTIVE = false

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
  mutation ($id: ID!) {
    muteGroup(id: $id) {
      id
      isMutedByMe
    }
  }
`

const unmuteGroupMutation = gql`
  mutation ($id: ID!) {
    unmuteGroup(id: $id) {
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
  // await cleanDatabase()
  driver.close()
})

describe('notify group members of new posts in group', () => {
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
    groupMember = await neode.create(
      'User',
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
    pendingMember = await neode.create(
      'User',
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

  describe('group owner posts in group', () => {
    beforeAll(async () => {
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

    describe('group member mutes group', () => {
      it('sets the muted status correctly', async () => {
        authenticatedUser = await groupMember.toJson()
        await expect(
          mutate({
            mutation: muteGroupMutation,
            variables: {
              id: 'g-1',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            muteGroup: {
              isMutedByMe: true,
            },
          },
          errors: undefined,
        })
      })

      it('sends no notification when another post is posted', async () => {
        authenticatedUser = await groupMember.toJson()
        await markAllAsRead()
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

      describe('group member unmutes group again', () => {
        it('sets the muted status correctly', async () => {
          authenticatedUser = await groupMember.toJson()
          await expect(
            mutate({
              mutation: unmuteGroupMutation,
              variables: {
                id: 'g-1',
              },
            }),
          ).resolves.toMatchObject({
            data: {
              unmuteGroup: {
                isMutedByMe: false,
              },
            },
            errors: undefined,
          })
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
      })
    })
  })
})
