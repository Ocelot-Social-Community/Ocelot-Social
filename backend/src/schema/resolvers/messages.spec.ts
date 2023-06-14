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
    })
  })
})
