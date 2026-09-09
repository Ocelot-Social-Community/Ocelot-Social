/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import queryLocations from '@graphql/queries/queryLocations.gql'
import UpdateUser from '@graphql/queries/users/UpdateUser.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import { createOrUpdateLocations } from './location'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { Session } from 'neo4j-driver'
import type { MockInstance } from 'vitest'

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

// Mapbox mock responses for queryLocations
const berlinMapboxEn = {
  features: [
    { id: 'place.berlin-de', place_name: 'Berlin, Germany', place_type: ['place'] },
    { id: 'place.berlin-md', place_name: 'Berlin, Maryland, United States', place_type: ['place'] },
    {
      id: 'place.berlin-ct',
      place_name: 'Berlin, Connecticut, United States',
      place_type: ['place'],
    },
    {
      id: 'place.berlin-nj',
      place_name: 'Berlin, New Jersey, United States',
      place_type: ['place'],
    },
    {
      id: 'place.berlin-oh',
      place_name: 'Berlin Heights, Ohio, United States',
      place_type: ['place'],
    },
  ],
}

const berlinMapboxDe = {
  features: [
    { id: 'place.berlin-de', place_name: 'Berlin, Deutschland', place_type: ['place'] },
    {
      id: 'place.berlin-md',
      place_name: 'Berlin, Maryland, Vereinigte Staaten',
      place_type: ['place'],
    },
    {
      id: 'place.berlin-nj',
      place_name: 'Berlin, New Jersey, Vereinigte Staaten',
      place_type: ['place'],
    },
    {
      id: 'place.berlin-oh',
      place_name: 'Berlin Heights, Ohio, Vereinigte Staaten',
      place_type: ['place'],
    },
    {
      id: 'place.berlin-ma',
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

let fetchSpy: MockInstance<typeof global.fetch>

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
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const path = decodeURIComponent(url)

    // Mapbox requests
    if (path.includes('api.mapbox.com')) {
      if (path.includes('Berlin')) {
        if (path.includes('language=de')) {
          return Promise.resolve(mockJsonResponse(berlinMapboxDe))
        }
        return Promise.resolve(mockJsonResponse(berlinMapboxEn))
      }
      if (path.includes('Welzheim')) {
        return Promise.resolve(mockJsonResponse(welzheimFeature))
      }
      return Promise.resolve(mockJsonResponse({ features: [] }))
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

  it('passes proximity to the Mapbox URL when provided', async () => {
    variables = { place: 'Berlin', lang: 'en', proximity: '10.0,53.55' }
    await query({ query: queryLocations, variables })
    const calledUrl = fetchSpy.mock.calls[0][0] as string

    expect(calledUrl).toContain(`proximity=${encodeURIComponent(variables.proximity as string)}`)
  })

  it('encodes place names with umlauts exactly once in the Mapbox URL', async () => {
    variables = { place: 'Köln', lang: 'en' }
    await query({ query: queryLocations, variables })
    const calledUrl = fetchSpy.mock.calls[0][0] as string

    expect(calledUrl).toContain(encodeURIComponent('Köln')) // 'K%C3%B6ln'
    expect(calledUrl).not.toContain(encodeURIComponent(encodeURIComponent('Köln'))) // not 'K%25C3%25B6ln'
  })

  it('query Location existing', async () => {
    variables = {
      place: 'Berlin',
      lang: 'en',
    }
    const result = await query({ query: queryLocations, variables })

    expect(result.data.queryLocations).toEqual(
      expect.arrayContaining([
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
          place_name: 'Berlin, Germany',
          lat: null,
          lng: null,
        },
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
          place_name: 'Berlin, Maryland, United States',
          lat: null,
          lng: null,
        },
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
          place_name: 'Berlin, Connecticut, United States',
          lat: null,
          lng: null,
        },
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
          place_name: 'Berlin, New Jersey, United States',
          lat: null,
          lng: null,
        },
        {
          id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
          place_name: 'Berlin Heights, Ohio, United States',
          lat: null,
          lng: null,
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
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
        place_name: 'Berlin, Deutschland',
        lat: null,
        lng: null,
      },
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
        place_name: 'Berlin, Maryland, Vereinigte Staaten',
        lat: null,
        lng: null,
      },
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
        place_name: 'Berlin, New Jersey, Vereinigte Staaten',
        lat: null,
        lng: null,
      },
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
        place_name: 'Berlin Heights, Ohio, Vereinigte Staaten',
        lat: null,
        lng: null,
      },
      {
        id: expect.stringMatching(/^place\.[0-9a-z-]+$/),
        place_name: 'Berlin, Massachusetts, Vereinigte Staaten',
        lat: null,
        lng: null,
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

  it('reverse-geocodes a "lng,lat" search string by trying types one at a time', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const path = decodeURIComponent(url)
      if (path.includes('9.993,53.551') && path.includes('types=address')) {
        return Promise.resolve(mockJsonResponse({ features: [] }))
      }
      if (path.includes('9.993,53.551') && path.includes('types=poi')) {
        return Promise.resolve(
          mockJsonResponse({
            features: [
              { id: 'poi.hagenbeck', place_name: 'Tierpark Hagenbeck', center: [9.993, 53.551] },
            ],
          }),
        )
      }
      return Promise.resolve(mockJsonResponse({ features: [] }))
    })

    variables = { place: '9.993,53.551', lang: 'en', types: 'address,poi,place' }
    const result = await query({ query: queryLocations, variables })

    expect(result.data.queryLocations).toEqual([
      { id: 'poi.hagenbeck', place_name: 'Tierpark Hagenbeck', lat: 53.551, lng: 9.993 },
    ])
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    const calledUrls = fetchSpy.mock.calls.map(([input]) => input as string)

    expect(calledUrls[0]).toContain('types=address')
    expect(calledUrls[0]).toContain('limit=1')
    expect(calledUrls[1]).toContain('types=poi')
  })

  it('prefers an address match over a country match, regardless of the requested type order', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const path = decodeURIComponent(url)
      // A coordinate matches essentially every "country" reverse-geocode
      // lookup — if country were tried first (as it is in the caller-given
      // order below, and in DEFAULT_LOCATION_TYPES), it would short-circuit
      // the loop before the more specific address is ever requested.
      if (path.includes('9.993,53.551') && path.includes('types=country')) {
        return Promise.resolve(
          mockJsonResponse({
            features: [{ id: 'country.de', place_name: 'Germany', center: [9.993, 53.551] }],
          }),
        )
      }
      if (path.includes('9.993,53.551') && path.includes('types=address')) {
        return Promise.resolve(
          mockJsonResponse({
            features: [
              {
                id: 'address.example',
                place_name: 'Musterstraße 1, Hamburg',
                center: [9.993, 53.551],
              },
            ],
          }),
        )
      }
      return Promise.resolve(mockJsonResponse({ features: [] }))
    })

    // Caller lists country before address — the fix must not just trust this
    // order, or it would reproduce the bug.
    variables = { place: '9.993,53.551', lang: 'en', types: 'country,address' }
    const result = await query({ query: queryLocations, variables })

    expect(result.data.queryLocations).toEqual([
      { id: 'address.example', place_name: 'Musterstraße 1, Hamburg', lat: 53.551, lng: 9.993 },
    ])

    const calledUrls = fetchSpy.mock.calls.map(([input]) => input as string)

    expect(calledUrls[0]).toContain('types=address')
  })

  it.each(['postcode', 'district', 'locality', 'neighborhood'])(
    'reverse-geocodes with an explicitly requested "%s" type instead of always returning []',
    async (type) => {
      fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const path = decodeURIComponent(url)
        if (path.includes('9.993,53.551') && path.includes(`types=${type}`)) {
          return Promise.resolve(
            mockJsonResponse({
              features: [
                { id: `${type}.example`, place_name: 'Somewhere', center: [9.993, 53.551] },
              ],
            }),
          )
        }
        return Promise.resolve(mockJsonResponse({ features: [] }))
      })

      variables = { place: '9.993,53.551', lang: 'en', types: type }
      const result = await query({ query: queryLocations, variables })

      // Before REVERSE_GEOCODE_TYPE_PRIORITY covered every ALLOWED_LOCATION_TYPES
      // entry, a type missing from that list got filtered out entirely here,
      // silently returning [] regardless of what Mapbox had.
      expect(result.data.queryLocations).toEqual([
        { id: `${type}.example`, place_name: 'Somewhere', lat: 53.551, lng: 9.993 },
      ])
    },
  )

  it('returns an empty array when reverse geocoding finds no match for any type', async () => {
    variables = { place: '0.0,0.0', lang: 'en', types: 'address,poi' }
    const result = await query({ query: queryLocations, variables })

    expect(result.data.queryLocations).toEqual([])
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  // Mapbox answers an error (a bad token, a rate limit) with a body that has no `features` key at
  // all, not with an empty list. Without the fallback the map would `.map` over undefined and the
  // whole location search would 500 instead of showing "no results".
  it('returns an empty array when Mapbox answers without a features array', async () => {
    fetchSpy.mockResolvedValue(mockJsonResponse({ message: 'Not Authorized - Invalid Token' }))
    variables = { place: 'Berlin', lang: 'en' }
    const result = await query({ query: queryLocations, variables })

    expect(result.data.queryLocations).toEqual([])
  })

  // A caller that requests no `types` at all still has to reverse-geocode in specific-to-broad
  // order. Taking DEFAULT_LOCATION_TYPES' own country-first order here would short-circuit on the
  // country that every coordinate on Earth trivially matches, and no pin would ever resolve to a
  // street address.
  it('reverse-geocodes with the default types, most specific first, when none are requested', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const path = decodeURIComponent(url)
      if (path.includes('types=place')) {
        return Promise.resolve(
          mockJsonResponse({
            features: [{ id: 'place.hamburg', place_name: 'Hamburg', center: [9.993, 53.551] }],
          }),
        )
      }
      return Promise.resolve(mockJsonResponse({ features: [] }))
    })

    variables = { place: '9.993,53.551', lang: 'en' }
    const result = await query({ query: queryLocations, variables })

    expect(result.data.queryLocations).toEqual([
      { id: 'place.hamburg', place_name: 'Hamburg', lat: 53.551, lng: 9.993 },
    ])

    // DEFAULT_LOCATION_TYPES is country,region,place,address — walked here as
    // address → place → region → country. `place` answers second, so region and country are never
    // asked; the country request that the raw default order would have sent FIRST never happens.
    const requestedTypes = fetchSpy.mock.calls.map(([input]) =>
      new URL(input as string).searchParams.get('types'),
    )

    expect(requestedTypes).toEqual(['address', 'place'])
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

// Called directly rather than through a mutation. Every one of these paths is a REJECTION of what
// Mapbox answered, and the mutations that reach this helper (UpdateUser, CreateGroup, CreatePost
// with an event location, Signup) would each have to be driven with its own full fixture set to
// arrive at the same four lines. The coordinate variant has no GraphQL entry point of its own at
// all: it is reached only from the event-location branch of CreatePost/UpdatePost.
describe(createOrUpdateLocations, () => {
  const locationContext = () => ({ config: { MAPBOX_TOKEN: 'test-token' } }) as unknown as Context

  const withSession = async (work: (session: Session) => Promise<unknown>): Promise<void> => {
    const session = database.driver.session()
    try {
      await work(session)
    } finally {
      await session.close()
    }
  }

  const respondWith = (body: unknown) => {
    fetchSpy.mockResolvedValue(mockJsonResponse(body))
  }

  // createLocation writes one property per supported locale and the driver REFUSES a query whose
  // parameters are undefined — so a fixture that omits a single `text_*` fails on the write rather
  // than on what the test is about. Filled uniformly here; none of these cases is about
  // translations.
  const feature = (attributes: Record<string, unknown>) => ({
    text_en: 'Fixture',
    text_de: 'Fixture',
    text_fr: 'Fixture',
    text_nl: 'Fixture',
    text_it: 'Fixture',
    text_es: 'Fixture',
    text_pt: 'Fixture',
    text_pl: 'Fixture',
    text_ru: 'Fixture',
    text_sq: 'Fixture',
    ...attributes,
  })

  // Reverse geocoding tries address, then poi, then place, and only gives up once all three come
  // back empty. Coordinates in the ocean or in unmapped terrain do exactly that — and a dropped
  // pin there must be refused, not stored as a nameless Location the UI cannot label.
  it('refuses coordinates that reverse-geocode to nothing at all', async () => {
    respondWith({ features: [] })

    await expect(
      withSession(async (session) =>
        createOrUpdateLocations('Post', 'event-post', 'somewhere', session, locationContext(), {
          lat: 0,
          lng: 0,
        }),
      ),
    ).rejects.toThrow('event location coordinates are invalid')

    // One request per type, none skipped: giving up after the first empty answer would refuse
    // every pin that sits on a POI or a place but not on an addressed building.
    //
    // The TYPES, not just the count — three calls is equally true of a loop that asked for
    // `address` three times. The order is load-bearing too: `place` matches almost any
    // coordinate on Earth, so asking it before `address` would resolve a pin dropped on a
    // building to the surrounding city and silently discard the precise result.
    const requestedTypes = fetchSpy.mock.calls.map(([input]) =>
      new URL(input as string).searchParams.get('types'),
    )

    expect(requestedTypes).toEqual(['address', 'poi', 'place'])
  })

  // The forward-geocoding counterpart: free text Mapbox knows nothing about. Accepting it would
  // attach the node to a Location with an undefined id.
  it('refuses a location name Mapbox does not resolve', async () => {
    respondWith({ features: [] })

    await expect(
      withSession(async (session) =>
        createOrUpdateLocations('User', 'located-user', 'Absurdistan', session, locationContext()),
      ),
    ).rejects.toThrow('locationName is invalid')
  })

  // A feature CAN come back without place_type (Mapbox returns those for some interpolated
  // address results). The code below indexes into place_type, so the guard is what stands between
  // that and a TypeError inside the write transaction.
  it('refuses a resolved feature that carries no place_type', async () => {
    respondWith({ features: [{ id: 'place.no-type', place_name: 'Typeless' }] })

    await expect(
      withSession(async (session) =>
        createOrUpdateLocations('User', 'located-user', 'Typeless', session, locationContext()),
      ),
    ).rejects.toThrow('locationName is invalid')
  })

  describe('given a user to attach the location to', () => {
    beforeEach(async () => {
      await Factory.build('user', { id: 'located-user' })
    })

    // Mapbox ranks by relevance, which is not the same as "the one the user picked". The client
    // sends back the exact `matching_place_name` string it displayed, and that string has to win
    // over the first result — otherwise picking "Berlin, New Jersey" from the dropdown silently
    // saves Berlin, Germany.
    it('prefers the feature whose matching_place_name is the requested one', async () => {
      respondWith({
        features: [
          feature({ id: 'place.berlin-de', place_name: 'Berlin, Germany', place_type: ['place'] }),
          feature({
            id: 'place.berlin-nj',
            place_name: 'Berlin, New Jersey',
            matching_place_name: 'Berlin, New Jersey, United States',
            place_type: ['place'],
          }),
        ],
      })

      await withSession(async (session) => {
        await createOrUpdateLocations(
          'User',
          'located-user',
          'Berlin, New Jersey, United States',
          session,
          locationContext(),
        )
      })

      const { records } = await database.query({
        query: 'MATCH (:User { id: "located-user" })-[:IS_IN]->(l:Location) RETURN l.id AS id',
      })

      expect(records.map((record) => record.get('id') as string)).toEqual(['place.berlin-nj'])
    })

    // Mapbox omits `context` for the broadest features (a country has nothing above it). The
    // hierarchy walk has to be skipped then rather than iterated over undefined.
    it('stores a feature that has no parent context as a standalone location', async () => {
      respondWith({
        features: [feature({ id: 'country.de', place_name: 'Germany', place_type: ['country'] })],
      })

      await withSession(async (session) => {
        await createOrUpdateLocations('User', 'located-user', 'Germany', session, locationContext())
      })

      const { records } = await database.query({
        query: `MATCH (:User { id: "located-user" })-[:IS_IN]->(l:Location)
                RETURN l.id AS id, size([(l)-[:IS_IN]->(:Location) | 1]) AS parents`,
      })

      expect(records.map((record) => record.get('id') as string)).toEqual(['country.de'])
      expect(records[0].get('parents').toNumber()).toBe(0)
    })
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
