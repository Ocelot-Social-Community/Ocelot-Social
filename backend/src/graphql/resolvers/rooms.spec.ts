/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Factory, { cleanDatabase } from '@db/factories'
import CreateGroupRoom from '@graphql/queries/messaging/CreateGroupRoom.gql'
import CreateMessage from '@graphql/queries/messaging/CreateMessage.gql'
import Room from '@graphql/queries/messaging/Room.gql'
import UnreadRooms from '@graphql/queries/messaging/UnreadRooms.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
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
  const apolloSetup = await createApolloTestSetup({ context })
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

  describe('create room via CreateMessage with userId', () => {
    describe('unauthenticated', () => {
      beforeAll(() => {
        authenticatedUser = null
      })

      it('throws authorization error', async () => {
        await expect(
          mutate({
            mutation: CreateMessage,
            variables: {
              userId: 'some-id',
              content: 'init',
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
              mutation: CreateMessage,
              variables: {
                userId: 'not-existing-user',
                content: 'init',
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

      describe('user id is self', () => {
        it('throws error', async () => {
          await expect(
            mutate({
              mutation: CreateMessage,
              variables: {
                userId: 'chatting-user',
                content: 'init',
              },
            }),
          ).resolves.toMatchObject({
            errors: [{ message: 'Cannot create a room with self' }],
          })
        })
      })

      describe('user id exists', () => {
        it('creates a room and returns the message with room id', async () => {
          const result = await mutate({
            mutation: CreateMessage,
            variables: {
              userId: 'other-chatting-user',
              content: 'init',
            },
          })
          roomId = result.data.CreateMessage.room.id
          expect(result).toMatchObject({
            errors: undefined,
            data: {
              CreateMessage: {
                id: expect.any(String),
                content: 'init',
                room: {
                  id: expect.any(String),
                },
              },
            },
          })
        })
      })

      describe('send message to same user id again', () => {
        it('returns the same room id', async () => {
          const result = await mutate({
            mutation: CreateMessage,
            variables: {
              userId: 'other-chatting-user',
              content: 'another message',
            },
          })
          expect(result).toMatchObject({
            errors: undefined,
            data: {
              CreateMessage: {
                room: {
                  id: roomId,
                },
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
                  roomId: result.data.Room[0].id,
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
                  roomId: result.data.Room[0].id,
                  roomName: 'Chatting User',
                  unreadCount: 2,
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
      beforeAll(async () => {
        authenticatedUser = await chattingUser.toJson()
        await mutate({
          mutation: CreateMessage,
          variables: {
            userId: 'not-chatting-user',
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
        await mutate({
          mutation: CreateMessage,
          variables: {
            userId: 'not-chatting-user',
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
        mutation: CreateMessage,
        variables: {
          userId: 'second-chatting-user',
          content: 'init',
        },
      })
      await mutate({
        mutation: CreateMessage,
        variables: {
          userId: 'third-chatting-user',
          content: 'init',
        },
      })
    })

    it('returns the rooms paginated', async () => {
      await expect(query({ query: Room, variables: { first: 3 } })).resolves.toMatchObject({
        errors: undefined,
        data: {
          Room: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              roomId: expect.any(String),
              roomName: 'Third Chatting User',
              lastMessageAt: expect.any(String),
              unreadCount: 0,
              lastMessage: expect.objectContaining({
                content: 'init',
                senderId: 'chatting-user',
              }),
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
              lastMessageAt: expect.any(String),
              unreadCount: 0,
              lastMessage: expect.objectContaining({
                content: 'init',
                senderId: 'chatting-user',
              }),
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
      // Note: offset-based pagination removed in favor of cursor-based (before parameter)
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

  describe('query room by userId', () => {
    beforeAll(async () => {
      authenticatedUser = await chattingUser.toJson()
    })

    it('returns the DM room with the specified user', async () => {
      const result = await query({
        query: Room,
        variables: { userId: 'other-chatting-user' },
      })
      expect(result).toMatchObject({
        errors: undefined,
        data: {
          Room: [
            expect.objectContaining({
              roomName: 'Other Chatting User',
              users: expect.arrayContaining([
                expect.objectContaining({ id: 'chatting-user' }),
                expect.objectContaining({ id: 'other-chatting-user' }),
              ]),
            }),
          ],
        },
      })
    })

    it('returns empty when no DM room exists', async () => {
      const result = await query({
        query: Room,
        variables: { userId: 'non-existent-user' },
      })
      expect(result).toMatchObject({
        errors: undefined,
        data: {
          Room: [],
        },
      })
    })
  })

  describe('query room by groupId', () => {
    let groupRoomId: string

    beforeAll(async () => {
      await Factory.build('group', {
        id: 'test-group',
        name: 'Test Group',
      }, { owner: chattingUser })
      // Add other user as member
      const session = database.driver.session()
      try {
        await session.writeTransaction((txc) =>
          txc.run(
            `MATCH (u:User {id: 'other-chatting-user'}), (g:Group {id: 'test-group'})
             MERGE (u)-[m:MEMBER_OF]->(g) SET m.role = 'usual', m.createdAt = toString(datetime())`,
          ),
        )
      } finally {
        await session.close()
      }
      authenticatedUser = await chattingUser.toJson()
    })

    describe('CreateGroupRoom', () => {
      it('creates a group room', async () => {
        const result = await mutate({
          mutation: CreateGroupRoom,
          variables: { groupId: 'test-group' },
        })
        expect(result).toMatchObject({
          errors: undefined,
          data: {
            CreateGroupRoom: expect.objectContaining({
              roomName: 'Test Group',
              isGroupRoom: true,
              users: expect.arrayContaining([
                expect.objectContaining({ id: 'chatting-user' }),
                expect.objectContaining({ id: 'other-chatting-user' }),
              ]),
            }),
          },
        })
        groupRoomId = result.data.CreateGroupRoom.id
      })

      it('returns existing room on second call', async () => {
        const result = await mutate({
          mutation: CreateGroupRoom,
          variables: { groupId: 'test-group' },
        })
        expect(result.data.CreateGroupRoom.id).toBe(groupRoomId)
      })

      it('fails for non-member', async () => {
        authenticatedUser = await notChattingUser.toJson()
        const result = await mutate({
          mutation: CreateGroupRoom,
          variables: { groupId: 'test-group' },
        })
        expect(result.errors).toBeDefined()
        authenticatedUser = await chattingUser.toJson()
      })
    })

    describe('query by groupId', () => {
      it('returns the group room', async () => {
        const result = await query({
          query: Room,
          variables: { groupId: 'test-group' },
        })
        expect(result).toMatchObject({
          errors: undefined,
          data: {
            Room: [
              expect.objectContaining({
                id: groupRoomId,
                roomName: 'Test Group',
              }),
            ],
          },
        })
      })

      it('returns empty for non-existent group', async () => {
        const result = await query({
          query: Room,
          variables: { groupId: 'non-existent' },
        })
        expect(result).toMatchObject({
          errors: undefined,
          data: {
            Room: [],
          },
        })
      })
    })
  })
})

describe('roomCountUpdatedFilter', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { roomCountUpdatedFilter } = require('./rooms')

  it('returns true when payload userId matches context user', () => {
    expect(roomCountUpdatedFilter({ userId: 'u1' }, {}, { user: { id: 'u1' } })).toBe(true)
  })

  it('returns false when userId does not match', () => {
    expect(roomCountUpdatedFilter({ userId: 'u1' }, {}, { user: { id: 'u2' } })).toBe(false)
  })

  it('returns false when context user is null', () => {
    expect(roomCountUpdatedFilter({ userId: 'u1' }, {}, { user: null })).toBe(false)
  })
})
