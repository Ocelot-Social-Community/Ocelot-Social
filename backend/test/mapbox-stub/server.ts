// A stand-in for Mapbox's geocoding API (`/geocoding/v5/mapbox.places/{query}.json`), so that tests
// never reach the real one: every real request is billed to the token's account (the test suites
// were most of a month's geocoding bill), and the results depend on Mapbox's data of the day.
//
// It answers from places.json alone — forward searches by name, reverse lookups ("lng,lat") by
// distance — in the response shape location.ts reads. Point the backend at it with MAPBOX_API_URL.
//
// Two ways in, one implementation:
// - the backend suite starts it in-process (test/mapboxStubSetup.ts), on a free port;
// - the compose test stack runs this file as a service for the end-to-end tests
//   (`node server.ts`, Node strips the types itself — hence no dependencies and no path aliases).
import { once } from 'node:events'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import placesFile from './places.json' with { type: 'json' }

import type { AddressInfo } from 'node:net'

type Point = [number, number]

interface Place {
  id: string
  types: string[]
  names: Map<string, string>
  center: Point
  radiusKm: number
  rank: number
  context: string[]
  address?: string
}

// The languages location.ts asks for; any other falls back to English.
const LOCALES = ['en', 'de', 'fr', 'nl', 'it', 'es', 'pt', 'pl', 'ru', 'sq']

// Same as location.ts' COORDINATE_PATTERN: a "lng,lat" query is a reverse lookup.
// eslint-disable-next-line security/detect-unsafe-regex -- two flat quantifiers, linear-time
const COORDINATE_PATTERN = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/

const ROUTE = /^\/geocoding\/v5\/mapbox\.places\/([^/]+)\.json$/

// A place without a translation leaves that language out; nameOf falls back to English.
const places: Place[] = placesFile.places.map((record) => ({
  ...record,
  center: [record.center[0], record.center[1]],
  names: new Map(
    Object.entries(record.names).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  ),
}))
const byId = new Map(places.map((place) => [place.id, place]))

const nameOf = (place: Place, language: string): string =>
  place.names.get(language) ?? place.names.get('en') ?? place.id

const contextOf = (place: Place): Place[] =>
  place.context.map((id) => {
    const parent = byId.get(id)
    if (!parent) {
      throw new Error(`places.json: ${place.id} lies in unknown ${id}`)
    }
    return parent
  })

const labelOf = (place: Place, language: string): string =>
  place.address ? `${nameOf(place, language)} ${place.address}` : nameOf(place, language)

const placeNameOf = (place: Place, language: string): string =>
  [labelOf(place, language), ...contextOf(place).map((parent) => nameOf(parent, language))].join(
    ', ',
  )

// Mapbox answers a multi-language request with `text_<lang>` / `place_name_<lang>` per language,
// and `text` / `place_name` in the first one.
const localized = (
  languages: string[],
  field: string,
  value: (language: string) => string,
): Record<string, string> =>
  Object.fromEntries([
    [field, value(languages[0])],
    ...languages.map((language) => [`${field}_${language}`, value(language)]),
  ]) as Record<string, string>

const toFeature = (place: Place, languages: string[]) => ({
  id: place.id,
  type: 'Feature',
  place_type: place.types,
  relevance: 1,
  properties: {},
  ...localized(languages, 'text', (language) => nameOf(place, language)),
  ...localized(languages, 'place_name', (language) => placeNameOf(place, language)),
  ...(place.address ? { address: place.address } : {}),
  center: place.center,
  geometry: { type: 'Point', coordinates: place.center },
  context: contextOf(place).map((parent) => ({
    id: parent.id,
    ...localized(languages, 'text', (language) => nameOf(parent, language)),
  })),
})

// Great-circle distance in km — "within radiusKm" has to mean the same near the poles as here.
const distanceKm = ([lng1, lat1]: Point, [lng2, lat2]: Point): number => {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

const parsePoint = (value: string | null): Point | null => {
  if (!value || !COORDINATE_PATTERN.test(value)) {
    return null
  }
  const [lng, lat] = value.split(',').map(Number)
  return [lng, lat]
}

const forward = (query: string, candidates: Place[], proximity: Point | null): Place[] => {
  const needle = query.trim().toLowerCase()
  const matches = (place: Place) =>
    LOCALES.some(
      (language) =>
        placeNameOf(place, language).toLowerCase().startsWith(needle) ||
        labelOf(place, language).toLowerCase().startsWith(needle),
    )
  const distance = (place: Place) => (proximity ? distanceKm(proximity, place.center) : 0)
  return candidates.filter(matches).sort((a, b) => b.rank - a.rank || distance(a) - distance(b))
}

const reverse = (point: Point, candidates: Place[]): Place[] =>
  candidates
    .map((place) => ({ place, distance: distanceKm(point, place.center) }))
    .filter(({ place, distance }) => distance <= place.radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .map(({ place }) => place)

export const geocode = (query: string, params: URLSearchParams) => {
  const types = params.get('types')?.split(',').filter(Boolean)
  const candidates = types?.length
    ? places.filter((place) => place.types.some((type) => types.includes(type)))
    : places
  const languages = (params.get('language')?.split(',') ?? ['en']).map((language) =>
    LOCALES.includes(language) ? language : 'en',
  )
  const limit = Math.min(Number(params.get('limit')) || 5, 10)
  const point = parsePoint(query.trim())
  const found = point
    ? reverse(point, candidates)
    : forward(query, candidates, parsePoint(params.get('proximity')))
  const features = found.slice(0, limit)
  return {
    ids: features.map((place) => place.id),
    body: {
      type: 'FeatureCollection',
      query: point ?? query.trim().toLowerCase().split(/\s+/),
      features: features.map((place) => toFeature(place, languages)),
      attribution: 'Ocelot.social Mapbox stub — no Mapbox data',
    },
  }
}

export interface MapboxStub {
  url: string
  requests: () => number
  close: () => Promise<void>
}

export const startMapboxStub = async ({
  port = 0,
  host = '127.0.0.1',
  log = false,
}: { port?: number; host?: string; log?: boolean } = {}): Promise<MapboxStub> => {
  let requests = 0
  const server = createServer((req, res) => {
    requests += 1
    const url = new URL(req.url ?? '/', 'http://stub')
    const route = ROUTE.exec(url.pathname)
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (req.method !== 'GET' || !route) {
      reply(404, { message: 'Not Found' })
      return
    }
    // Mapbox refuses a request without a token, so a backend that lost its token fails here too.
    if (!url.searchParams.get('access_token')) {
      reply(401, { message: 'Not Authorized - No Token' })
      return
    }
    let query: string
    try {
      query = decodeURIComponent(route[1])
    } catch (error) {
      if (!(error instanceof URIError)) {
        throw error
      }
      // A malformed escape (`%ZZ`) is the client's mistake; it must not take the service down.
      reply(400, { message: 'Invalid path encoding' })
      return
    }
    const { ids, body } = geocode(query, url.searchParams)
    if (log) {
      // eslint-disable-next-line no-console -- the service's request log, read when a test misses
      console.log(
        `${query} types=${url.searchParams.get('types') ?? '*'} -> ${ids.join(' ') || 'nothing'}`,
      )
    }
    reply(200, body)
  })
  server.listen(port, host)
  await once(server, 'listening')
  const { port: boundPort } = server.address() as AddressInfo
  const close = promisify(server.close.bind(server))
  return {
    url: `http://${host}:${String(boundPort)}`,
    requests: () => requests,
    close: async () => {
      await close()
    },
  }
}

// Run as a service: `node server.ts`, listening on PORT (8080) on all interfaces.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // eslint-disable-next-line n/no-process-env -- the service's only configuration
  const port = Number(process.env.PORT) || 8080
  const stub = await startMapboxStub({ port, host: '0.0.0.0', log: true })
  // eslint-disable-next-line no-console
  console.log(`Mapbox stub listening on ${stub.url}`)
}
