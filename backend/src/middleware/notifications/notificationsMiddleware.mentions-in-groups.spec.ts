/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { changeGroupMemberRoleMutation } from '@graphql/queries/changeGroupMemberRoleMutation'
import { createGroupMutation } from '@graphql/queries/createGroupMutation'
import { joinGroupMutation } from '@graphql/queries/joinGroupMutation'
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

let postAuthor, groupMember, pendingMember, noMember, emaillessMember

const mentionString = `
  <a class="mention" data-mention-id="no-member" href="/profile/no-member/no-member">@no-member</a>
  <a class="mention" data-mention-id="pending-member" href="/profile/pending-member/pending-member">@pending-member</a>
  <a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member">@group-member</a>.
  <a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member">@email-less-member</a>.
`

const createPostMutation = gql`
  mutation ($id: ID, $title: String!, $content: String!, $groupId: ID) {
    CreatePost(id: $id, title: $title, content: $content, groupId: $groupId) {
      id
      title
      content
    }
  }
`

const createCommentMutation = gql`
  mutation ($id: ID, $postId: ID!, $commentContent: String!) {
    CreateComment(id: $id, postId: $postId, content: $commentContent) {
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

describe('mentions in groups', () => {
  beforeEach(async () => {
    postAuthor = await Factory.build(
      'user',
      {
        id: 'post-author',
        name: 'Post Author',
        slug: 'post-author',
      },
      {
        email: 'post.author@example.org',
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
        email: 'pending.member@example.org',
        password: '1234',
      },
    )
    noMember = await Factory.build(
      'user',
      {
        id: 'no-member',
        name: 'No Member',
        slug: 'no-member',
      },
      {
        email: 'no.member@example.org',
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
        id: 'public-group',
        name: 'A public group',
        description: 'A public group to test the notifications of mentions',
        groupType: 'public',
        actionRadius: 'national',
      },
    })
    await mutate({
      mutation: createGroupMutation(),
      variables: {
        id: 'closed-group',
        name: 'A closed group',
        description: 'A closed group to test the notifications of mentions',
        groupType: 'closed',
        actionRadius: 'national',
      },
    })
    await mutate({
      mutation: createGroupMutation(),
      variables: {
        id: 'hidden-group',
        name: 'A hidden group',
        description: 'A hidden group to test the notifications of mentions',
        groupType: 'hidden',
        actionRadius: 'national',
      },
    })
    authenticatedUser = await groupMember.toJson()
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'public-group',
        userId: 'group-member',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'closed-group',
        userId: 'group-member',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'hidden-group',
        userId: 'group-member',
      },
    })
    authenticatedUser = await pendingMember.toJson()
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'public-group',
        userId: 'pending-member',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'closed-group',
        userId: 'pending-member',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'hidden-group',
        userId: 'pending-member',
      },
    })
    authenticatedUser = await emaillessMember.toJson()
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'public-group',
        userId: 'group-member',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'closed-group',
        userId: 'group-member',
      },
    })
    await mutate({
      mutation: joinGroupMutation(),
      variables: {
        groupId: 'hidden-group',
        userId: 'group-member',
      },
    })
    authenticatedUser = await postAuthor.toJson()
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'closed-group',
        userId: 'group-member',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'hidden-group',
        userId: 'group-member',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'closed-group',
        userId: 'email-less-member',
        roleInGroup: 'usual',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'hidden-group',
        userId: 'email-less-member',
        roleInGroup: 'usual',
      },
    })
    authenticatedUser = await groupMember.toJson()
    await markAllAsRead()
    authenticatedUser = await emaillessMember.toJson()
    await markAllAsRead()
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('post in public group', () => {
    beforeEach(async () => {
      jest.clearAllMocks()
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: createPostMutation,
        variables: {
          id: 'public-post',
          title: 'This is the post in the public group',
          content: `Hey ${mentionString}! Please read this`,
          groupId: 'public-group',
        },
      })
    })

    it('sends a notification to the no member', async () => {
      authenticatedUser = await noMember.toJson()
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
                id: 'public-post',
              },
              read: false,
              reason: 'mentioned_in_post',
            },
          ],
        },
        errors: undefined,
      })
    })

    it('sends a notification to the group member', async () => {
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
          notifications: expect.arrayContaining([
            {
              createdAt: expect.any(String),
              from: {
                __typename: 'Post',
                id: 'public-post',
                content:
                  'Hey <br><a class="mention" data-mention-id="no-member" href="/profile/no-member/no-member" target="_blank">@no-member</a><br><a class="mention" data-mention-id="pending-member" href="/profile/pending-member/pending-member" target="_blank">@pending-member</a><br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a>.<br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>.<br>! Please read this',
              },
              read: false,
              reason: 'post_in_group',
              relatedUser: null,
            },
            {
              createdAt: expect.any(String),
              from: {
                __typename: 'Post',
                id: 'public-post',
                content:
                  'Hey <br><a class="mention" data-mention-id="no-member" href="/profile/no-member/no-member" target="_blank">@no-member</a><br><a class="mention" data-mention-id="pending-member" href="/profile/pending-member/pending-member" target="_blank">@pending-member</a><br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a>.<br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>.<br>! Please read this',
              },
              read: false,
              reason: 'mentioned_in_post',
              relatedUser: null,
            },
          ]),
        },
        errors: undefined,
      })
    })

    it('sends only 3 emails, one for each user with an email', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(3)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'group.member@example.org',
          reason: 'mentioned_in_post',
        }),
      )
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'no.member@example.org',
          reason: 'mentioned_in_post',
        }),
      )
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'pending.member@example.org',
          reason: 'mentioned_in_post',
        }),
      )
    })
  })

  describe('post in closed group', () => {
    beforeEach(async () => {
      jest.clearAllMocks()
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: createPostMutation,
        variables: {
          id: 'closed-post',
          title: 'This is the post in the closed group',
          content: `Hey members ${mentionString}! Please read this`,
          groupId: 'closed-group',
        },
      })
    })

    it('sends NO notification to the no member', async () => {
      authenticatedUser = await noMember.toJson()
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

    it('sends NO notification to the pending member', async () => {
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

    it('sends a notification to the group member', async () => {
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
          notifications: expect.arrayContaining([
            {
              createdAt: expect.any(String),
              from: {
                __typename: 'Post',
                id: 'closed-post',
                content:
                  'Hey members <br><a class="mention" data-mention-id="no-member" href="/profile/no-member/no-member" target="_blank">@no-member</a><br><a class="mention" data-mention-id="pending-member" href="/profile/pending-member/pending-member" target="_blank">@pending-member</a><br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a>.<br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>.<br>! Please read this',
              },
              read: false,
              reason: 'post_in_group',
              relatedUser: null,
            },
            {
              createdAt: expect.any(String),
              from: {
                __typename: 'Post',
                id: 'closed-post',
                content:
                  'Hey members <br><a class="mention" data-mention-id="no-member" href="/profile/no-member/no-member" target="_blank">@no-member</a><br><a class="mention" data-mention-id="pending-member" href="/profile/pending-member/pending-member" target="_blank">@pending-member</a><br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a>.<br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>.<br>! Please read this',
              },
              read: false,
              reason: 'mentioned_in_post',
              relatedUser: null,
            },
          ]),
        },
        errors: undefined,
      })
    })

    it('sends only 1 email', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'group.member@example.org',
          reason: 'mentioned_in_post',
        }),
      )
    })
  })

  describe('post in hidden group', () => {
    beforeEach(async () => {
      jest.clearAllMocks()
      authenticatedUser = await postAuthor.toJson()
      await mutate({
        mutation: createPostMutation,
        variables: {
          id: 'hidden-post',
          title: 'This is the post in the hidden group',
          content: `Hey hiders ${mentionString}! Please read this`,
          groupId: 'hidden-group',
        },
      })
    })

    it('sends NO notification to the no member', async () => {
      authenticatedUser = await noMember.toJson()
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

    it('sends NO notification to the pending member', async () => {
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

    it('sends a notification to the group member', async () => {
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
          notifications: expect.arrayContaining([
            {
              createdAt: expect.any(String),
              from: {
                __typename: 'Post',
                id: 'hidden-post',
                content:
                  'Hey hiders <br><a class="mention" data-mention-id="no-member" href="/profile/no-member/no-member" target="_blank">@no-member</a><br><a class="mention" data-mention-id="pending-member" href="/profile/pending-member/pending-member" target="_blank">@pending-member</a><br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a>.<br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>.<br>! Please read this',
              },
              read: false,
              reason: 'post_in_group',
              relatedUser: null,
            },
            {
              createdAt: expect.any(String),
              from: {
                __typename: 'Post',
                id: 'hidden-post',
                content:
                  'Hey hiders <br><a class="mention" data-mention-id="no-member" href="/profile/no-member/no-member" target="_blank">@no-member</a><br><a class="mention" data-mention-id="pending-member" href="/profile/pending-member/pending-member" target="_blank">@pending-member</a><br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a>.<br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>.<br>! Please read this',
              },
              read: false,
              reason: 'mentioned_in_post',
              relatedUser: null,
            },
          ]),
        },
        errors: undefined,
      })
    })

    it('sends only 1 email', () => {
      expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
      expect(sendNotificationMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'group.member@example.org',
          reason: 'mentioned_in_post',
        }),
      )
    })
  })

  describe('comments on group posts', () => {
    describe('public group', () => {
      beforeEach(async () => {
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: createPostMutation,
          variables: {
            id: 'public-post',
            title: 'This is the post in the public group',
            content: `Some public content`,
            groupId: 'public-group',
          },
        })
        authenticatedUser = await groupMember.toJson()
        await markAllAsRead()
        authenticatedUser = await postAuthor.toJson()
        jest.clearAllMocks()
        await mutate({
          mutation: createCommentMutation,
          variables: {
            id: 'public-comment',
            postId: 'public-post',
            commentContent: `Hey everyone ${mentionString}! Please read this`,
          },
        })
      })

      it('sends a notification to the no member', async () => {
        authenticatedUser = await noMember.toJson()
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
                  __typename: 'Comment',
                  id: 'public-comment',
                },
                read: false,
                reason: 'mentioned_in_comment',
              },
            ],
          },
          errors: undefined,
        })
      })

      it('sends a notification to the group member', async () => {
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
                  __typename: 'Comment',
                  id: 'public-comment',
                },
                read: false,
                reason: 'mentioned_in_comment',
              },
            ],
          },
          errors: undefined,
        })
      })

      it('sends 2 emails', () => {
        expect(sendNotificationMailMock).toHaveBeenCalledTimes(3)
        expect(sendNotificationMailMock).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'group.member@example.org',
            reason: 'mentioned_in_comment',
          }),
        )
        expect(sendNotificationMailMock).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'no.member@example.org',
            reason: 'mentioned_in_comment',
          }),
        )
      })
    })

    describe('closed group', () => {
      beforeEach(async () => {
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: createPostMutation,
          variables: {
            id: 'closed-post',
            title: 'This is the post in the closed group',
            content: `Some closed content`,
            groupId: 'closed-group',
          },
        })
        authenticatedUser = await groupMember.toJson()
        await markAllAsRead()
        authenticatedUser = await postAuthor.toJson()
        jest.clearAllMocks()
        await mutate({
          mutation: createCommentMutation,
          variables: {
            id: 'closed-comment',
            postId: 'closed-post',
            commentContent: `Hey members ${mentionString}! Please read this`,
          },
        })
      })

      it('sends NO notification to the no member', async () => {
        authenticatedUser = await noMember.toJson()
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

      it('sends NO notification to the pending member', async () => {
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

      it('sends a notification to the group member', async () => {
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
                  __typename: 'Comment',
                  id: 'closed-comment',
                },
                read: false,
                reason: 'mentioned_in_comment',
              },
            ],
          },
          errors: undefined,
        })
      })

      it('sends 1 email', () => {
        expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
        expect(sendNotificationMailMock).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'group.member@example.org',
            reason: 'mentioned_in_comment',
          }),
        )
      })
    })

    describe('hidden group', () => {
      beforeEach(async () => {
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: createPostMutation,
          variables: {
            id: 'hidden-post',
            title: 'This is the post in the hidden group',
            content: `Some hidden content`,
            groupId: 'hidden-group',
          },
        })
        authenticatedUser = await groupMember.toJson()
        await markAllAsRead()
        authenticatedUser = await postAuthor.toJson()
        jest.clearAllMocks()
        await mutate({
          mutation: createCommentMutation,
          variables: {
            id: 'hidden-comment',
            postId: 'hidden-post',
            commentContent: `Hey hiders ${mentionString}! Please read this`,
          },
        })
      })

      it('sends NO notification to the no member', async () => {
        authenticatedUser = await noMember.toJson()
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

      it('sends NO notification to the pending member', async () => {
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

      it('sends a notification to the group member', async () => {
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
                  __typename: 'Comment',
                  id: 'hidden-comment',
                },
                read: false,
                reason: 'mentioned_in_comment',
              },
            ],
          },
          errors: undefined,
        })
      })

      it('sends 1 email', () => {
        expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
        expect(sendNotificationMailMock).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'group.member@example.org',
            reason: 'mentioned_in_comment',
          }),
        )
      })
    })
  })
})
