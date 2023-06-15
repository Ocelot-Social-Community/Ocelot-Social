import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import { createRoomMutation } from '../../graphql/rooms'
import { createMessageMutation, messageQuery } from '../../graphql/messages'
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


describe('Message', () => {
  let roomId: string

  beforeAll(async () => {
    ;[chattingUser, otherChattingUser, notChattingUser] = await Promise.all([
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

  describe('create message', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        await expect(mutate({ mutation: createMessageMutation(), variables: {
          roomId: 'some-id', content: 'Some bla bla bla', } })).resolves.toMatchObject({
            errors: [{ message: 'Not Authorized!' }],
          })
      })
    })

    describe('authenticated', () => {
      beforeAll(async () => {
        authenticatedUser = await chattingUser.toJson()
      })

      describe('room does not exist', () => {
        it('returns null', async () => {
          await expect(mutate({ mutation: createMessageMutation(), variables: {
            roomId: 'some-id', content: 'Some bla bla bla', } })).resolves.toMatchObject({
              errors: undefined,
              data: {
                CreateMessage: null,
              },
            })
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
          it('returns the message', async () => {
            await expect(mutate({
              mutation: createMessageMutation(),
              variables: {
                roomId,
                content: 'Some nice message to other chatting user',
              } })).resolves.toMatchObject({
                errors: undefined,
                data: {
                  CreateMessage: {
                    id: expect.any(String),
                    content: 'Some nice message to other chatting user',
                  },
                },
              })
          })
        })

        describe('user does not chat in room', () => {
          beforeAll(async () => {
            authenticatedUser = await notChattingUser.toJson()
          })
          
          it('returns null', async () => {
            await expect(mutate({
              mutation: createMessageMutation(),
              variables: {
                roomId,
                content: 'I have no access to this room!',
              } })).resolves.toMatchObject({
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
        await expect(query({
          query: messageQuery(),
          variables: {
            roomId: 'some-id' }
        })).resolves.toMatchObject({
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
          await expect(query({
            query: messageQuery(),
            variables: {
              roomId: 'some-id'
            },
          })).resolves.toMatchObject({
            errors: undefined,
            data: {
              Message: [],
            },
          })
        })
      })

      describe('room exists with authenticated user chatting', () => {
        it('returns the messages', async () => {
          await expect(query({
            query: messageQuery(),
            variables: {
              roomId,
            },
          })).resolves.toMatchObject({
            errors: undefined,
            data: {
              Message: [{
                id: expect.any(String),
                content: 'Some nice message to other chatting user',
                author: {
                  id: 'chatting-user',
                },
              }],
            },
          })
        })
      })

      describe('room exists, authenticated user not in room', () => {
        beforeAll(async () => {
          authenticatedUser = await notChattingUser.toJson()
        })

        it('returns null', async () => {
          await expect(query({
            query: messageQuery(),
            variables: {
              roomId,
            },
          })).resolves.toMatchObject({
            errors: undefined,
            data: {
              Message: [],
            },
          })
        })
      }) 
    })
  })
})
