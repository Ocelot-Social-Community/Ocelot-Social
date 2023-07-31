import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import { createRoomMutation, roomQuery, unreadRoomsQuery } from '../../graphql/rooms'
import { createMessageMutation } from '../../graphql/messages'
import createServer from '../../server'

const driver = getDriver()
const neode = getNeode()

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
      it('throws authorization error', async () => {
        await expect(
          mutate({
            mutation: createRoomMutation(),
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
              mutation: createRoomMutation(),
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
              mutation: createRoomMutation(),
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
            mutation: createRoomMutation(),
            variables: {
              userId: 'other-chatting-user',
            },
          })
          roomId = result.data.CreateRoom.id
          expect(result).toMatchObject({
            errors: undefined,
            data: {
              CreateRoom: {
                id: expect.any(String),
                roomId: result.data.CreateRoom.id,
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
              mutation: createRoomMutation(),
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
        await expect(query({ query: roomQuery() })).resolves.toMatchObject({
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
          const result = await query({ query: roomQuery() })
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
          const result = await query({ query: roomQuery() })
          expect(result).toMatchObject({
            errors: undefined,
            data: {
              Room: [
                {
                  id: expect.any(String),
                  roomId: result.data.Room[0].id,
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
          await expect(query({ query: roomQuery() })).resolves.toMatchObject({
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
            query: unreadRoomsQuery(),
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
          mutation: createRoomMutation(),
          variables: {
            userId: 'not-chatting-user',
          },
        })
        otherRoomId = result.data.CreateRoom.roomId
        await mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId: otherRoomId,
            content: 'Message to not chatting user',
          },
        })
        await mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId,
            content: '1st message to other chatting user',
          },
        })
        await mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId,
            content: '2nd message to other chatting user',
          },
        })
        authenticatedUser = await otherChattingUser.toJson()
        const result2 = await mutate({
          mutation: createRoomMutation(),
          variables: {
            userId: 'not-chatting-user',
          },
        })
        otherRoomId = result2.data.CreateRoom.roomId
        await mutate({
          mutation: createMessageMutation(),
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
              query: unreadRoomsQuery(),
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
              query: unreadRoomsQuery(),
            }),
          ).resolves.toMatchObject({
            data: {
              UnreadRooms: 1,
            },
          })
        })
      })

      describe('as not chatting user', () => {
        it('has 2 unread rooms', async () => {
          authenticatedUser = await notChattingUser.toJson()
          await expect(
            query({
              query: unreadRoomsQuery(),
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
        mutation: createRoomMutation(),
        variables: {
          userId: 'second-chatting-user',
        },
      })
      await mutate({
        mutation: createRoomMutation(),
        variables: {
          userId: 'third-chatting-user',
        },
      })
    })

    it('returns the rooms paginated', async () => {
      await expect(
        query({ query: roomQuery(), variables: { first: 3, offset: 0 } }),
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
        query({ query: roomQuery(), variables: { first: 3, offset: 3 } }),
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
      result = await query({ query: roomQuery() })
    })

    describe('as chatter of room', () => {
      it('returns the room', async () => {
        expect(
          await query({
            query: roomQuery(),
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
              query: roomQuery(),
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
