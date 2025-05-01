/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import createServer from '@src/server'

let query, mutate, authenticatedUser

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
  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
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

const distanceToMeQuery = gql`
  query ($id: ID!) {
    User(id: $id) {
      location {
        distanceToMe
      }
    }
  }
`
let user, myPlaceUser, otherPlaceUser, noCordsPlaceUser, noPlaceUser

describe('distanceToMe', () => {
  beforeEach(async () => {
    const Hamburg = await Factory.build('location', {
      id: 'region.5127278006398860',
      name: 'Hamburg',
      type: 'region',
      lng: 10.0,
      lat: 53.55,
      nameES: 'Hamburgo',
      nameFR: 'Hambourg',
      nameIT: 'Amburgo',
      nameEN: 'Hamburg',
      namePT: 'Hamburgo',
      nameDE: 'Hamburg',
      nameNL: 'Hamburg',
      namePL: 'Hamburg',
      nameRU: 'Гамбург',
    })
    const Germany = await Factory.build('location', {
      id: 'country.10743216036480410',
      name: 'Germany',
      type: 'country',
      namePT: 'Alemanha',
      nameDE: 'Deutschland',
      nameES: 'Alemania',
      nameNL: 'Duitsland',
      namePL: 'Niemcy',
      nameFR: 'Allemagne',
      nameIT: 'Germania',
      nameEN: 'Germany',
      nameRU: 'Германия',
    })
    const Paris = await Factory.build('location', {
      id: 'region.9397217726497330',
      name: 'Paris',
      type: 'region',
      lng: 2.35183,
      lat: 48.85658,
      nameES: 'París',
      nameFR: 'Paris',
      nameIT: 'Parigi',
      nameEN: 'Paris',
      namePT: 'Paris',
      nameDE: 'Paris',
      nameNL: 'Parijs',
      namePL: 'Paryż',
      nameRU: 'Париж',
    })

    user = await Factory.build('user', {
      id: 'user',
      role: 'user',
    })
    await user.relateTo(Hamburg, 'isIn')

    myPlaceUser = await Factory.build('user', {
      id: 'myPlaceUser',
      role: 'user',
    })
    await myPlaceUser.relateTo(Hamburg, 'isIn')

    otherPlaceUser = await Factory.build('user', {
      id: 'otherPlaceUser',
      role: 'user',
    })
    await otherPlaceUser.relateTo(Paris, 'isIn')

    noCordsPlaceUser = await Factory.build('user', {
      id: 'noCordsPlaceUser',
      role: 'user',
    })
    await noCordsPlaceUser.relateTo(Germany, 'isIn')

    noPlaceUser = await Factory.build('user', {
      id: 'noPlaceUser',
      role: 'user',
    })
  })

  describe('query the field', () => {
    describe('for self user', () => {
      it('returns 0', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await user.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  location: {
                    distanceToMe: 0,
                  },
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })

    describe('for myPlaceUser', () => {
      it('returns 0', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await myPlaceUser.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  location: {
                    distanceToMe: 0,
                  },
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })

    describe('for otherPlaceUser', () => {
      it('returns a number', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await otherPlaceUser.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  location: {
                    distanceToMe: 746,
                  },
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })

    describe('for noCordsPlaceUser', () => {
      it('returns null', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await noCordsPlaceUser.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  location: {
                    distanceToMe: null,
                  },
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })

    describe('for noPlaceUser', () => {
      it('returns null location', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await noPlaceUser.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  location: null,
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })
  })
})
