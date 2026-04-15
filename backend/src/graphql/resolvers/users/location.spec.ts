/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import Factory, { cleanDatabase } from '@db/factories'
import queryLocations from '@graphql/queries/queryLocations.gql'
import UpdateUser from '@graphql/queries/users/UpdateUser.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let variables
let authenticatedUser: Context['user']
const context = () => ({
  authenticatedUser,
})
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const mockJsonResponse = (body: unknown) =>
  ({
    json: async () => Promise.resolve(body),
  }) as unknown as Response

const berlinFeaturesEn = {
  features: [
    { id: 'place.115770', place_name: 'Berlin, Germany', place_type: ['place'] },
    {
      id: 'place.25995500',
      place_name: 'Berlin, Maryland, United States',
      place_type: ['place'],
    },
    {
      id: 'place.26036460',
      place_name: 'Berlin, Connecticut, United States',
      place_type: ['place'],
    },
    {
      id: 'place.500697324',
      place_name: 'Berlin, New Jersey, United States',
      place_type: ['place'],
    },
    {
      id: 'place.25952876',
      place_name: 'Berlin Heights, Ohio, United States',
      place_type: ['place'],
    },
  ],
}

const berlinFeaturesDe = {
  features: [
    { id: 'place.115770', place_name: 'Berlin, Deutschland', place_type: ['place'] },
    {
      id: 'place.25995500',
      place_name: 'Berlin, Maryland, Vereinigte Staaten',
      place_type: ['place'],
    },
    {
      id: 'place.500697324',
      place_name: 'Berlin, New Jersey, Vereinigte Staaten',
      place_type: ['place'],
    },
    {
      id: 'place.25952876',
      place_name: 'Berlin Heights, Ohio, Vereinigte Staaten',
      place_type: ['place'],
    },
    {
      id: 'place.25983916',
      place_name: 'Berlin, Massachusetts, Vereinigte Staaten',
      place_type: ['place'],
    },
  ],
}

const welzheimFeature = {
  features: [
    {
      id: 'place.welzheim',
      place_type: ['place'],
      place_name: 'Welzheim, Baden-Württemberg, Germany',
      text_en: 'Welzheim',
      text_de: 'Welzheim',
      text_fr: 'Welzheim',
      text_nl: 'Welzheim',
      text_it: 'Welzheim',
      text_es: 'Welzheim',
      text_pt: 'Welzheim',
      text_pl: 'Welzheim',
      text_ru: 'Вельцхайм',
      text_sq: 'Welzheim',
      center: [9.634301, 48.874393],
      context: [
        {
          id: 'district.rems-murr',
          text_en: 'Rems-Murr-Kreis',
          text_de: 'Rems-Murr-Kreis',
          text_fr: 'Rems-Murr-Kreis',
          text_nl: 'Rems-Murr-Kreis',
          text_it: 'Rems-Murr-Kreis',
          text_es: 'Rems-Murr-Kreis',
          text_pt: 'Rems-Murr-Kreis',
          text_pl: 'Rems-Murr-Kreis',
          text_ru: 'Ремс-Мурр',
          text_sq: 'Rems-Murr-Kreis',
        },
        {
          id: 'region.bw',
          text_en: 'Baden-Württemberg',
          text_de: 'Baden-Württemberg',
          text_fr: 'Bade-Wurtemberg',
          text_nl: 'Baden-Württemberg',
          text_it: 'Baden-Württemberg',
          text_es: 'Baden-Wurtemberg',
          text_pt: 'Baden-Württemberg',
          text_pl: 'Badenia-Wirtembergia',
          text_ru: 'Баден-Вюртемберг',
          text_sq: 'Baden-Vyrtemberg',
        },
        {
          id: 'country.de',
          text_en: 'Germany',
          text_de: 'Deutschland',
          text_fr: 'Allemagne',
          text_nl: 'Duitsland',
          text_it: 'Germania',
          text_es: 'Alemania',
          text_pt: 'Alemanha',
          text_pl: 'Niemcy',
          text_ru: 'Германия',
          text_sq: 'Gjermania',
        },
      ],
    },
  ],
}

let fetchSpy: jest.SpyInstance

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({
    context,
  })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(() => {
  variables = {}
  authenticatedUser = null
  fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const path = decodeURIComponent(url)
    if (path.includes('/Berlin.json')) {
      if (path.includes('language=de')) return Promise.resolve(mockJsonResponse(berlinFeaturesDe))
      return Promise.resolve(mockJsonResponse(berlinFeaturesEn))
    }
    if (path.includes('Welzheim')) {
      return Promise.resolve(mockJsonResponse(welzheimFeature))
    }
    // Unknown place — mimic Mapbox "no results"
    return Promise.resolve(mockJsonResponse({ features: [] }))
  })
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  fetchSpy.mockRestore()
  await cleanDatabase()
})

describe('Location Service', () => {
  // Authentication
  // TODO: unify, externalize, simplify, wtf?
  beforeEach(async () => {
    const user = await Factory.build('user', {
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
        { id: expect.stringMatching(/^place\.[0-9a-z-]+$/), place_name: 'Berlin, Germany' },
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
          place_name: 'Berlin, Maryland, United States',
        },
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
          place_name: 'Berlin, Connecticut, United States',
        },
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
          place_name: 'Berlin, New Jersey, United States',
        },
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
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
      { id: expect.stringMatching(/^place\.[0-9a-z-]+$/), place_name: 'Berlin, Deutschland' },
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
        place_name: 'Berlin, Maryland, Vereinigte Staaten',
      },
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
        place_name: 'Berlin, New Jersey, Vereinigte Staaten',
      },
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
        place_name: 'Berlin Heights, Ohio, Vereinigte Staaten',
      },
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
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
    beforeEach(async () => {
      const user = await Factory.build('user', {
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
      await mutate({ mutation: UpdateUser, variables })
      const locations = await database.neode.cypher(
        `MATCH (city:Location)-[:IS_IN]->(district:Location)-[:IS_IN]->(state:Location)-[:IS_IN]->(country:Location) return city {.*}, state {.*}, country {.*}`,
        {},
      )
      expect(
        locations.records.map((record) => {
          return {
            city: record.get('city'),
            state: record.get('state'),
            country: record.get('country'),
          }
        }),
      ).toEqual([
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
            nameSQ: 'Welzheim',
            lng: 9.634301,
            lat: 48.874393,
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
            nameSQ: 'Baden-Vyrtemberg',
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
            nameSQ: 'Gjermania',
          },
        },
      ])
    })
  })
})
