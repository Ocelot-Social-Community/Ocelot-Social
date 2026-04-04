/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { Readable } from 'node:stream'

import { Upload } from 'graphql-upload/public/index'

import pubsubContext from '@context/pubsub'
import Factory, { cleanDatabase } from '@db/factories'
import CreateMessage from '@graphql/queries/messaging/CreateMessage.gql'
import MarkMessagesAsSeen from '@graphql/queries/messaging/MarkMessagesAsSeen.gql'
import Message from '@graphql/queries/messaging/Message.gql'
import Room from '@graphql/queries/messaging/Room.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import { chatMessageAddedFilter, chatMessageStatusUpdatedFilter } from './messages'
import resolvers from './messages'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, pubsub })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let chattingUser, otherChattingUser, notChattingUser

const pubsub = pubsubContext()
const pubsubSpy = jest.spyOn(pubsub, 'publish')

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
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
      beforeAll(() => {
        authenticatedUser = null
      })

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
          expect(pubsubSpy).not.toHaveBeenCalled()
        })
      })

      describe('room exists', () => {
        beforeEach(async () => {
          authenticatedUser = await chattingUser.toJson()
          const result = await mutate({
            mutation: CreateMessage,
            variables: {
              userId: 'other-chatting-user',
              content: 'init',
            },
          })
          roomId = result.data.CreateMessage.room.id
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
              const result = await query({ query: Room })
              await expect(result).toMatchObject({
                errors: undefined,
                data: {
                  Room: [
                    expect.objectContaining({
                      lastMessageAt: expect.any(String),
                      unreadCount: 0,
                      lastMessage: expect.objectContaining({
                        _id: result.data?.Room[0].lastMessage.id,
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
            it('has unread count = 2', async () => {
              authenticatedUser = await otherChattingUser.toJson()
              await expect(query({ query: Room })).resolves.toMatchObject({
                errors: undefined,
                data: {
                  Room: [
                    expect.objectContaining({
                      lastMessageAt: expect.any(String),
                      unreadCount: 2,
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

        describe('user sends file, but upload goes wrong', () => {
          const file1 = Readable.from('file1')
          const upload1 = new Upload()
          upload1.resolve({
            createReadStream: () => file1,
            stream: file1,
            filename: 'file1',
            encoding: '7bit',
            mimetype: 'application/json',
          })
          const upload2 = new Upload()
          upload2.resolve(new Error('Upload failed'))

          it('no message is created', async () => {
            await expect(
              mutate({
                mutation: CreateMessage,
                variables: {
                  roomId,
                  content: 'A message which should not be created',
                  files: [
                    { upload: upload1, name: 'test1', type: 'application/json' },
                    { upload: upload2, name: 'test2', type: 'image/png' },
                  ],
                },
              }),
            ).resolves.toMatchObject({
              errors: {},
              data: {
                CreateMessage: null,
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
              errors: undefined,
              data: {
                Message: [expect.objectContaining({ content: 'init' })],
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
          const result = await mutate({
            mutation: CreateMessage,
            variables: {
              userId: 'other-chatting-user',
              content: 'init',
            },
          })
          roomId = result.data.CreateMessage.room.id

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
                expect.objectContaining({
                  indexId: 0,
                  content: 'init',
                  senderId: 'chatting-user',
                }),
                {
                  id: expect.any(String),
                  _id: result.data?.Message[1].id,
                  indexId: 1,
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
                    indexId: 0,
                    content: 'init',
                    senderId: 'chatting-user',
                  }),
                  expect.objectContaining({
                    id: expect.any(String),
                    indexId: 1,
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
                    indexId: 2,
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
                    indexId: 3,
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
            // Messages ordered by indexId DESC: 3, 2, 1, 0
            // first: 2, offset: 0 → indexId 2 and 3 (reversed to ASC)
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
                    indexId: 2,
                    content: 'A nice response message to chatting user',
                    senderId: 'other-chatting-user',
                  }),
                  expect.objectContaining({
                    indexId: 3,
                    content: 'And another nice message to other chatting user',
                    senderId: 'chatting-user',
                  }),
                ],
              },
            })

            // first: 2, offset: 2 → indexId 0 and 1 (reversed to ASC)
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
                    indexId: 0,
                    content: 'init',
                    senderId: 'chatting-user',
                  }),
                  expect.objectContaining({
                    indexId: 1,
                    content: 'Some nice message to other chatting user',
                    senderId: 'chatting-user',
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
        const result = await mutate({
          mutation: CreateMessage,
          variables: {
            userId: 'other-chatting-user',
            content: 'init',
          },
        })
        roomId = result.data.CreateMessage.room.id
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
        msgs.data?.Message.forEach((m) => messageIds.push(m.id))
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
              expect.objectContaining({ seen: true }),
              expect.objectContaining({ seen: false }),
              expect.objectContaining({ seen: true }),
            ],
          },
        })
      })
    })
  })

  describe('message query with beforeIndex', () => {
    let testRoomId: string

    beforeAll(async () => {
      authenticatedUser = await chattingUser.toJson()
      const result = await mutate({
        mutation: CreateMessage,
        variables: { userId: 'other-chatting-user', content: 'msg-0' },
      })
      testRoomId = result.data.CreateMessage.room.id
      await mutate({ mutation: CreateMessage, variables: { roomId: testRoomId, content: 'msg-1' } })
      await mutate({ mutation: CreateMessage, variables: { roomId: testRoomId, content: 'msg-2' } })
    })

    it('returns only messages with indexId less than beforeIndex', async () => {
      const result = await query({
        query: Message,
        variables: { roomId: testRoomId, beforeIndex: 2 },
      })
      expect(result.errors).toBeUndefined()
      const indexIds: number[] = result.data.Message.map((m: { indexId: number }) => m.indexId)
      expect(indexIds.every((id: number) => id < 2)).toBe(true)
    })
  })

  describe('subscription filters', () => {
    describe('chatMessageAddedFilter', () => {
      it('returns true for recipient and marks as distributed', async () => {
        const mockSession = {
          writeTransaction: jest
            .fn()
            .mockResolvedValue([{ roomId: 'r1', authorId: 'a1', messageIds: ['m1'] }]),
          close: jest.fn(),
        }
        const filterContext = {
          user: { id: 'recipient' },
          driver: { session: () => mockSession },
          pubsub: { publish: jest.fn() },
        }
        const result = await chatMessageAddedFilter(
          { userId: 'recipient', chatMessageAdded: { id: 'm1' } },
          filterContext,
        )
        expect(result).toBe(true)
        expect(mockSession.writeTransaction).toHaveBeenCalled()
        expect(filterContext.pubsub.publish).toHaveBeenCalledWith(
          'CHAT_MESSAGE_STATUS_UPDATED',
          expect.objectContaining({
            chatMessageStatusUpdated: { roomId: 'r1', messageIds: ['m1'], status: 'distributed' },
          }),
        )
      })

      it('returns false for non-recipient', async () => {
        const result = await chatMessageAddedFilter(
          { userId: 'other', chatMessageAdded: { id: 'm1' } },
          { user: { id: 'me' } },
        )
        expect(result).toBe(false)
      })

      it('skips distributed marking when no message id', async () => {
        const mockSession = { writeTransaction: jest.fn(), close: jest.fn() }
        const result = await chatMessageAddedFilter(
          { userId: 'me', chatMessageAdded: {} },
          { user: { id: 'me' }, driver: { session: () => mockSession } },
        )
        expect(result).toBe(true)
        expect(mockSession.writeTransaction).not.toHaveBeenCalled()
      })
    })

    describe('chatMessageStatusUpdatedFilter', () => {
      it('returns true when authorId matches', () => {
        expect(chatMessageStatusUpdatedFilter({ authorId: 'u1' }, { user: { id: 'u1' } })).toBe(
          true,
        )
      })

      it('returns false when authorId does not match', () => {
        expect(chatMessageStatusUpdatedFilter({ authorId: 'u1' }, { user: { id: 'u2' } })).toBe(
          false,
        )
      })
    })
  })

  describe('create message validation', () => {
    beforeAll(async () => {
      authenticatedUser = await chattingUser.toJson()
    })

    it('rejects creating a room with self', async () => {
      const result = await mutate({
        mutation: CreateMessage,
        variables: { userId: 'chatting-user', content: 'test' },
      })
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain('Cannot create a room with self')
    })

    it('rejects missing roomId and userId', async () => {
      const result = await mutate({
        mutation: CreateMessage,
        variables: { content: 'test' },
      })
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain('Either roomId or userId must be provided')
    })

    it('rejects empty content without files', async () => {
      const result = await mutate({
        mutation: CreateMessage,
        variables: { userId: 'other-chatting-user', content: '' },
      })
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain('Message must have content or files')
    })
  })

  describe('File field resolvers', () => {
    it('returns extension when present', () => {
      expect(resolvers.File.extension({ extension: 'jpg' })).toBe('jpg')
    })

    it('returns null when extension is undefined', () => {
      expect(resolvers.File.extension({})).toBeNull()
    })

    it('returns null when extension is null', () => {
      expect(resolvers.File.extension({ extension: null })).toBeNull()
    })

    it('returns duration when present', () => {
      expect(resolvers.File.duration({ duration: 5.3 })).toBe(5.3)
    })

    it('returns null when duration is undefined', () => {
      expect(resolvers.File.duration({})).toBeNull()
    })

    it('returns null when duration is null', () => {
      expect(resolvers.File.duration({ duration: null })).toBeNull()
    })

    it('returns duration 0 as valid', () => {
      expect(resolvers.File.duration({ duration: 0 })).toBe(0)
    })
  })
})
