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
})
