import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import { createRoomMutation, roomQuery } from '../../graphql/rooms'
import { createMessageMutation, messageQuery, markMessagesAsSeen } from '../../graphql/messages'
import createServer, { pubsub } from '../../server'

const driver = getDriver()
const neode = getNeode()

const pubsubSpy = jest.spyOn(pubsub, 'publish')

let query
let mutate
let authenticatedUser
let chattingUser, otherChattingUser, notChattingUser

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
        cypherParams: {
          currentUserId: authenticatedUser ? authenticatedUser.id : null,
        },
      }
    },
  })
  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

describe('Message', () => {
  let roomId: string

  beforeAll(async () => {
    ;[chattingUser, otherChattingUser, notChattingUser] = await Promise.all([
      Factory.build('user', {
        id: 'chatting-user',
        name: 'Chatting User',
      }),
      Factory.build('user', {
        id: 'other-chatting-user',
        name: 'Other Chatting User',
      }),
      Factory.build('user', {
        id: 'not-chatting-user',
        name: 'Not Chatting User',
      }),
    ])
  })

  describe('create message', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        await expect(
          mutate({
            mutation: createMessageMutation(),
            variables: {
              roomId: 'some-id',
              content: 'Some bla bla bla',
            },
          }),
        ).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      beforeAll(async () => {
        authenticatedUser = await chattingUser.toJson()
      })

      describe('room does not exist', () => {
        it('returns null and does not publish subscription', async () => {
          await expect(
            mutate({
              mutation: createMessageMutation(),
              variables: {
                roomId: 'some-id',
                content: 'Some bla bla bla',
              },
            }),
          ).resolves.toMatchObject({
            errors: undefined,
            data: {
              CreateMessage: null,
            },
          })
          expect(pubsubSpy).not.toBeCalled()
        })
      })

      describe('room exists', () => {
        beforeAll(async () => {
          const room = await mutate({
            mutation: createRoomMutation(),
            variables: {
              userId: 'other-chatting-user',
            },
          })
          roomId = room.data.CreateRoom.id
        })

        describe('user chats in room', () => {
          it('returns the message and publishes subscriptions', async () => {
            await expect(
              mutate({
                mutation: createMessageMutation(),
                variables: {
                  roomId,
                  content: 'Some nice message to other chatting user',
                },
              }),
            ).resolves.toMatchObject({
              errors: undefined,
              data: {
                CreateMessage: {
                  id: expect.any(String),
                  content: 'Some nice message to other chatting user',
                  senderId: 'chatting-user',
                  username: 'Chatting User',
                  avatar: expect.any(String),
                  date: expect.any(String),
                  saved: true,
                  distributed: false,
                  seen: false,
                },
              },
            })
            expect(pubsubSpy).toBeCalledWith('ROOM_COUNT_UPDATED', {
              roomCountUpdated: '1',
              userId: 'other-chatting-user',
            })
            expect(pubsubSpy).toBeCalledWith('CHAT_MESSAGE_ADDED', {
              chatMessageAdded: expect.objectContaining({
                id: expect.any(String),
                content: 'Some nice message to other chatting user',
                senderId: 'chatting-user',
                username: 'Chatting User',
                avatar: expect.any(String),
                date: expect.any(String),
                saved: true,
                distributed: false,
                seen: false,
              }),
              userId: 'other-chatting-user',
            })
          })

          describe('room is updated as well', () => {
            it('has last message set', async () => {
              const result = await query({ query: roomQuery() })
              await expect(result).toMatchObject({
                errors: undefined,
                data: {
                  Room: [
                    expect.objectContaining({
                      lastMessageAt: expect.any(String),
                      unreadCount: 0,
                      lastMessage: expect.objectContaining({
                        _id: result.data.Room[0].lastMessage.id,
                        id: expect.any(String),
                        content: 'Some nice message to other chatting user',
                        senderId: 'chatting-user',
                        username: 'Chatting User',
                        avatar: expect.any(String),
                        date: expect.any(String),
                        saved: true,
                        distributed: false,
                        seen: false,
                      }),
                    }),
                  ],
                },
              })
            })
          })

          describe('unread count for other user', () => {
            it('has unread count = 1', async () => {
              authenticatedUser = await otherChattingUser.toJson()
              await expect(query({ query: roomQuery() })).resolves.toMatchObject({
                errors: undefined,
                data: {
                  Room: [
                    expect.objectContaining({
                      lastMessageAt: expect.any(String),
                      unreadCount: 1,
                      lastMessage: expect.objectContaining({
                        _id: expect.any(String),
                        id: expect.any(String),
                        content: 'Some nice message to other chatting user',
                        senderId: 'chatting-user',
                        username: 'Chatting User',
                        avatar: expect.any(String),
                        date: expect.any(String),
                        saved: true,
                        distributed: false,
                        seen: false,
                      }),
                    }),
                  ],
                },
              })
            })
          })
        })

        describe('user does not chat in room', () => {
          beforeAll(async () => {
            authenticatedUser = await notChattingUser.toJson()
          })

          it('returns null', async () => {
            await expect(
              mutate({
                mutation: createMessageMutation(),
                variables: {
                  roomId,
                  content: 'I have no access to this room!',
                },
              }),
            ).resolves.toMatchObject({
              errors: undefined,
              data: {
                CreateMessage: null,
              },
            })
          })
        })
      })
    })
  })

  describe('message query', () => {
    describe('unauthenticated', () => {
      beforeAll(() => {
        authenticatedUser = null
      })

      it('throws authorization error', async () => {
        await expect(
          query({
            query: messageQuery(),
            variables: {
              roomId: 'some-id',
            },
          }),
        ).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      beforeAll(async () => {
        authenticatedUser = await otherChattingUser.toJson()
      })

      describe('room does not exists', () => {
        it('returns null', async () => {
          await expect(
            query({
              query: messageQuery(),
              variables: {
                roomId: 'some-id',
              },
            }),
          ).resolves.toMatchObject({
            errors: undefined,
            data: {
              Message: [],
            },
          })
        })
      })

      describe('room exists with authenticated user chatting', () => {
        it('returns the messages', async () => {
          const result = await query({
            query: messageQuery(),
            variables: {
              roomId,
            },
          })
          expect(result).toMatchObject({
            errors: undefined,
            data: {
              Message: [
                {
                  id: expect.any(String),
                  _id: result.data.Message[0].id,
                  indexId: 0,
                  content: 'Some nice message to other chatting user',
                  senderId: 'chatting-user',
                  username: 'Chatting User',
                  avatar: expect.any(String),
                  date: expect.any(String),
                  saved: true,
                  distributed: true,
                  seen: false,
                },
              ],
            },
          })
        })

        describe('more messages', () => {
          beforeAll(async () => {
            await mutate({
              mutation: createMessageMutation(),
              variables: {
                roomId,
                content: 'A nice response message to chatting user',
              },
            })
            authenticatedUser = await chattingUser.toJson()
            await mutate({
              mutation: createMessageMutation(),
              variables: {
                roomId,
                content: 'And another nice message to other chatting user',
              },
            })
          })

          it('returns the messages', async () => {
            await expect(
              query({
                query: messageQuery(),
                variables: {
                  roomId,
                },
              }),
            ).resolves.toMatchObject({
              errors: undefined,
              data: {
                Message: [
                  expect.objectContaining({
                    id: expect.any(String),
                    indexId: 0,
                    content: 'Some nice message to other chatting user',
                    senderId: 'chatting-user',
                    username: 'Chatting User',
                    avatar: expect.any(String),
                    date: expect.any(String),
                    saved: true,
                    distributed: true,
                    seen: false,
                  }),
                  expect.objectContaining({
                    id: expect.any(String),
                    indexId: 1,
                    content: 'A nice response message to chatting user',
                    senderId: 'other-chatting-user',
                    username: 'Other Chatting User',
                    avatar: expect.any(String),
                    date: expect.any(String),
                    saved: true,
                    distributed: true,
                    seen: false,
                  }),
                  expect.objectContaining({
                    id: expect.any(String),
                    indexId: 2,
                    content: 'And another nice message to other chatting user',
                    senderId: 'chatting-user',
                    username: 'Chatting User',
                    avatar: expect.any(String),
                    date: expect.any(String),
                    saved: true,
                    distributed: false,
                    seen: false,
                  }),
                ],
              },
            })
          })

          it('returns the messages paginated', async () => {
            await expect(
              query({
                query: messageQuery(),
                variables: {
                  roomId,
                  first: 2,
                  offset: 0,
                },
              }),
            ).resolves.toMatchObject({
              errors: undefined,
              data: {
                Message: [
                  expect.objectContaining({
                    id: expect.any(String),
                    indexId: 1,
                    content: 'A nice response message to chatting user',
                    senderId: 'other-chatting-user',
                    username: 'Other Chatting User',
                    avatar: expect.any(String),
                    date: expect.any(String),
                  }),
                  expect.objectContaining({
                    id: expect.any(String),
                    indexId: 2,
                    content: 'And another nice message to other chatting user',
                    senderId: 'chatting-user',
                    username: 'Chatting User',
                    avatar: expect.any(String),
                    date: expect.any(String),
                  }),
                ],
              },
            })

            await expect(
              query({
                query: messageQuery(),
                variables: {
                  roomId,
                  first: 2,
                  offset: 2,
                },
              }),
            ).resolves.toMatchObject({
              errors: undefined,
              data: {
                Message: [
                  expect.objectContaining({
                    id: expect.any(String),
                    indexId: 0,
                    content: 'Some nice message to other chatting user',
                    senderId: 'chatting-user',
                    username: 'Chatting User',
                    avatar: expect.any(String),
                    date: expect.any(String),
                  }),
                ],
              },
            })
          })
        })
      })

      describe('room exists, authenticated user not in room', () => {
        beforeAll(async () => {
          authenticatedUser = await notChattingUser.toJson()
        })

        it('returns null', async () => {
          await expect(
            query({
              query: messageQuery(),
              variables: {
                roomId,
              },
            }),
          ).resolves.toMatchObject({
            errors: undefined,
            data: {
              Message: [],
            },
          })
        })
      })
    })
  })

  describe('marks massges as seen', () => {
    describe('unauthenticated', () => {
      beforeAll(() => {
        authenticatedUser = null
      })

      it('throws authorization error', async () => {
        await expect(
          mutate({
            mutation: markMessagesAsSeen(),
            variables: {
              messageIds: ['some-id'],
            },
          }),
        ).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      const messageIds: string[] = []
      beforeAll(async () => {
        authenticatedUser = await otherChattingUser.toJson()
        const msgs = await query({
          query: messageQuery(),
          variables: {
            roomId,
          },
        })
        msgs.data.Message.forEach((m) => messageIds.push(m.id))
      })

      it('returns true', async () => {
        await expect(
          mutate({
            mutation: markMessagesAsSeen(),
            variables: {
              messageIds,
            },
          }),
        ).resolves.toMatchObject({
          errors: undefined,
          data: {
            MarkMessagesAsSeen: true,
          },
        })
      })

      it('has seen prop set to true', async () => {
        await expect(
          query({
            query: messageQuery(),
            variables: {
              roomId,
            },
          }),
        ).resolves.toMatchObject({
          data: {
            Message: [
              expect.objectContaining({ seen: true }),
              expect.objectContaining({ seen: false }),
              expect.objectContaining({ seen: true }),
            ],
          },
        })
      })
    })
  })
})
