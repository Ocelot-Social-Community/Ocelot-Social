/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import queryLocations from '@graphql/queries/queryLocations.gql'
import UpdateUser from '@graphql/queries/users/UpdateUser.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import {
  attachLocationFeature,
  createOrUpdateLocations,
  extractLocationFeature,
  resolveLocationId,
} from './location'

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
    ).rejects.toThrow('Location coordinates are invalid.')

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

  // groups.ts passes its own coarser list (place/region/country — a group's location is
  // deliberately less precise than an event's exact pin) instead of relying on the
  // address/poi/place default asserted above.
  it('uses the caller-provided reverseGeocodeTypes instead of the default when given', async () => {
    respondWith({ features: [] })

    await expect(
      withSession(async (session) =>
        createOrUpdateLocations(
          'Group',
          'some-group',
          'somewhere',
          session,
          locationContext(),
          { lat: 0, lng: 0 },
          ['place', 'region', 'country'],
        ),
      ),
    ).rejects.toThrow('Location coordinates are invalid.')

    const requestedTypes = fetchSpy.mock.calls.map(([input]) =>
      new URL(input as string).searchParams.get('types'),
    )

    expect(requestedTypes).toEqual(['place', 'region', 'country'])
  })

  // The forward-geocoding counterpart: free text Mapbox knows nothing about. Accepting it would
  // attach the node to a Location with an undefined id.
  it('refuses a location name Mapbox does not resolve', async () => {
    respondWith({ features: [] })

    await expect(
      withSession(async (session) =>
        createOrUpdateLocations('User', 'located-user', 'Absurdistan', session, locationContext()),
      ),
    ).rejects.toThrow('The locationName is invalid.')
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
    ).rejects.toThrow('The locationName is invalid.')
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

    // matchLocationNameExactly means locationName is the user's own picked choice (see its doc
    // comment on createOrUpdateLocations) — without a matching_place_name among the results,
    // silently saving Mapbox's top-ranked guess instead would be a different place than the one
    // they picked. Standard mode (tested above via the "prefers..." case, and implicitly by every
    // other test here that doesn't pass the flag) keeps falling back to the first result instead.
    it('rejects locationName when matchLocationNameExactly is set and nothing matches it exactly', async () => {
      respondWith({
        features: [
          feature({ id: 'place.berlin-de', place_name: 'Berlin, Germany', place_type: ['place'] }),
        ],
      })

      await expect(
        withSession(async (session) =>
          createOrUpdateLocations(
            'User',
            'located-user',
            'Berlin, New Jersey, United States',
            session,
            locationContext(),
            undefined,
            undefined,
            true,
          ),
        ),
      ).rejects.toThrow('The locationName is invalid.')
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

    // Regression test for a truthy check (`data.lat && data.lng`) that would
    // treat a place sitting exactly on the equator or the prime meridian as
    // having "no coordinates" and silently drop them, rather than checking
    // they are actually numbers.
    it('stores lat/lng even when one of them is exactly 0 (prime meridian)', async () => {
      respondWith({
        features: [
          feature({
            id: 'place.greenwich',
            place_name: 'Greenwich',
            place_type: ['place'],
            center: [0, 51.5],
          }),
        ],
      })

      await withSession(async (session) => {
        await createOrUpdateLocations(
          'User',
          'located-user',
          'Greenwich',
          session,
          locationContext(),
        )
      })

      const { records } = await database.query({
        query: `MATCH (:User { id: "located-user" })-[:IS_IN]->(l:Location)
                RETURN l.lat AS lat, l.lng AS lng`,
      })

      expect(Number(records[0].get('lat'))).toBe(51.5)
      expect(Number(records[0].get('lng'))).toBe(0)
    })
  })
})

describe('a location picked by its Mapbox id', () => {
  const locationContext = () => ({ config: { MAPBOX_TOKEN: 'test-token' } }) as unknown as Context
  const groupTypes = ['neighborhood', 'locality', 'place', 'region', 'country']
  const friesackCentre = { lat: 52.742332, lng: 12.579309 }

  // Mapbox names a place after the language it was asked in; the id is the same in all of them.
  const friesack = {
    id: 'place.23259194',
    place_type: ['place'],
    place_name: 'Friesack, Havelland District, Brandenburg, Germany',
    center: [friesackCentre.lng, friesackCentre.lat],
    text_en: 'Friesack',
    text_de: 'Friesack',
    text_fr: 'Friesack',
    text_nl: 'Friesack',
    text_it: 'Friesack',
    text_es: 'Friesack',
    text_pt: 'Friesack',
    text_pl: 'Friesack',
    text_ru: 'Фризак',
    text_sq: 'Friesack',
  }

  const respondWith = (body: unknown) => {
    fetchSpy.mockResolvedValue(mockJsonResponse(body))
  }

  const requestedUrls = () => fetchSpy.mock.calls.map(([input]) => new URL(input as string))

  describe(resolveLocationId, () => {
    it('confirms the id by reverse-geocoding its coordinates with its own type only', async () => {
      respondWith({ features: [friesack] })

      await expect(
        resolveLocationId('place.23259194', friesackCentre, locationContext(), groupTypes),
      ).resolves.toMatchObject({ id: 'place.23259194' })

      // One request, at the coordinates, for the id's type: asking the most specific type first
      // (as a dropped pin does) would name the district around the centre instead of the town.
      const [url] = requestedUrls()

      expect(requestedUrls()).toHaveLength(1)
      expect(decodeURIComponent(url.pathname)).toContain('12.579309,52.742332')
      expect(url.searchParams.get('types')).toBe('place')
    })

    // The whole point: whatever language the form searched in, the id needs no name to match.
    it('does not depend on the name the place was picked by', async () => {
      respondWith({ features: [friesack] })

      await expect(
        resolveLocationId('place.23259194', friesackCentre, locationContext(), groupTypes),
      ).resolves.toMatchObject({ place_name: friesack.place_name })
      expect(requestedUrls()[0].pathname).not.toContain('Friesack')
    })

    it('refuses an id that does not lie at its coordinates', async () => {
      respondWith({ features: [{ ...friesack, id: 'place.9274' }] })

      await expect(
        resolveLocationId('place.23259194', friesackCentre, locationContext(), groupTypes),
      ).rejects.toThrow('The locationId does not lie at the given coordinates.')
    })

    it('refuses coordinates where Mapbox knows no place of that type', async () => {
      respondWith({ features: [] })

      await expect(
        resolveLocationId('place.23259194', friesackCentre, locationContext(), groupTypes),
      ).rejects.toThrow('The locationId does not lie at the given coordinates.')
    })

    it('refuses a confirmed feature that carries no place_type', async () => {
      respondWith({ features: [{ ...friesack, place_type: undefined }] })

      await expect(
        resolveLocationId('place.23259194', friesackCentre, locationContext(), groupTypes),
      ).rejects.toThrow('The locationId does not lie at the given coordinates.')
    })

    // A group or a user is in a town or a region, not at an address: the type list is the same
    // granularity their search offers, and an id of another kind never reaches Mapbox.
    it.each([['address.123'], ['poi.123'], ['place'], ['place.abc'], ['Friesack'], ['']])(
      'refuses %j without asking Mapbox',
      async (locationId) => {
        await expect(
          resolveLocationId(locationId, friesackCentre, locationContext(), groupTypes),
        ).rejects.toThrow('The locationId is invalid.')
        expect(fetchSpy).not.toHaveBeenCalled()
      },
    )

    it('needs the coordinates the place was picked with', async () => {
      await expect(
        resolveLocationId('place.23259194', null, locationContext(), groupTypes),
      ).rejects.toThrow('A locationId needs the lat and lng it was picked with.')
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe(extractLocationFeature, () => {
    // Not a property of the node: left in, `SET node += $params` would write it there.
    it('takes locationId off the params and resolves it', async () => {
      respondWith({ features: [friesack] })
      const params: Record<string, unknown> = { id: 'g', locationId: 'place.23259194' }

      await expect(
        extractLocationFeature(params, friesackCentre, locationContext(), groupTypes),
      ).resolves.toMatchObject({ id: 'place.23259194' })
      expect(params).toEqual({ id: 'g' })
    })

    it.each([[undefined], [null], ['']])(
      'leaves the location to locationName for %j',
      async (locationId) => {
        const params: Record<string, unknown> = { id: 'g', locationId }

        await expect(
          extractLocationFeature(params, friesackCentre, locationContext(), groupTypes),
        ).resolves.toBeNull()
        expect(params).toEqual({ id: 'g' })
        expect(fetchSpy).not.toHaveBeenCalled()
      },
    )
  })

  describe(attachLocationFeature, () => {
    beforeEach(async () => {
      await Factory.build('user', { id: 'located-user' })
    })

    it("stores the feature and makes it the node's only location", async () => {
      const session = database.driver.session()
      try {
        await attachLocationFeature(session, 'User', 'located-user', { ...friesack })
      } finally {
        await session.close()
      }

      const { records } = await database.query({
        query: `MATCH (:User { id: "located-user" })-[:IS_IN]->(l:Location)
                RETURN l.id AS id, l.nameRU AS nameRU`,
      })

      expect(records.map((record) => record.get('id') as string)).toEqual(['place.23259194'])
      expect(records[0].get('nameRU')).toBe('Фризак')
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

    describe('with a locationId', () => {
      const picked = {
        id: 'place.23259194',
        place_type: ['place'],
        place_name: 'Friesack, Havelland District, Brandenburg, Germany',
        center: [12.579309, 52.742332],
        ...Object.fromEntries(
          ['en', 'de', 'fr', 'nl', 'it', 'es', 'pt', 'pl', 'ru', 'sq'].map((lang) => [
            `text_${lang}`,
            'Friesack',
          ]),
        ),
      }

      const locationOf = async () => {
        const { records } = await database.query({
          query: 'MATCH (:User { id: "updating-user" })-[:IS_IN]->(l:Location) RETURN l.id AS id',
        })
        return records.map((record) => record.get('id') as string)
      }

      // The name the settings page showed is German, Mapbox's multi-language answer is English:
      // matched by name, the two never met.
      it('sets the picked place, whatever language its name was shown in', async () => {
        fetchSpy.mockResolvedValue(mockJsonResponse({ features: [picked] }))

        const { errors } = await mutate({
          mutation: UpdateUser,
          variables: {
            id: 'updating-user',
            locationName: 'Friesack, Kreis Havelland, Brandenburg, Deutschland',
            locationId: 'place.23259194',
            lat: 52.742332,
            lng: 12.579309,
          },
        })

        expect(errors).toBeUndefined()
        expect(await locationOf()).toEqual(['place.23259194'])
      })

      it('refuses a place it cannot confirm before writing anything', async () => {
        fetchSpy.mockResolvedValue(mockJsonResponse({ features: [] }))

        const { errors } = await mutate({
          mutation: UpdateUser,
          variables: {
            id: 'updating-user',
            name: 'Renamed',
            locationId: 'place.23259194',
            lat: 52.742332,
            lng: 12.579309,
          },
        })

        expect(errors?.[0]).toHaveProperty(
          'message',
          'The locationId does not lie at the given coordinates.',
        )

        const { records } = await database.query({
          query: 'MATCH (u:User { id: "updating-user" }) RETURN u.name AS name',
        })

        expect(records[0].get('name')).not.toBe('Renamed')
        expect(await locationOf()).toEqual([])
      })
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
