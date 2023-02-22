import { gql } from '../../../helpers/jest'
import Factory, { cleanDatabase } from '../../../db/factories'
import { getNeode, getDriver } from '../../../db/neo4j'
import { createTestClient } from 'apollo-server-testing'
import createServer from '../../../server'

const neode = getNeode()
const driver = getDriver()
let authenticatedUser, mutate, query, variables

const updateUserMutation = gql`
  mutation ($id: ID!, $name: String!, $locationName: String) {
    UpdateUser(id: $id, name: $name, locationName: $locationName) {
      locationName
    }
  }
`
const queryLocations = gql`
  query ($place: String!, $lang: String!) {
    queryLocations(place: $place, lang: $lang) {
      place_name
      id
    }
  }
`
const newlyCreatedNodesWithLocales = [
  {
    city: {
      id: expect.stringContaining('place'),
      type: 'place',
      name: 'Welzheim',
      nameEN: 'Welzheim',
      nameDE: 'Welzheim',
      namePT: 'Welzheim',
      nameES: 'Welzheim',
      nameFR: 'Welzheim',
      nameIT: 'Welzheim',
      nameRU: 'Вельцхайм',
      nameNL: 'Welzheim',
      namePL: 'Welzheim',
      lng: 9.634741,
      lat: 48.874924,
    },
    state: {
      id: expect.stringContaining('region'),
      type: 'region',
      name: 'Baden-Württemberg',
      nameDE: 'Baden-Württemberg',
      nameEN: 'Baden-Württemberg',
      nameES: 'Baden-Wurtemberg',
      nameFR: 'Bade-Wurtemberg',
      nameIT: 'Baden-Württemberg',
      nameNL: 'Baden-Württemberg',
      namePL: 'Badenia-Wirtembergia',
      namePT: 'Baden-Württemberg',
      nameRU: 'Баден-Вюртемберг',
    },
    country: {
      id: expect.stringContaining('country'),
      type: 'country',
      name: 'Germany',
      nameDE: 'Deutschland',
      nameEN: 'Germany',
      nameES: 'Alemania',
      nameFR: 'Allemagne',
      nameIT: 'Germania',
      nameNL: 'Duitsland',
      namePL: 'Niemcy',
      namePT: 'Alemanha',
      nameRU: 'Германия',
    },
  },
]

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        user: authenticatedUser,
        neode,
        driver,
      }
    },
  })
  mutate = createTestClient(server).mutate
  query = createTestClient(server).query
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

beforeEach(() => {
  variables = {}
  authenticatedUser = null
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('Location Service', () => {
  // Authentication
  // TODO: unify, externalize, simplify, wtf?
  let user
  beforeEach(async () => {
    user = await Factory.build('user', {
      id: 'location-user',
    })
    authenticatedUser = await user.toJson()
  })

  it('query Location existing', async () => {
    variables = {
      place: 'Berlin',
      lang: 'en',
    }
    const result = await query({ query: queryLocations, variables })
    expect(result.data.queryLocations).toEqual(
      expect.arrayContaining([
        { id: expect.stringMatching(/^place\.[0-9]+$/), place_name: 'Berlin, Germany' },
        {
          id: expect.stringMatching(/^place\.[0-9]+$/),
          place_name: 'Berlin, Maryland, United States',
        },
        {
          id: expect.stringMatching(/^place\.[0-9]+$/),
          place_name: 'Berlin, Connecticut, United States',
        },
        {
          id: expect.stringMatching(/^place\.[0-9]+$/),
          place_name: 'Berlin, New Jersey, United States',
        },
        {
          id: expect.stringMatching(/^place\.[0-9]+$/),
          place_name: 'Berlin Heights, Ohio, United States',
        },
      ]),
    )
  })

  it('query Location existing in different language', async () => {
    variables = {
      place: 'Berlin',
      lang: 'de',
    }
    const result = await query({ query: queryLocations, variables })
    expect(result.data.queryLocations).toEqual([
      { id: expect.stringMatching(/^place\.[0-9]+$/), place_name: 'Berlin, Deutschland' },
      {
        id: expect.stringMatching(/^place\.[0-9]+$/),
        place_name: 'Berlin, Maryland, Vereinigte Staaten',
      },
      {
        id: expect.stringMatching(/^place\.[0-9]+$/),
        place_name: 'Berlin, New Jersey, Vereinigte Staaten',
      },
      {
        id: expect.stringMatching(/^place\.[0-9]+$/),
        place_name: 'Berlin Heights, Ohio, Vereinigte Staaten',
      },
      {
        id: expect.stringMatching(/^place\.[0-9]+$/),
        place_name: 'Berlin, Massachusetts, Vereinigte Staaten',
      },
    ])
  })

  it('query Location not existing', async () => {
    variables = {
      place: 'GbHtsd4sdHa',
      lang: 'en',
    }
    const result = await query({ query: queryLocations, variables })
    expect(result.data.queryLocations).toEqual([])
  })

  it('query Location without a place name given', async () => {
    variables = {
      place: '',
      lang: 'en',
    }
    const result = await query({ query: queryLocations, variables })
    expect(result.data.queryLocations).toEqual([])
  })
})

describe('userMiddleware', () => {
  describe('UpdateUser', () => {
    let user
    beforeEach(async () => {
      user = await Factory.build('user', {
        id: 'updating-user',
      })
      authenticatedUser = await user.toJson()
    })

    it('creates a Location node with localized city/state/country names', async () => {
      variables = {
        ...variables,
        id: 'updating-user',
        name: 'Updating user',
        locationName: 'Welzheim, Baden-Württemberg, Germany',
      }
      await mutate({ mutation: updateUserMutation, variables })
      const locations = await neode.cypher(
        `MATCH (city:Location)-[:IS_IN]->(state:Location)-[:IS_IN]->(country:Location) return city {.*}, state {.*}, country {.*}`,
      )
      expect(
        locations.records.map((record) => {
          return {
            city: record.get('city'),
            state: record.get('state'),
            country: record.get('country'),
          }
        }),
      ).toEqual(newlyCreatedNodesWithLocales)
    })
  })
})
