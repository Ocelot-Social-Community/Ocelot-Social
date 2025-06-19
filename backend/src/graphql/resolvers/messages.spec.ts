/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Readable } from 'node:stream'

import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'
import { Upload } from 'graphql-upload/public/index'

import databaseContext from '@context/database'
import pubsubContext from '@context/pubsub'
import Factory, { cleanDatabase } from '@db/factories'
import { CreateMessage } from '@graphql/queries/CreateMessage'
import { createRoomMutation } from '@graphql/queries/createRoomMutation'
import { MarkMessagesAsSeen } from '@graphql/queries/MarkMessagesAsSeen'
import { Message } from '@graphql/queries/Message'
import { roomQuery } from '@graphql/queries/roomQuery'
import createServer, { getContext } from '@src/server'

let query
let mutate
let authenticatedUser
let chattingUser, otherChattingUser, notChattingUser

const database = databaseContext()
const pubsub = pubsubContext()
const pubsubSpy = jest.spyOn(pubsub, 'publish')

let server: ApolloServer
beforeAll(async () => {
  await cleanDatabase()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await
  const contextUser = async (_req) => authenticatedUser
  const context = getContext({ user: contextUser, database, pubsub })

  server = createServer({ context }).server

  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

beforeEach(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('Message', () => {
  let roomId: string

  beforeEach(async () => {
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
            mutation: CreateMessage,
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
              mutation: CreateMessage,
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
        beforeEach(async () => {
          authenticatedUser = await chattingUser.toJson()
          const room = await mutate({
            mutation: createRoomMutation(),
            variables: {
              userId: 'other-chatting-user',
            },
          })
          roomId = room.data.CreateRoom.id
        })

        describe('user chats in room', () => {
          it('returns the message', async () => {
            await expect(
              mutate({
                mutation: CreateMessage,
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
          })

          beforeEach(async () => {
            await mutate({
              mutation: CreateMessage,
              variables: {
                roomId,
                content: 'Some nice message to other chatting user',
              },
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

        describe('user sends files in room', () => {
          const file1 = Readable.from('file1')
          const upload1 = new Upload()
          upload1.resolve({
            createReadStream: () => file1,
            stream: file1,
            filename: 'file1',
            encoding: '7bit',
            mimetype: 'application/json',
          })
          const file2 = Readable.from('file2')
          const upload2 = new Upload()
          upload2.resolve({
            createReadStream: () => file2,
            stream: file2,
            filename: 'file2',
            encoding: '7bit',
            mimetype: 'image/png',
          })
          it('returns the message', async () => {
            await expect(
              mutate({
                mutation: CreateMessage,
                variables: {
                  roomId,
                  content: 'Some files for other chatting user',
                  files: [
                    { upload: upload1, name: 'test1', type: 'application/json' },
                    { upload: upload2, name: 'test2', type: 'image/png' },
                  ],
                },
              }),
            ).resolves.toMatchObject({
              errors: undefined,
              data: {
                CreateMessage: {
                  id: expect.any(String),
                  content: 'Some files for other chatting user',
                  senderId: 'chatting-user',
                  username: 'Chatting User',
                  avatar: expect.any(String),
                  date: expect.any(String),
                  saved: true,
                  distributed: false,
                  seen: false,
                  files: expect.arrayContaining([
                    { name: 'test1', type: 'application/json', url: expect.any(String) },
                    { name: 'test2', type: 'image/png', url: expect.any(String) },
                  ]),
                },
              },
            })
          })
        })

        describe('user does not chat in room', () => {
          beforeEach(async () => {
            authenticatedUser = await notChattingUser.toJson()
          })

          it('returns null', async () => {
            await expect(
              mutate({
                mutation: CreateMessage,
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
            query: Message,
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
              query: Message,
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
        beforeEach(async () => {
          authenticatedUser = await chattingUser.toJson()
          const room = await mutate({
            mutation: createRoomMutation(),
            variables: {
              userId: 'other-chatting-user',
            },
          })
          roomId = room.data.CreateRoom.id

          await mutate({
            mutation: CreateMessage,
            variables: {
              roomId,
              content: 'Some nice message to other chatting user',
            },
          })
        })

        it('returns the messages', async () => {
          const result = await query({
            query: Message,
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
                  distributed: false,
                  seen: false,
                },
              ],
            },
          })
        })

        describe('more messages', () => {
          beforeEach(async () => {
            authenticatedUser = await otherChattingUser.toJson()
            await mutate({
              mutation: CreateMessage,
              variables: {
                roomId,
                content: 'A nice response message to chatting user',
              },
            })
            authenticatedUser = await chattingUser.toJson()
            await mutate({
              mutation: CreateMessage,
              variables: {
                roomId,
                content: 'And another nice message to other chatting user',
              },
            })
          })

          it('returns the messages', async () => {
            await expect(
              query({
                query: Message,
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
                    distributed: false,
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
                query: Message,
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
                query: Message,
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
              query: Message,
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
            mutation: MarkMessagesAsSeen,
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
      beforeEach(async () => {
        authenticatedUser = await chattingUser.toJson()
        const room = await mutate({
          mutation: createRoomMutation(),
          variables: {
            userId: 'other-chatting-user',
          },
        })
        roomId = room.data.CreateRoom.id
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId,
            content: 'Some nice message to other chatting user',
          },
        })
        authenticatedUser = await otherChattingUser.toJson()
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId,
            content: 'A nice response message to chatting user',
          },
        })
        authenticatedUser = await chattingUser.toJson()
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId,
            content: 'And another nice message to other chatting user',
          },
        })
        authenticatedUser = await otherChattingUser.toJson()
        const msgs = await query({
          query: Message,
          variables: {
            roomId,
          },
        })
        msgs.data.Message.forEach((m) => messageIds.push(m.id))
      })

      it('returns true', async () => {
        await expect(
          mutate({
            mutation: MarkMessagesAsSeen,
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
        await mutate({
          mutation: MarkMessagesAsSeen,
          variables: {
            messageIds,
          },
        })
        await expect(
          query({
            query: Message,
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
