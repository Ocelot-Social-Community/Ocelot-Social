/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-loop-func */

import { UserInputError } from '@graphql/errors'

import type { Context } from '@src/context'

const locales = ['en', 'de', 'fr', 'nl', 'it', 'es', 'pt', 'pl', 'ru', 'sq']

const REQUEST_TIMEOUT = 3000

const createLocation = async (session, mapboxData) => {
  const data = {
    id: mapboxData.id + (mapboxData.address ? `-${mapboxData.address}` : ''),
    nameEN: mapboxData.text_en,
    nameDE: mapboxData.text_de,
    nameFR: mapboxData.text_fr,
    nameNL: mapboxData.text_nl,
    nameIT: mapboxData.text_it,
    nameES: mapboxData.text_es,
    namePT: mapboxData.text_pt,
    namePL: mapboxData.text_pl,
    nameRU: mapboxData.text_ru,
    nameSQ: mapboxData.text_sq,
    type: mapboxData.id.split('.')[0].toLowerCase(),
    address: mapboxData.address,
    lng: mapboxData.center?.length ? mapboxData.center[0] : null,
    lat: mapboxData.center?.length ? mapboxData.center[1] : null,
  }

  let mutation =
    'MERGE (l:Location {id: $id}) ' +
    'SET l.name = $nameEN, ' +
    'l.nameEN = $nameEN, ' +
    'l.nameDE = $nameDE, ' +
    'l.nameFR = $nameFR, ' +
    'l.nameNL = $nameNL, ' +
    'l.nameIT = $nameIT, ' +
    'l.nameES = $nameES, ' +
    'l.namePT = $namePT, ' +
    'l.namePL = $namePL, ' +
    'l.nameRU = $nameRU, ' +
    'l.nameSQ = $nameSQ, ' +
    'l.type = $type'

  if (data.lat && data.lng) {
    mutation += ', l.lat = $lat, l.lng = $lng'
  }
  if (data.address) {
    mutation += ', l.address = $address'
  }

  mutation += ' RETURN l.id'

  await session.writeTransaction((transaction) => {
    return transaction.run(mutation, data)
  })
}

// Coordinates take priority over forward-geocoding locationName's text (see
// createOrUpdateLocations below) — reverse-geocoded here with the same
// types the map-pin/search UI itself reverse-geocodes with (EventLocationMap.vue's
// REVERSE_GEOCODE_TYPES), so the saved location is a concrete nearby address/
// POI/place, same as what the user was shown when picking it — never bare
// coordinates with no name. Mapbox's reverse endpoint (a "lng,lat" query)
// only accepts one type per request and returns its single best match, so
// these are tried one at a time, most specific first, same pattern as
// queryLocations' own reverse-geocoding below.
const EVENT_REVERSE_GEOCODE_TYPES = ['address', 'poi', 'place']

const reverseGeocodeCoordinates = async (
  lat: number,
  lng: number,
  context: Context,
): Promise<any> => {
  for (const type of EVENT_REVERSE_GEOCODE_TYPES) {
    const response: any = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
        `?access_token=${context.config.MAPBOX_TOKEN}&types=${type}&limit=1&language=${locales.join(',')}`,
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      },
    )
    const res = await response.json()
    if (res?.features?.[0]) {
      return res.features[0]
    }
  }
  return null
}

export const createOrUpdateLocations = async (
  nodeLabel,
  nodeId,
  locationName,
  session,
  context: Context,
  coordinates?: { lat: number; lng: number } | null,
) => {
  if (locationName === undefined) {
    return
  }

  let locationId

  if (locationName !== null) {
    let data

    if (coordinates) {
      data = await reverseGeocodeCoordinates(coordinates.lat, coordinates.lng, context)
      if (!data?.place_type?.length) {
        throw new UserInputError('event location coordinates are invalid')
      }
    } else {
      const response: any = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          locationName,
        )}.json?access_token=${
          context.config.MAPBOX_TOKEN
        }&types=region,place,country,address&language=${locales.join(',')}`,
        {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        },
      )

      const res = await response.json()

      if (!res?.features?.[0]) {
        throw new UserInputError('locationName is invalid')
      }

      res.features.forEach((item) => {
        if (item.matching_place_name === locationName) {
          data = item
        }
      })
      if (!data) {
        data = res.features[0]
      }

      if (!data?.place_type?.length) {
        throw new UserInputError('locationName is invalid')
      }
    }

    if (data.place_type.length > 1) {
      data.id = 'region.' + data.id.split('.')[1]
    }
    await createLocation(session, data)

    let parent = data

    if (parent.address) {
      parent.id += `-${parent.address}`
    }

    if (data.context) {
      for await (const ctx of data.context) {
        await createLocation(session, ctx)
        await session.writeTransaction((transaction) => {
          return transaction.run(
            `
                MATCH (parent:Location {id: $parentId}), (child:Location {id: $childId})
                MERGE (child)<-[:IS_IN]-(parent)
                RETURN child.id, parent.id
              `,
            {
              parentId: parent.id,
              childId: ctx.id,
            },
          )
        })
        parent = ctx
      }
    }

    locationId = data.id
  } else {
    locationId = 'non-existent-id'
  }

  // delete all current locations from node and add new location
  await session.writeTransaction((transaction) => {
    return transaction.run(
      `
        MATCH (node:${nodeLabel} {id: $nodeId})
        OPTIONAL MATCH (node)-[relationship:IS_IN]->(:Location)
        DELETE relationship
        WITH node
        MATCH (location:Location {id: $locationId})
        MERGE (node)-[:IS_IN]->(location)
        RETURN location.id, node.id
      `,
      { nodeId, locationId },
    )
  })
}

const ALLOWED_LOCATION_TYPES = [
  'country',
  'region',
  'postcode',
  'district',
  'place',
  'locality',
  'neighborhood',
  'address',
  'poi',
]
const DEFAULT_LOCATION_TYPES = 'country,region,place,address'

// Reverse geocoding (see queryLocations below) tries one type at a time and
// returns the first match — most specific first, so a pin dropped on a
// building returns its address rather than short-circuiting on the country
// every coordinate on Earth trivially matches. DEFAULT_LOCATION_TYPES above
// is unsuitable here (country-first): it's tuned for forward/free-text
// search, where all requested types go into a single combined request and
// order doesn't affect which results come back.
// Covers every type in ALLOWED_LOCATION_TYPES above (in the reverse of that
// array's own broad-to-specific order, i.e. Mapbox's own documented
// hierarchy — country is the broadest, poi the narrowest) — a caller-
// requested type missing from this list would otherwise get filtered out
// entirely below, always returning [] regardless of what Mapbox has.
// address before poi is the one deliberate deviation from that pure
// hierarchy: a building's address is more useful/specific for a human than
// a generic point-of-interest label, even though Mapbox itself ranks poi as
// the more granular category.
const REVERSE_GEOCODE_TYPE_PRIORITY = [
  'address',
  'poi',
  'neighborhood',
  'locality',
  'place',
  'district',
  'postcode',
  'region',
  'country',
]

// Matches a reverse-geocoding search string ("lng,lat"), as opposed to a
// free-text place name. Linear-time (two flat, non-nested quantifiers), not
// vulnerable to catastrophic backtracking despite the linter's warning.
// eslint-disable-next-line security/detect-unsafe-regex
const COORDINATE_PATTERN = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/

const buildMapboxUrl = (
  place: string,
  lang: string,
  types: string,
  limit: number,
  proximity: string | undefined,
  accessToken: string,
) => {
  let url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json` +
    `?access_token=${accessToken}&types=${types}&language=${encodeURIComponent(lang)}&limit=${limit}`
  if (proximity) {
    url += `&proximity=${encodeURIComponent(proximity)}`
  }
  return url
}

const fetchMapboxFeatures = async (url: string) => {
  const res: any = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  })
  const response = await res.json()
  return (
    response?.features?.map((item: any) => ({
      place_name: item.place_name,
      id: item.id,
      lng: item.center?.length ? item.center[0] : null,
      lat: item.center?.length ? item.center[1] : null,
    })) ?? []
  )
}

export const queryLocations = async ({ place, lang, types, proximity }, context: Context) => {
  const requestedTypes =
    types
      ?.split(',')
      .map((t) => t.trim())
      .filter((t) => ALLOWED_LOCATION_TYPES.includes(t)) ?? []
  const locationTypes = requestedTypes.join(',') || DEFAULT_LOCATION_TYPES
  const accessToken = context.config.MAPBOX_TOKEN

  // Mapbox's reverse-geocoding (a "lng,lat" search string) only accepts a
  // single `types` value combined with `limit=1` — passing multiple types
  // is rejected/returns no results, unlike forward (place-name) search.
  // Try each requested type in order, one request at a time, and return the
  // first match — e.g. an exact address, falling back to the nearest POI or
  // place name if there's no addressed building at that exact point.
  // Always walked in REVERSE_GEOCODE_TYPE_PRIORITY's most-specific-first
  // order regardless of what order the caller listed them in (or the
  // country-first DEFAULT_LOCATION_TYPES fallback below), restricted to
  // types actually requested — otherwise a caller-supplied "country,address"
  // would short-circuit on the country every coordinate trivially matches
  // and never reach the address.
  const trimmedPlace = place.trim()
  if (COORDINATE_PATTERN.test(trimmedPlace)) {
    const candidateTypes = requestedTypes.length
      ? requestedTypes
      : DEFAULT_LOCATION_TYPES.split(',')
    const reverseTypes = REVERSE_GEOCODE_TYPE_PRIORITY.filter((type) =>
      candidateTypes.includes(type),
    )
    for (const type of reverseTypes) {
      const features = await fetchMapboxFeatures(
        buildMapboxUrl(trimmedPlace, lang, type, 1, proximity, accessToken),
      )
      if (features.length) {
        return features
      }
    }
    return []
  }

  return fetchMapboxFeatures(buildMapboxUrl(place, lang, locationTypes, 10, proximity, accessToken))
}
