/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Factory, { cleanDatabase } from '@db/factories'
import { CreateMessage } from '@graphql/queries/CreateMessage'
import { CreateRoom } from '@graphql/queries/CreateRoom'
import { Room } from '@graphql/queries/Room'
import { UnreadRooms } from '@graphql/queries/UnreadRooms'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let chattingUser, otherChattingUser, notChattingUser
let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

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

describe('Room', () => {
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
      Factory.build('user', {
        id: 'second-chatting-user',
        name: 'Second Chatting User',
      }),
      Factory.build('user', {
        id: 'third-chatting-user',
        name: 'Third Chatting User',
      }),
    ])
  })

  describe('create room', () => {
    describe('unauthenticated', () => {
      beforeAll(() => {
        authenticatedUser = null
      })

      it('throws authorization error', async () => {
        await expect(
          mutate({
            mutation: CreateRoom,
            variables: {
              userId: 'some-id',
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

      describe('user id does not exist', () => {
        it('returns null', async () => {
          await expect(
            mutate({
              mutation: CreateRoom,
              variables: {
                userId: 'not-existing-user',
              },
            }),
          ).resolves.toMatchObject({
            errors: undefined,
            data: {
              CreateRoom: null,
            },
          })
        })
      })

      describe('user id is self', () => {
        it('throws error', async () => {
          await expect(
            mutate({
              mutation: CreateRoom,
              variables: {
                userId: 'chatting-user',
              },
            }),
          ).resolves.toMatchObject({
            errors: [{ message: 'Cannot create a room with self' }],
          })
        })
      })

      describe('user id exists', () => {
        it('returns the id of the room', async () => {
          const result = await mutate({
            mutation: CreateRoom,
            variables: {
              userId: 'other-chatting-user',
            },
          })
          roomId = (result.data as any).CreateRoom.id
          expect(result).toMatchObject({
            errors: undefined,
            data: {
              CreateRoom: {
                id: expect.any(String),
                roomId: (result.data as any).CreateRoom.id,
                roomName: 'Other Chatting User',
                unreadCount: 0,
                users: expect.arrayContaining([
                  {
                    _id: 'chatting-user',
                    id: 'chatting-user',
                    name: 'Chatting User',
                    avatar: {
                      url: expect.any(String),
                    },
                  },
                  {
                    _id: 'other-chatting-user',
                    id: 'other-chatting-user',
                    name: 'Other Chatting User',
                    avatar: {
                      url: expect.any(String),
                    },
                  },
                ]),
              },
            },
          })
        })
      })

      describe('create room with same user id', () => {
        it('returns the id of the room', async () => {
          await expect(
            mutate({
              mutation: CreateRoom,
              variables: {
                userId: 'other-chatting-user',
              },
            }),
          ).resolves.toMatchObject({
            errors: undefined,
            data: {
              CreateRoom: {
                id: roomId,
              },
            },
          })
        })
      })
    })
  })

  describe('query room', () => {
    describe('unauthenticated', () => {
      beforeAll(() => {
        authenticatedUser = null
      })

      it('throws authorization error', async () => {
        await expect(query({ query: Room })).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      describe('as creator of room', () => {
        beforeAll(async () => {
          authenticatedUser = await chattingUser.toJson()
        })

        it('returns the room', async () => {
          const result = await query({ query: Room })
          expect(result).toMatchObject({
            errors: undefined,
            data: {
              Room: [
                {
                  id: expect.any(String),
                  roomId: (result.data as any).Room[0].id,
                  roomName: 'Other Chatting User',
                  users: expect.arrayContaining([
                    {
                      _id: 'chatting-user',
                      id: 'chatting-user',
                      name: 'Chatting User',
                      avatar: {
                        url: expect.any(String),
                      },
                    },
                    {
                      _id: 'other-chatting-user',
                      id: 'other-chatting-user',
                      name: 'Other Chatting User',
                      avatar: {
                        url: expect.any(String),
                      },
                    },
                  ]),
                },
              ],
            },
          })
        })
      })

      describe('as chatter of room', () => {
        beforeAll(async () => {
          authenticatedUser = await otherChattingUser.toJson()
        })

        it('returns the room', async () => {
          const result = await query({ query: Room })
          expect(result).toMatchObject({
            errors: undefined,
            data: {
              Room: [
                {
                  id: expect.any(String),
                  roomId: (result.data as any).Room[0].id,
                  roomName: 'Chatting User',
                  unreadCount: 0,
                  users: expect.arrayContaining([
                    {
                      _id: 'chatting-user',
                      id: 'chatting-user',
                      name: 'Chatting User',
                      avatar: {
                        url: expect.any(String),
                      },
                    },
                    {
                      _id: 'other-chatting-user',
                      id: 'other-chatting-user',
                      name: 'Other Chatting User',
                      avatar: {
                        url: expect.any(String),
                      },
                    },
                  ]),
                },
              ],
            },
          })
        })
      })

      describe('as not chatter of room', () => {
        beforeAll(async () => {
          authenticatedUser = await notChattingUser.toJson()
        })

        it('returns no rooms', async () => {
          await expect(query({ query: Room })).resolves.toMatchObject({
            errors: undefined,
            data: {
              Room: [],
            },
          })
        })
      })
    })
  })

  describe('unread rooms query', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(
          query({
            query: UnreadRooms,
          }),
        ).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      let otherRoomId: string

      beforeAll(async () => {
        authenticatedUser = await chattingUser.toJson()
        const result = await mutate({
          mutation: CreateRoom,
          variables: {
            userId: 'not-chatting-user',
          },
        })
        otherRoomId = (result.data as any).CreateRoom.roomId
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId: otherRoomId,
            content: 'Message to not chatting user',
          },
        })
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId,
            content: '1st message to other chatting user',
          },
        })
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId,
            content: '2nd message to other chatting user',
          },
        })
        authenticatedUser = await otherChattingUser.toJson()
        const result2 = await mutate({
          mutation: CreateRoom,
          variables: {
            userId: 'not-chatting-user',
          },
        })
        otherRoomId = (result2.data as any).CreateRoom.roomId
        await mutate({
          mutation: CreateMessage,
          variables: {
            roomId: otherRoomId,
            content: 'Other message to not chatting user',
          },
        })
      })

      describe('as chatting user', () => {
        it('has 0 unread rooms', async () => {
          authenticatedUser = await chattingUser.toJson()
          await expect(
            query({
              query: UnreadRooms,
            }),
          ).resolves.toMatchObject({
            data: {
              UnreadRooms: 0,
            },
          })
        })
      })

      describe('as other chatting user', () => {
        it('has 1 unread rooms', async () => {
          authenticatedUser = await otherChattingUser.toJson()
          await expect(
            query({
              query: UnreadRooms,
            }),
          ).resolves.toMatchObject({
            data: {
              UnreadRooms: 1,
            },
          })
        })

        it('when chattingUser is blocked has 0 unread rooms', async () => {
          authenticatedUser = await otherChattingUser.toJson()
          await otherChattingUser.relateTo(chattingUser, 'blocked')
          await expect(
            query({
              query: UnreadRooms,
            }),
          ).resolves.toMatchObject({
            data: {
              UnreadRooms: 0,
            },
          })
        })

        it('when chattingUser is muted has 0 unread rooms', async () => {
          authenticatedUser = await otherChattingUser.toJson()
          await otherChattingUser.relateTo(chattingUser, 'muted')
          await expect(
            query({
              query: UnreadRooms,
            }),
          ).resolves.toMatchObject({
            data: {
              UnreadRooms: 0,
            },
          })
        })
      })

      describe('as not chatting user', () => {
        it('has 2 unread rooms', async () => {
          authenticatedUser = await notChattingUser.toJson()
          await expect(
            query({
              query: UnreadRooms,
            }),
          ).resolves.toMatchObject({
            data: {
              UnreadRooms: 2,
            },
          })
        })
      })
    })
  })

  describe('query several rooms', () => {
    beforeAll(async () => {
      authenticatedUser = await chattingUser.toJson()
      await mutate({
        mutation: CreateRoom,
        variables: {
          userId: 'second-chatting-user',
        },
      })
      await mutate({
        mutation: CreateRoom,
        variables: {
          userId: 'third-chatting-user',
        },
      })
    })

    it('returns the rooms paginated', async () => {
      await expect(
        query({ query: Room, variables: { first: 3, offset: 0 } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          Room: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              roomId: expect.any(String),
              roomName: 'Third Chatting User',
              lastMessageAt: null,
              unreadCount: 0,
              lastMessage: null,
              users: expect.arrayContaining([
                expect.objectContaining({
                  _id: 'chatting-user',
                  id: 'chatting-user',
                  name: 'Chatting User',
                  avatar: {
                    url: expect.any(String),
                  },
                }),
                expect.objectContaining({
                  _id: 'third-chatting-user',
                  id: 'third-chatting-user',
                  name: 'Third Chatting User',
                  avatar: {
                    url: expect.any(String),
                  },
                }),
              ]),
            }),
            expect.objectContaining({
              id: expect.any(String),
              roomId: expect.any(String),
              roomName: 'Second Chatting User',
              lastMessageAt: null,
              unreadCount: 0,
              lastMessage: null,
              users: expect.arrayContaining([
                expect.objectContaining({
                  _id: 'chatting-user',
                  id: 'chatting-user',
                  name: 'Chatting User',
                  avatar: {
                    url: expect.any(String),
                  },
                }),
                expect.objectContaining({
                  _id: 'second-chatting-user',
                  id: 'second-chatting-user',
                  name: 'Second Chatting User',
                  avatar: {
                    url: expect.any(String),
                  },
                }),
              ]),
            }),
            expect.objectContaining({
              id: expect.any(String),
              roomId: expect.any(String),
              roomName: 'Other Chatting User',
              lastMessageAt: expect.any(String),
              unreadCount: 0,
              lastMessage: {
                _id: expect.any(String),
                id: expect.any(String),
                content: '2nd message to other chatting user',
                senderId: 'chatting-user',
                username: 'Chatting User',
                avatar: expect.any(String),
                date: expect.any(String),
                saved: true,
                distributed: false,
                seen: false,
              },
              users: expect.arrayContaining([
                expect.objectContaining({
                  _id: 'chatting-user',
                  id: 'chatting-user',
                  name: 'Chatting User',
                  avatar: {
                    url: expect.any(String),
                  },
                }),
                expect.objectContaining({
                  _id: 'other-chatting-user',
                  id: 'other-chatting-user',
                  name: 'Other Chatting User',
                  avatar: {
                    url: expect.any(String),
                  },
                }),
              ]),
            }),
          ]),
        },
      })
      await expect(
        query({ query: Room, variables: { first: 3, offset: 3 } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          Room: [
            expect.objectContaining({
              id: expect.any(String),
              roomId: expect.any(String),
              roomName: 'Not Chatting User',
              users: expect.arrayContaining([
                {
                  _id: 'chatting-user',
                  id: 'chatting-user',
                  name: 'Chatting User',
                  avatar: {
                    url: expect.any(String),
                  },
                },
                {
                  _id: 'not-chatting-user',
                  id: 'not-chatting-user',
                  name: 'Not Chatting User',
                  avatar: {
                    url: expect.any(String),
                  },
                },
              ]),
            }),
          ],
        },
      })
    })
  })

  describe('query single room', () => {
    let result: any = null

    beforeAll(async () => {
      authenticatedUser = await chattingUser.toJson()
      result = await query({ query: Room })
    })

    describe('as chatter of room', () => {
      it('returns the room', async () => {
        expect(
          await query({
            query: Room,
            variables: { first: 2, offset: 0, id: result.data.Room[0].id },
          }),
        ).toMatchObject({
          errors: undefined,
          data: {
            Room: [
              {
                id: expect.any(String),
                roomId: expect.any(String),
                roomName: result.data.Room[0].roomName,
                users: expect.any(Array),
              },
            ],
          },
        })
      })

      describe('as not chatter of room', () => {
        beforeAll(async () => {
          authenticatedUser = await notChattingUser.toJson()
        })

        it('returns no room', async () => {
          authenticatedUser = await notChattingUser.toJson()
          expect(
            await query({
              query: Room,
              variables: { first: 2, offset: 0, id: result.data.Room[0].id },
            }),
          ).toMatchObject({
            errors: undefined,
            data: {
              Room: [],
            },
          })
        })
      })
    })
  })
})
