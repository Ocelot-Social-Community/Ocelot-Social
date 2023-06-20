import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import { createRoomMutation, roomQuery } from '../../graphql/rooms'
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
  // await cleanDatabase()
  driver.close()
})

describe('Room', () => {
  beforeAll(async () => {
    [chattingUser, otherChattingUser, notChattingUser] = await Promise.all([
      Factory.build(
        'user',
        {
          id: 'chatting-user',
          name: 'Chatting User',
        },
      ),
      Factory.build(
        'user',
        {
          id: 'other-chatting-user',
          name: 'Other Chatting User',
        },
      ),
      Factory.build(
        'user',
        {
          id: 'not-chatting-user',
          name: 'Not Chatting User',
        },
      ),
    ])
  })

  describe('create room', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        await expect(mutate({ mutation: createRoomMutation(), variables: {
          userId: 'some-id' } })).resolves.toMatchObject({
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
          await expect(mutate({
            mutation: createRoomMutation(),
            variables: {
              userId: 'not-existing-user',
            },
          })).resolves.toMatchObject({
            errors: undefined,
            data: {
              CreateRoom: null,
            },
          })
        })
      })
      
      describe('user id exists', () => {
        it('returns the id of the room', async () => {
          await expect(mutate({
            mutation: createRoomMutation(),
            variables: {
              userId: 'other-chatting-user',
            },
          })).resolves.toMatchObject({
            errors: undefined,
            data: {
              CreateRoom: {
                id: expect.any(String),
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
      describe('as creater of room', () => {
        beforeAll(async () => {
          authenticatedUser = await chattingUser.toJson()
        })

        it('returns the room', async () => {
          await expect(query({ query: roomQuery() })).resolves.toMatchObject({
            errors: undefined,
            data: {
              Room: [
                {
                  id: expect.any(String),
                  users: expect.arrayContaining([
                    {
                      id: 'chatting-user',
                    },
                    {
                      id: 'other-chatting-user',
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
          await expect(query({ query: roomQuery() })).resolves.toMatchObject({
            errors: undefined,
            data: {
              Room: [
                {
                  id: expect.any(String),
                  users: expect.arrayContaining([
                    {
                      id: 'chatting-user',
                    },
                    {
                      id: 'other-chatting-user',
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
})
