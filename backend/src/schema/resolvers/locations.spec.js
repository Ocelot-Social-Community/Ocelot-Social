import Factory, { cleanDatabase } from '../../db/factories'
import gql from 'graphql-tag'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'

let mutate, authenticatedUser

const driver = getDriver()
const neode = getNeode()

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
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('resolvers', () => {
  describe('Location', () => {
    describe('custom mutation, not handled by neo4j-graphql-js', () => {
      let variables
      const updateUserMutation = gql`
        mutation ($id: ID!, $name: String) {
          UpdateUser(id: $id, name: $name) {
            name
            location {
              name: nameRU
              nameEN
            }
          }
        }
      `

      beforeEach(async () => {
        variables = {
          id: 'u47',
          name: 'John Doughnut',
        }
        const Paris = await Factory.build('location', {
          id: 'region.9397217726497330',
          name: 'Paris',
          type: 'region',
          lng: 2.35183,
          lat: 48.85658,
          nameEN: 'Paris',
        })

        const user = await Factory.build('user', {
          id: 'u47',
          name: 'John Doe',
        })
        await user.relateTo(Paris, 'isIn')
        authenticatedUser = await user.toJson()
      })

      it('returns `null` if location translation is not available', async () => {
        await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject({
          data: {
            UpdateUser: {
              name: 'John Doughnut',
              location: {
                name: null,
                nameEN: 'Paris',
              },
            },
          },
          errors: undefined,
        })
      })
    })
  })
})
