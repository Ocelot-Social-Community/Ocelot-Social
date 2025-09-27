/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import { CreateComment } from '@graphql/queries/CreateComment'
import { CreateGroup } from '@graphql/queries/CreateGroup'
import { CreatePost } from '@graphql/queries/CreatePost'
import { followUser } from '@graphql/queries/followUser'
import { JoinGroup } from '@graphql/queries/JoinGroup'
import { markAllAsRead } from '@graphql/queries/markAllAsRead'
import { notifications } from '@graphql/queries/notifications'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const sendNotificationMailMock: (notification) => void = jest.fn()
jest.mock('@src/emails/sendEmail', () => ({
  sendNotificationMail: (notification) => sendNotificationMailMock(notification),
}))

let emaillessMember
let authenticatedUser: Context['user']
const config = { CATEGORIES_ACTIVE: false }
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

let postAuthor, groupMember

const mentionString = `
  <a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member">@group-member</a>
  <a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member">@email-less-member</a>`

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

describe('emails sent for notifications', () => {
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
    emaillessMember = await database.neode.create('User', {
      id: 'email-less-member',
      name: 'Email-less Member',
      slug: 'email-less-member',
    })
    authenticatedUser = await postAuthor.toJson()
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'public-group',
        name: 'A public group',
        description: 'A public group to test the notifications of mentions',
        groupType: 'public',
        actionRadius: 'national',
      },
    })
    authenticatedUser = await groupMember.toJson()
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'public-group',
        userId: 'group-member',
      },
    })
    await mutate({
      mutation: followUser,
      variables: { id: 'post-author' },
    })
    authenticatedUser = await emaillessMember.toJson()
    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'public-group',
        userId: 'group-member',
      },
    })
    await mutate({
      mutation: followUser,
      variables: { id: 'post-author' },
    })
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('handleContentDataOfPost', () => {
    describe('post-author posts into group and mentions following group-member', () => {
      describe('all email notification settings are true', () => {
        beforeEach(async () => {
          jest.clearAllMocks()
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'post',
              title: 'This is the post',
              content: `Hello, ${mentionString}, my trusty followers.`,
              groupId: 'public-group',
            },
          })
        })

        it('sends only one email', () => {
          expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
          expect(sendNotificationMailMock).toHaveBeenCalledWith(
            expect.objectContaining({
              reason: 'mentioned_in_post',
              email: 'group.member@example.org',
            }),
          )
        })

        it('sends 3 notifications', async () => {
          authenticatedUser = await groupMember.toJson()
          await expect(
            query({
              query: notifications,
              variables: { orderBy: 'updatedAt_desc' },
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: expect.arrayContaining([
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'post_in_group',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'followed_user_posted',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
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
      })

      describe('email notification for mention in post is false', () => {
        beforeEach(async () => {
          jest.clearAllMocks()
          await groupMember.update({ emailNotificationsMention: false })
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'post',
              title: 'This is the post',
              content: `Hello, ${mentionString}, my trusty followers.`,
              groupId: 'public-group',
            },
          })
        })

        it('sends only one email', () => {
          expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
          expect(sendNotificationMailMock).toHaveBeenCalledWith(
            expect.objectContaining({
              reason: 'followed_user_posted',
              email: 'group.member@example.org',
            }),
          )
        })

        it('sends 3 notifications', async () => {
          authenticatedUser = await groupMember.toJson()
          await expect(
            query({
              query: notifications,
              variables: { orderBy: 'updatedAt_desc' },
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: expect.arrayContaining([
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'post_in_group',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'followed_user_posted',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
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
      })

      describe('email notification for mention in post and followed users is false', () => {
        beforeEach(async () => {
          jest.clearAllMocks()
          await groupMember.update({ emailNotificationsMention: false })
          await groupMember.update({ emailNotificationsFollowingUsers: false })
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'post',
              title: 'This is the post',
              content: `Hello, ${mentionString}, my trusty followers.`,
              groupId: 'public-group',
            },
          })
        })

        it('sends only one email', () => {
          expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
          expect(sendNotificationMailMock).toHaveBeenCalledWith(
            expect.objectContaining({
              reason: 'post_in_group',
              email: 'group.member@example.org',
            }),
          )
        })

        it('sends 3 notifications', async () => {
          authenticatedUser = await groupMember.toJson()
          await expect(
            query({
              query: notifications,
              variables: { orderBy: 'updatedAt_desc' },
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: expect.arrayContaining([
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'post_in_group',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'followed_user_posted',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
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
      })

      describe('all relevant email notifications are false', () => {
        beforeEach(async () => {
          jest.clearAllMocks()
          await groupMember.update({ emailNotificationsMention: false })
          await groupMember.update({ emailNotificationsFollowingUsers: false })
          await groupMember.update({ emailNotificationsPostInGroup: false })
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'post',
              title: 'This is the post',
              content: `Hello, ${mentionString}, my trusty followers.`,
              groupId: 'public-group',
            },
          })
        })

        it('sends NO email', () => {
          expect(sendNotificationMailMock).not.toHaveBeenCalled()
        })

        it('sends 3 notifications', async () => {
          authenticatedUser = await groupMember.toJson()
          await expect(
            query({
              query: notifications,
              variables: { orderBy: 'updatedAt_desc' },
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: expect.arrayContaining([
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'post_in_group',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'followed_user_posted',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Post',
                    id: 'post',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
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
      })
    })
  })

  describe('handleContentDataOfComment', () => {
    describe('user comments post and author responds with in a comment and mentions the user', () => {
      describe('all email notification settings are true', () => {
        beforeEach(async () => {
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'post',
              title: 'This is the post',
              content: `Hello, ${mentionString}, my trusty followers.`,
              groupId: 'public-group',
            },
          })
          authenticatedUser = await groupMember.toJson()
          await mutate({
            mutation: CreateComment,
            variables: {
              id: 'comment',
              content: `Hello, my beloved author.`,
              postId: 'post',
            },
          })
          await mutate({
            mutation: markAllAsRead,
          })
          jest.clearAllMocks()
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreateComment,
            variables: {
              id: 'comment-2',
              content: `Hello, ${mentionString}, my trusty followers.`,
              postId: 'post',
            },
          })
        })

        it('sends only one email', () => {
          expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
          expect(sendNotificationMailMock).toHaveBeenCalledWith(
            expect.objectContaining({
              reason: 'mentioned_in_comment',
              email: 'group.member@example.org',
            }),
          )
        })

        it('sends 2 notifications', async () => {
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
              notifications: expect.arrayContaining([
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Comment',
                    id: 'comment-2',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'commented_on_post',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Comment',
                    id: 'comment-2',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'mentioned_in_comment',
                  relatedUser: null,
                },
              ]),
            },
            errors: undefined,
          })
        })
      })

      describe('email notification commented on post is false', () => {
        beforeEach(async () => {
          await groupMember.update({ emailNotificationsCommentOnObservedPost: false })
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'post',
              title: 'This is the post',
              content: `Hello, ${mentionString}, my trusty followers.`,
              groupId: 'public-group',
            },
          })
          authenticatedUser = await groupMember.toJson()
          await mutate({
            mutation: CreateComment,
            variables: {
              id: 'comment',
              content: `Hello, my beloved author.`,
              postId: 'post',
            },
          })
          await mutate({
            mutation: markAllAsRead,
          })
          jest.clearAllMocks()
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreateComment,
            variables: {
              id: 'comment-2',
              content: `Hello, ${mentionString}, my trusty followers.`,
              postId: 'post',
            },
          })
        })

        it('sends only one email', () => {
          expect(sendNotificationMailMock).toHaveBeenCalledTimes(1)
          expect(sendNotificationMailMock).toHaveBeenCalledWith(
            expect.objectContaining({
              reason: 'mentioned_in_comment',
              email: 'group.member@example.org',
            }),
          )
        })

        it('sends 2 notifications', async () => {
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
              notifications: expect.arrayContaining([
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Comment',
                    id: 'comment-2',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'commented_on_post',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Comment',
                    id: 'comment-2',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'mentioned_in_comment',
                  relatedUser: null,
                },
              ]),
            },
            errors: undefined,
          })
        })
      })

      describe('all relevant email notifications are false', () => {
        beforeEach(async () => {
          await groupMember.update({ emailNotificationsCommentOnObservedPost: false })
          await groupMember.update({ emailNotificationsMention: false })
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'post',
              title: 'This is the post',
              content: `Hello, ${mentionString}, my trusty followers.`,
              groupId: 'public-group',
            },
          })
          authenticatedUser = await groupMember.toJson()
          await mutate({
            mutation: CreateComment,
            variables: {
              id: 'comment',
              content: `Hello, my beloved author.`,
              postId: 'post',
            },
          })
          await mutate({
            mutation: markAllAsRead,
          })
          jest.clearAllMocks()
          authenticatedUser = await postAuthor.toJson()
          await mutate({
            mutation: CreateComment,
            variables: {
              id: 'comment-2',
              content: `Hello, ${mentionString}, my trusty followers.`,
              postId: 'post',
            },
          })
        })

        it('sends NO email', () => {
          expect(sendNotificationMailMock).not.toHaveBeenCalled()
        })

        it('sends 2 notifications', async () => {
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
              notifications: expect.arrayContaining([
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Comment',
                    id: 'comment-2',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'commented_on_post',
                  relatedUser: null,
                },
                {
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Comment',
                    id: 'comment-2',
                    content:
                      'Hello, <br><a class="mention" data-mention-id="group-member" href="/profile/group-member/group-member" target="_blank">@group-member</a><br><a class="mention" data-mention-id="email-less-member" href="/profile/email-less-member/email-less-member" target="_blank">@email-less-member</a>, my trusty followers.',
                  },
                  read: false,
                  reason: 'mentioned_in_comment',
                  relatedUser: null,
                },
              ]),
            },
            errors: undefined,
          })
        })
      })
    })
  })
})
