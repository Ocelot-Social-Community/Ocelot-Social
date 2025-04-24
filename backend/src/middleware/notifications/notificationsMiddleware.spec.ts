/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import databaseContext from '@context/database'
import pubsubContext from '@context/pubsub'
import Factory, { cleanDatabase } from '@db/factories'
import { changeGroupMemberRoleMutation } from '@graphql/queries/changeGroupMemberRoleMutation'
import { createGroupMutation } from '@graphql/queries/createGroupMutation'
import { createMessageMutation } from '@graphql/queries/createMessageMutation'
import { createRoomMutation } from '@graphql/queries/createRoomMutation'
import { joinGroupMutation } from '@graphql/queries/joinGroupMutation'
import { leaveGroupMutation } from '@graphql/queries/leaveGroupMutation'
import { removeUserFromGroupMutation } from '@graphql/queries/removeUserFromGroupMutation'
import createServer, { getContext } from '@src/server'

const sendMailMock = jest.fn()
jest.mock('../helpers/email/sendMail', () => ({
  sendMail: () => sendMailMock(),
}))

const chatMessageTemplateMock = jest.fn()
const notificationTemplateMock = jest.fn()
jest.mock('../helpers/email/templateBuilder', () => ({
  chatMessageTemplate: () => chatMessageTemplateMock(),
  notificationTemplate: () => notificationTemplateMock(),
}))

let isUserOnlineMock = jest.fn()
jest.mock('../helpers/isUserOnline', () => ({
  isUserOnline: () => isUserOnlineMock(),
}))

const database = databaseContext()
const pubsub = pubsubContext()
const pubsubSpy = jest.spyOn(pubsub, 'publish')

let query, mutate, notifiedUser, authenticatedUser

const categoryIds = ['cat9']
const createPostMutation = gql`
  mutation ($id: ID, $title: String!, $postContent: String!, $categoryIds: [ID]!) {
    CreatePost(id: $id, title: $title, content: $postContent, categoryIds: $categoryIds) {
      id
      title
      content
    }
  }
`
const updatePostMutation = gql`
  mutation ($id: ID!, $title: String!, $postContent: String!, $categoryIds: [ID]!) {
    UpdatePost(id: $id, content: $postContent, title: $title, categoryIds: $categoryIds) {
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

let server: ApolloServer

beforeAll(async () => {
  await cleanDatabase()

  const contextUser = async (_req) => authenticatedUser
  const context = getContext({ user: contextUser, database, pubsub })

  server = createServer({ context }).server

  const createTestClientResult = createTestClient(server)
  query = createTestClientResult.query
  mutate = createTestClientResult.mutate
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(async () => {
  notifiedUser = await Factory.build(
    'user',
    {
      id: 'you',
      name: 'Al Capone',
      slug: 'al-capone',
    },
    {
      email: 'test@example.org',
      password: '1234',
    },
  )
  await database.neode.create('Category', {
    id: 'cat9',
    name: 'Democracy & Politics',
    icon: 'university',
  })
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('notifications', () => {
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

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await notifiedUser.toJson()
    })

    describe('given another user', () => {
      let title
      let postContent
      let postAuthor

      const createPostAction = async () => {
        authenticatedUser = await postAuthor.toJson()
        await mutate({
          mutation: createPostMutation,
          variables: {
            id: 'p47',
            title,
            postContent,
            categoryIds,
          },
        })
        authenticatedUser = await notifiedUser.toJson()
      }

      let commentContent
      let commentAuthor
      const createCommentOnPostAction = async () => {
        await createPostAction()
        authenticatedUser = await commentAuthor.toJson()
        await mutate({
          mutation: createCommentMutation,
          variables: {
            id: 'c47',
            postId: 'p47',
            commentContent,
          },
        })
        authenticatedUser = await notifiedUser.toJson()
      }

      describe('comments on my post', () => {
        beforeEach(async () => {
          title = 'My post'
          postContent = 'My post content.'
          postAuthor = notifiedUser
        })

        describe('commenter is not me', () => {
          beforeEach(async () => {
            jest.clearAllMocks()
            commentContent = 'Commenters comment.'
            commentAuthor = await database.neode.create('User', {
              id: 'commentAuthor',
              name: 'Mrs Comment',
              slug: 'mrs-comment',
            })
          })

          it('sends me a notification and email', async () => {
            await createCommentOnPostAction()
            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toMatchObject(
              expect.objectContaining({
                data: {
                  notifications: [
                    {
                      read: false,
                      createdAt: expect.any(String),
                      reason: 'commented_on_post',
                      from: {
                        __typename: 'Comment',
                        id: 'c47',
                        content: commentContent,
                      },
                      relatedUser: null,
                    },
                  ],
                },
              }),
            )

            // Mail
            expect(sendMailMock).toHaveBeenCalledTimes(1)
            expect(notificationTemplateMock).toHaveBeenCalledTimes(1)
          })

          describe('if I have disabled `emailNotificationsCommentOnObservedPost`', () => {
            it('sends me a notification but no email', async () => {
              await notifiedUser.update({ emailNotificationsCommentOnObservedPost: false })
              await createCommentOnPostAction()
              await expect(
                query({
                  query: notificationQuery,
                  variables: {
                    read: false,
                  },
                }),
              ).resolves.toMatchObject(
                expect.objectContaining({
                  data: {
                    notifications: [
                      {
                        read: false,
                        createdAt: expect.any(String),
                        reason: 'commented_on_post',
                        from: {
                          __typename: 'Comment',
                          id: 'c47',
                          content: commentContent,
                        },
                        relatedUser: null,
                      },
                    ],
                  },
                }),
              )

              // No Mail
              expect(sendMailMock).not.toHaveBeenCalled()
              expect(notificationTemplateMock).not.toHaveBeenCalled()
            })
          })

          describe('if I have blocked the comment author', () => {
            it('sends me no notification', async () => {
              await notifiedUser.relateTo(commentAuthor, 'blocked')
              await createCommentOnPostAction()
              const expected = expect.objectContaining({
                data: { notifications: [] },
              })

              await expect(
                query({
                  query: notificationQuery,
                  variables: {
                    read: false,
                  },
                }),
              ).resolves.toEqual(expected)
            })
          })

          describe('if I have muted the comment author', () => {
            it('sends me no notification', async () => {
              await notifiedUser.relateTo(commentAuthor, 'muted')
              await createCommentOnPostAction()
              const expected = expect.objectContaining({
                data: { notifications: [] },
              })

              await expect(
                query({
                  query: notificationQuery,
                  variables: {
                    read: false,
                  },
                }),
              ).resolves.toEqual(expected)
            })
          })
        })

        describe('commenter is me', () => {
          beforeEach(async () => {
            commentContent = 'My comment.'
            commentAuthor = notifiedUser
          })

          it('sends me no notification', async () => {
            await createCommentOnPostAction()
            const expected = expect.objectContaining({
              data: { notifications: [] },
            })

            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toEqual(expected)
          })
        })
      })

      beforeEach(async () => {
        jest.clearAllMocks()
        postAuthor = await database.neode.create('User', {
          id: 'postAuthor',
          name: 'Mrs Post',
          slug: 'mrs-post',
        })
      })

      describe('mentions me in a post', () => {
        beforeEach(async () => {
          title = 'Mentioning Al Capone'

          postContent =
            'Hey <a class="mention" data-mention-id="you" href="/profile/you/al-capone">@al-capone</a> how do you do?'
        })

        it('sends me a notification and email', async () => {
          await createPostAction()
          const expectedContent =
            'Hey <a class="mention" data-mention-id="you" href="/profile/you/al-capone" target="_blank">@al-capone</a> how do you do?'
          await expect(
            query({
              query: notificationQuery,
              variables: {
                read: false,
              },
            }),
          ).resolves.toMatchObject({
            errors: undefined,
            data: {
              notifications: [
                {
                  read: false,
                  createdAt: expect.any(String),
                  reason: 'mentioned_in_post',
                  from: {
                    __typename: 'Post',
                    id: 'p47',
                    content: expectedContent,
                  },
                },
              ],
            },
          })

          // Mail
          expect(sendMailMock).toHaveBeenCalledTimes(1)
          expect(notificationTemplateMock).toHaveBeenCalledTimes(1)
        })

        describe('if I have disabled `emailNotificationsMention`', () => {
          it('sends me a notification but no email', async () => {
            await notifiedUser.update({ emailNotificationsMention: false })
            await createPostAction()
            const expectedContent =
              'Hey <a class="mention" data-mention-id="you" href="/profile/you/al-capone" target="_blank">@al-capone</a> how do you do?'
            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toMatchObject({
              errors: undefined,
              data: {
                notifications: [
                  {
                    read: false,
                    createdAt: expect.any(String),
                    reason: 'mentioned_in_post',
                    from: {
                      __typename: 'Post',
                      id: 'p47',
                      content: expectedContent,
                    },
                  },
                ],
              },
            })

            // Mail
            expect(sendMailMock).not.toHaveBeenCalled()
            expect(notificationTemplateMock).not.toHaveBeenCalled()
          })
        })

        it('publishes `NOTIFICATION_ADDED` to me', async () => {
          await createPostAction()
          expect(pubsubSpy).toHaveBeenCalledWith(
            'NOTIFICATION_ADDED',
            expect.objectContaining({
              notificationAdded: expect.objectContaining({
                reason: 'mentioned_in_post',
                to: expect.objectContaining({
                  id: 'you',
                }),
              }),
            }),
          )
          expect(pubsubSpy).toHaveBeenCalledTimes(1)
        })

        describe('updates the post and mentions me again', () => {
          const updatePostAction = async () => {
            const updatedContent = `
              One more mention to
              <a data-mention-id="you" class="mention" href="/profile/you">
                @al-capone
              </a>
              and again:
              <a data-mention-id="you" class="mention" href="/profile/you">
                @al-capone
              </a>
              and again
              <a data-mention-id="you" class="mention" href="/profile/you">
                @al-capone
              </a>
            `
            authenticatedUser = await postAuthor.toJson()
            await mutate({
              mutation: updatePostMutation,
              variables: {
                id: 'p47',
                title,
                postContent: updatedContent,
                categoryIds,
              },
            })
            authenticatedUser = await notifiedUser.toJson()
          }

          it('creates no duplicate notification for the same resource', async () => {
            const expectedUpdatedContent =
              '<br>One more mention to<br><a data-mention-id="you" class="mention" href="/profile/you" target="_blank"><br>@al-capone<br></a><br>and again:<br><a data-mention-id="you" class="mention" href="/profile/you" target="_blank"><br>@al-capone<br></a><br>and again<br><a data-mention-id="you" class="mention" href="/profile/you" target="_blank"><br>@al-capone<br></a><br>'
            await createPostAction()
            await updatePostAction()
            const expected = expect.objectContaining({
              data: {
                notifications: [
                  {
                    read: false,
                    createdAt: expect.any(String),
                    reason: 'mentioned_in_post',
                    from: {
                      __typename: 'Post',
                      id: 'p47',
                      content: expectedUpdatedContent,
                    },
                    relatedUser: null,
                  },
                ],
              },
            })
            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toEqual(expected)
          })

          describe('if the notification was marked as read earlier', () => {
            const markAsReadAction = async () => {
              const mutation = gql`
                mutation ($id: ID!) {
                  markAsRead(id: $id) {
                    read
                  }
                }
              `
              await mutate({ mutation, variables: { id: 'p47' } })
            }

            describe('but the next mention happens after the notification was marked as read', () => {
              it('sets the `read` attribute to false again', async () => {
                await createPostAction()
                await markAsReadAction()
                const {
                  data: {
                    notifications: [{ read: readBefore }],
                  },
                } = await query({
                  query: notificationQuery,
                })
                await updatePostAction()
                const {
                  data: {
                    notifications: [{ read: readAfter }],
                  },
                } = await query({
                  query: notificationQuery,
                })
                expect(readBefore).toEqual(true)
                expect(readAfter).toEqual(false)
              })

              it('does not update the `createdAt` attribute', async () => {
                await createPostAction()
                await markAsReadAction()
                const {
                  data: {
                    notifications: [{ createdAt: createdAtBefore }],
                  },
                } = await query({
                  query: notificationQuery,
                })
                await updatePostAction()
                const {
                  data: {
                    notifications: [{ createdAt: createdAtAfter }],
                  },
                } = await query({
                  query: notificationQuery,
                })
                expect(createdAtBefore).toBeTruthy()
                expect(Date.parse(createdAtBefore)).toEqual(expect.any(Number))
                expect(createdAtAfter).toBeTruthy()
                expect(Date.parse(createdAtAfter)).toEqual(expect.any(Number))
                expect(createdAtBefore).toEqual(createdAtAfter)
              })
            })
          })
        })

        describe('but the author of the post blocked me', () => {
          beforeEach(async () => {
            await postAuthor.relateTo(notifiedUser, 'blocked')
          })

          it('sends no notification', async () => {
            await createPostAction()
            const expected = expect.objectContaining({
              data: { notifications: [] },
            })

            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toEqual(expected)
          })

          it('does not publish `NOTIFICATION_ADDED`', async () => {
            await createPostAction()
            expect(pubsubSpy).not.toHaveBeenCalled()
          })
        })

        describe('but the author of the post muted me', () => {
          beforeEach(async () => {
            await postAuthor.relateTo(notifiedUser, 'muted')
          })

          it('sends me a notification', async () => {
            await createPostAction()
            const expected = expect.objectContaining({
              data: {
                notifications: [
                  {
                    createdAt: expect.any(String),
                    from: {
                      __typename: 'Post',
                      content:
                        'Hey <a class="mention" data-mention-id="you" href="/profile/you/al-capone" target="_blank">@al-capone</a> how do you do?',
                      id: 'p47',
                    },
                    read: false,
                    reason: 'mentioned_in_post',
                    relatedUser: null,
                  },
                ],
              },
            })

            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toEqual(expected)
          })

          it('publishes `NOTIFICATION_ADDED`', async () => {
            await createPostAction()
            expect(pubsubSpy).toHaveBeenCalled()
          })
        })
      })

      describe('mentions me in a comment', () => {
        beforeEach(async () => {
          title = 'Post where I get mentioned in a comment'
          postContent = 'Content of post where I get mentioned in a comment.'
        })

        describe('I am not blocked at all', () => {
          beforeEach(async () => {
            commentContent =
              'One mention about me with <a data-mention-id="you" class="mention" href="/profile/you" target="_blank">@al-capone</a>.'
            commentAuthor = await database.neode.create('User', {
              id: 'commentAuthor',
              name: 'Mrs Comment',
              slug: 'mrs-comment',
            })
          })

          it('sends only one notification with reason mentioned_in_comment', async () => {
            postAuthor = await database.neode.create('User', {
              id: 'MrPostAuthor',
              name: 'Mr Author',
              slug: 'mr-author',
            })

            await createCommentOnPostAction()
            const expected = expect.objectContaining({
              data: {
                notifications: [
                  {
                    read: false,
                    createdAt: expect.any(String),
                    reason: 'mentioned_in_comment',
                    from: {
                      __typename: 'Comment',
                      id: 'c47',
                      content: commentContent,
                    },
                    relatedUser: null,
                  },
                ],
              },
            })

            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toEqual(expected)
          })

          beforeEach(async () => {
            title = "Post where I'm the author and I get mentioned in a comment"
            postContent = 'Content of post where I get mentioned in a comment.'
            postAuthor = notifiedUser
          })
          it('sends only one notification with reason commented_on_post, no notification with reason mentioned_in_comment', async () => {
            await createCommentOnPostAction()
            const expected = {
              data: {
                notifications: [
                  {
                    read: false,
                    createdAt: expect.any(String),
                    reason: 'commented_on_post',
                    from: {
                      __typename: 'Comment',
                      id: 'c47',
                      content: commentContent,
                    },
                    relatedUser: null,
                  },
                ],
              },
            }

            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toMatchObject({ ...expected, errors: undefined })
          })
        })

        describe('but the author of the post blocked me', () => {
          beforeEach(async () => {
            await postAuthor.relateTo(notifiedUser, 'blocked')
            commentContent =
              'One mention about me with <a data-mention-id="you" class="mention" href="/profile/you" target="_blank">@al-capone</a>.'
            commentAuthor = await database.neode.create('User', {
              id: 'commentAuthor',
              name: 'Mrs Comment',
              slug: 'mrs-comment',
            })
          })

          it('sends no notification', async () => {
            await createCommentOnPostAction()
            await expect(
              query({
                query: notificationQuery,
                variables: {
                  read: false,
                },
              }),
            ).resolves.toMatchObject({
              data: { notifications: [] },
              errors: undefined,
            })
          })

          it('does not publish `NOTIFICATION_ADDED` to authenticated user', async () => {
            await createCommentOnPostAction()
            expect(pubsubSpy).toHaveBeenCalledWith(
              'NOTIFICATION_ADDED',
              expect.objectContaining({
                notificationAdded: expect.objectContaining({
                  reason: 'commented_on_post',
                  to: expect.objectContaining({
                    id: 'postAuthor', // that's expected, it's not me but the post author
                  }),
                }),
              }),
            )
            expect(pubsubSpy).toHaveBeenCalledTimes(1)
          })
        })

        describe('but the author of the post muted me', () => {
          beforeEach(async () => {
            await postAuthor.relateTo(notifiedUser, 'muted')
            commentContent =
              'One mention about me with <a data-mention-id="you" class="mention" href="/profile/you" target="_blank">@al-capone</a>.'
            commentAuthor = await database.neode.create('User', {
              id: 'commentAuthor',
              name: 'Mrs Comment',
              slug: 'mrs-comment',
            })
          })

          it('sends me a notification', async () => {
            await createCommentOnPostAction()
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
                    createdAt: expect.any(String),
                    from: {
                      __typename: 'Comment',
                      content:
                        'One mention about me with <a data-mention-id="you" class="mention" href="/profile/you" target="_blank">@al-capone</a>.',
                      id: 'c47',
                    },
                    read: false,
                    reason: 'mentioned_in_comment',
                    relatedUser: null,
                  },
                ],
              },
              errors: undefined,
            })
          })

          it('publishes `NOTIFICATION_ADDED` to authenticated user and me', async () => {
            await createCommentOnPostAction()
            expect(pubsubSpy).toHaveBeenCalledWith(
              'NOTIFICATION_ADDED',
              expect.objectContaining({
                notificationAdded: expect.objectContaining({
                  reason: 'commented_on_post',
                  to: expect.objectContaining({
                    id: 'postAuthor', // that's expected, it's not me but the post author
                  }),
                }),
              }),
            )
            expect(pubsubSpy).toHaveBeenCalledTimes(2)
          })
        })
      })
    })
  })

  describe('chat notifications', () => {
    let chatSender
    let chatReceiver
    let roomId

    beforeEach(async () => {
      jest.clearAllMocks()

      chatSender = await database.neode.create('User', {
        id: 'chatSender',
        name: 'chatSender',
        slug: 'chatSender',
      })

      chatReceiver = await Factory.build(
        'user',
        { id: 'chatReceiver', name: 'chatReceiver', slug: 'chatReceiver' },
        { email: 'user@example.org' },
      )

      authenticatedUser = await chatSender.toJson()

      const room = await mutate({
        mutation: createRoomMutation(),
        variables: {
          userId: 'chatReceiver',
        },
      })
      roomId = room.data.CreateRoom.id
    })

    describe('if the chatReceiver is online', () => {
      it('publishes subscriptions but sends no email', async () => {
        isUserOnlineMock = jest.fn().mockReturnValue(true)

        await mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId,
            content: 'Some nice message to chatReceiver',
          },
        })

        expect(pubsubSpy).toHaveBeenCalledWith('ROOM_COUNT_UPDATED', {
          roomCountUpdated: '1',
          userId: 'chatReceiver',
        })
        expect(pubsubSpy).toHaveBeenCalledWith('CHAT_MESSAGE_ADDED', {
          chatMessageAdded: expect.objectContaining({
            id: expect.any(String),
            content: 'Some nice message to chatReceiver',
            senderId: 'chatSender',
            username: 'chatSender',
            avatar: null,
            date: expect.any(String),
            saved: true,
            distributed: false,
            seen: false,
          }),
          userId: 'chatReceiver',
        })

        expect(sendMailMock).not.toHaveBeenCalled()
        expect(chatMessageTemplateMock).not.toHaveBeenCalled()
      })
    })

    describe('if the chatReceiver is offline', () => {
      it('publishes subscriptions and sends an email', async () => {
        isUserOnlineMock = jest.fn().mockReturnValue(false)

        await mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId,
            content: 'Some nice message to chatReceiver',
          },
        })

        expect(pubsubSpy).toHaveBeenCalledWith('ROOM_COUNT_UPDATED', {
          roomCountUpdated: '1',
          userId: 'chatReceiver',
        })
        expect(pubsubSpy).toHaveBeenCalledWith('CHAT_MESSAGE_ADDED', {
          chatMessageAdded: expect.objectContaining({
            id: expect.any(String),
            content: 'Some nice message to chatReceiver',
            senderId: 'chatSender',
            username: 'chatSender',
            avatar: null,
            date: expect.any(String),
            saved: true,
            distributed: false,
            seen: false,
          }),
          userId: 'chatReceiver',
        })

        expect(sendMailMock).toHaveBeenCalledTimes(1)
        expect(chatMessageTemplateMock).toHaveBeenCalledTimes(1)
      })
    })

    describe('if the chatReceiver has blocked chatSender', () => {
      it('publishes no subscriptions and sends no email', async () => {
        isUserOnlineMock = jest.fn().mockReturnValue(false)
        await chatReceiver.relateTo(chatSender, 'blocked')

        await mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId,
            content: 'Some nice message to chatReceiver',
          },
        })

        expect(pubsubSpy).not.toHaveBeenCalled()
        expect(pubsubSpy).not.toHaveBeenCalled()

        expect(sendMailMock).not.toHaveBeenCalled()
        expect(chatMessageTemplateMock).not.toHaveBeenCalled()
      })
    })

    describe('if the chatReceiver has muted chatSender', () => {
      it('publishes no subscriptions and sends no email', async () => {
        isUserOnlineMock = jest.fn().mockReturnValue(false)
        await chatReceiver.relateTo(chatSender, 'muted')

        await mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId,
            content: 'Some nice message to chatReceiver',
          },
        })

        expect(pubsubSpy).not.toHaveBeenCalled()
        expect(pubsubSpy).not.toHaveBeenCalled()

        expect(sendMailMock).not.toHaveBeenCalled()
        expect(chatMessageTemplateMock).not.toHaveBeenCalled()
      })
    })

    describe('if the chatReceiver has disabled `emailNotificationsChatMessage`', () => {
      it('publishes subscriptions but sends no email', async () => {
        isUserOnlineMock = jest.fn().mockReturnValue(false)
        await chatReceiver.update({ emailNotificationsChatMessage: false })

        await mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId,
            content: 'Some nice message to chatReceiver',
          },
        })

        expect(pubsubSpy).toHaveBeenCalledWith('ROOM_COUNT_UPDATED', {
          roomCountUpdated: '1',
          userId: 'chatReceiver',
        })
        expect(pubsubSpy).toHaveBeenCalledWith('CHAT_MESSAGE_ADDED', {
          chatMessageAdded: expect.objectContaining({
            id: expect.any(String),
            content: 'Some nice message to chatReceiver',
            senderId: 'chatSender',
            username: 'chatSender',
            avatar: null,
            date: expect.any(String),
            saved: true,
            distributed: false,
            seen: false,
          }),
          userId: 'chatReceiver',
        })

        expect(sendMailMock).not.toHaveBeenCalled()
        expect(chatMessageTemplateMock).not.toHaveBeenCalled()
      })
    })
  })

  describe('group notifications', () => {
    let groupOwner

    beforeEach(async () => {
      groupOwner = await Factory.build(
        'user',
        {
          id: 'group-owner',
          name: 'Group Owner',
          slug: 'group-owner',
        },
        {
          email: 'owner@example.org',
          password: '1234',
        },
      )
      authenticatedUser = await groupOwner.toJson()
      await mutate({
        mutation: createGroupMutation(),
        variables: {
          id: 'closed-group',
          name: 'The Closed Group',
          about: 'Will test the closed group!',
          description: 'Some description' + Array(50).join('_'),
          groupType: 'public',
          actionRadius: 'regional',
          categoryIds,
        },
      })
    })

    describe('user joins group', () => {
      const joinGroupAction = async () => {
        authenticatedUser = await notifiedUser.toJson()
        await mutate({
          mutation: joinGroupMutation(),
          variables: {
            groupId: 'closed-group',
            userId: authenticatedUser.id,
          },
        })
        authenticatedUser = await groupOwner.toJson()
      }

      beforeEach(async () => {
        jest.clearAllMocks()
      })

      it('sends the group owner a notification and email', async () => {
        await joinGroupAction()
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                read: false,
                reason: 'user_joined_group',
                createdAt: expect.any(String),
                from: {
                  __typename: 'Group',
                  id: 'closed-group',
                },
                relatedUser: {
                  id: 'you',
                },
              },
            ],
          },
          errors: undefined,
        })

        // Mail
        expect(sendMailMock).toHaveBeenCalledTimes(1)
        expect(notificationTemplateMock).toHaveBeenCalledTimes(1)
      })

      describe('if the group owner has disabled `emailNotificationsGroupMemberJoined`', () => {
        it('sends the group owner a notification but no email', async () => {
          await groupOwner.update({ emailNotificationsGroupMemberJoined: false })
          await joinGroupAction()
          await expect(
            query({
              query: notificationQuery,
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: [
                {
                  read: false,
                  reason: 'user_joined_group',
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Group',
                    id: 'closed-group',
                  },
                  relatedUser: {
                    id: 'you',
                  },
                },
              ],
            },
            errors: undefined,
          })

          // Mail
          expect(sendMailMock).not.toHaveBeenCalled()
          expect(notificationTemplateMock).not.toHaveBeenCalled()
        })
      })
    })

    describe('user joins and leaves group', () => {
      const leaveGroupAction = async () => {
        authenticatedUser = await notifiedUser.toJson()
        await mutate({
          mutation: leaveGroupMutation(),
          variables: {
            groupId: 'closed-group',
            userId: authenticatedUser.id,
          },
        })
        authenticatedUser = await groupOwner.toJson()
      }

      beforeEach(async () => {
        jest.clearAllMocks()
        authenticatedUser = await notifiedUser.toJson()
        await mutate({
          mutation: joinGroupMutation(),
          variables: {
            groupId: 'closed-group',
            userId: authenticatedUser.id,
          },
        })
      })

      it('sends the group owner two notifications and emails', async () => {
        await leaveGroupAction()
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                read: false,
                reason: 'user_left_group',
                createdAt: expect.any(String),
                from: {
                  __typename: 'Group',
                  id: 'closed-group',
                },
                relatedUser: {
                  id: 'you',
                },
              },
              {
                read: false,
                reason: 'user_joined_group',
                createdAt: expect.any(String),
                from: {
                  __typename: 'Group',
                  id: 'closed-group',
                },
                relatedUser: {
                  id: 'you',
                },
              },
            ],
          },
          errors: undefined,
        })

        // Mail
        expect(sendMailMock).toHaveBeenCalledTimes(2)
        expect(notificationTemplateMock).toHaveBeenCalledTimes(2)
      })

      describe('if the group owner has disabled `emailNotificationsGroupMemberLeft`', () => {
        it('sends the group owner two notification but only only one email', async () => {
          await groupOwner.update({ emailNotificationsGroupMemberLeft: false })
          await leaveGroupAction()
          await expect(
            query({
              query: notificationQuery,
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: [
                {
                  read: false,
                  reason: 'user_left_group',
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Group',
                    id: 'closed-group',
                  },
                  relatedUser: {
                    id: 'you',
                  },
                },
                {
                  read: false,
                  reason: 'user_joined_group',
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Group',
                    id: 'closed-group',
                  },
                  relatedUser: {
                    id: 'you',
                  },
                },
              ],
            },
            errors: undefined,
          })

          // Mail
          expect(sendMailMock).toHaveBeenCalledTimes(1)
          expect(notificationTemplateMock).toHaveBeenCalledTimes(1)
        })
      })
    })

    describe('user role in group changes', () => {
      const changeGroupMemberRoleAction = async () => {
        authenticatedUser = await groupOwner.toJson()
        await mutate({
          mutation: changeGroupMemberRoleMutation(),
          variables: {
            groupId: 'closed-group',
            userId: 'you',
            roleInGroup: 'admin',
          },
        })
        authenticatedUser = await notifiedUser.toJson()
      }

      beforeEach(async () => {
        authenticatedUser = await notifiedUser.toJson()
        await mutate({
          mutation: joinGroupMutation(),
          variables: {
            groupId: 'closed-group',
            userId: authenticatedUser.id,
          },
        })
        // Clear after because the above generates a notification not related
        jest.clearAllMocks()
      })

      it('sends the group member a notification and email', async () => {
        await changeGroupMemberRoleAction()
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                read: false,
                reason: 'changed_group_member_role',
                createdAt: expect.any(String),
                from: {
                  __typename: 'Group',
                  id: 'closed-group',
                },
                relatedUser: {
                  id: 'group-owner',
                },
              },
            ],
          },
          errors: undefined,
        })

        // Mail
        expect(sendMailMock).toHaveBeenCalledTimes(1)
        expect(notificationTemplateMock).toHaveBeenCalledTimes(1)
      })

      describe('if the group member has disabled `emailNotificationsGroupMemberRoleChanged`', () => {
        it('sends the group member a notification but no email', async () => {
          notifiedUser.update({ emailNotificationsGroupMemberRoleChanged: false })
          await changeGroupMemberRoleAction()
          await expect(
            query({
              query: notificationQuery,
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: [
                {
                  read: false,
                  reason: 'changed_group_member_role',
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Group',
                    id: 'closed-group',
                  },
                  relatedUser: {
                    id: 'group-owner',
                  },
                },
              ],
            },
            errors: undefined,
          })

          // Mail
          expect(sendMailMock).not.toHaveBeenCalled()
          expect(notificationTemplateMock).not.toHaveBeenCalled()
        })
      })
    })

    describe('user is removed from group', () => {
      const removeUserFromGroupAction = async () => {
        authenticatedUser = await groupOwner.toJson()
        await mutate({
          mutation: removeUserFromGroupMutation(),
          variables: {
            groupId: 'closed-group',
            userId: 'you',
          },
        })
        authenticatedUser = await notifiedUser.toJson()
      }

      beforeEach(async () => {
        authenticatedUser = await notifiedUser.toJson()
        await mutate({
          mutation: joinGroupMutation(),
          variables: {
            groupId: 'closed-group',
            userId: authenticatedUser.id,
          },
        })
        // Clear after because the above generates a notification not related
        jest.clearAllMocks()
      })

      it('sends the previous group member a notification and email', async () => {
        await removeUserFromGroupAction()
        await expect(
          query({
            query: notificationQuery,
          }),
        ).resolves.toMatchObject({
          data: {
            notifications: [
              {
                read: false,
                reason: 'removed_user_from_group',
                createdAt: expect.any(String),
                from: {
                  __typename: 'Group',
                  id: 'closed-group',
                },
                relatedUser: {
                  id: 'group-owner',
                },
              },
            ],
          },
          errors: undefined,
        })

        // Mail
        expect(sendMailMock).toHaveBeenCalledTimes(1)
        expect(notificationTemplateMock).toHaveBeenCalledTimes(1)
      })

      describe('if the previous group member has disabled `emailNotificationsGroupMemberRemoved`', () => {
        it('sends the previous group member a notification but no email', async () => {
          notifiedUser.update({ emailNotificationsGroupMemberRemoved: false })
          await removeUserFromGroupAction()
          await expect(
            query({
              query: notificationQuery,
            }),
          ).resolves.toMatchObject({
            data: {
              notifications: [
                {
                  read: false,
                  reason: 'removed_user_from_group',
                  createdAt: expect.any(String),
                  from: {
                    __typename: 'Group',
                    id: 'closed-group',
                  },
                  relatedUser: {
                    id: 'group-owner',
                  },
                },
              ],
            },
            errors: undefined,
          })

          // Mail
          expect(sendMailMock).not.toHaveBeenCalled()
          expect(notificationTemplateMock).not.toHaveBeenCalled()
        })
      })
    })
  })
})
