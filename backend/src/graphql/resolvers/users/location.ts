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

import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'

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

  // Not a truthy check — a place sitting exactly on the equator or the
  // prime meridian (lat/lng === 0) is a real, valid coordinate, not a
  // missing one.
  if (typeof data.lat === 'number' && typeof data.lng === 'number') {
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
// types the map-pin/search UI itself reverse-geocodes with (LocationPickerMap.vue's
// "types" prop), so the saved location is a concrete nearby address/POI/place
// (or, for a group's coarser pin, a place/region/country), same as what the
// user was shown when picking it — never bare coordinates with no name.
// Mapbox's reverse endpoint (a "lng,lat" query) only accepts one type per
// request and returns its single best match, so these are tried one at a
// time, most specific first, same pattern as queryLocations' own
// reverse-geocoding below.
export const EVENT_REVERSE_GEOCODE_TYPES = ['address', 'poi', 'place']

// A group's or a user's own location is deliberately coarser than an
// event's exact pin — it resolves to the general neighborhood/locality/
// place/region/country it was dropped in rather than a specific address.
// 'neighborhood'/'locality' (most specific here) keep it from always
// snapping to a city's single center point — it can still land on the
// actual district it was pinned in. Both are listed since which one Mapbox
// uses for a city's districts varies: German Stadtteile (Hamburg's
// Ottensen, Berlin's Kreuzberg) come back under 'locality', not
// 'neighborhood', verified directly against the API.
export const NEIGHBORHOOD_REVERSE_GEOCODE_TYPES = [
  'neighborhood',
  'locality',
  'place',
  'region',
  'country',
]

// Pulls lat/lng off params (so they never reach a plain `SET node += $params`
// — neither Group nor User has lat/lng fields of its own, unlike Post) and
// validates them, mirroring validateEventParams' own coordinate check.
// Returns null when neither was given; throws when only one was, or either
// is out of range. entityLabel only shapes the error messages (e.g. "Group
// location requires…" / "User location requires…").
export const extractCoordinates = (
  params,
  entityLabel: string,
): { lat: number; lng: number } | null => {
  const { lat, lng } = params
  delete params.lat
  delete params.lng
  const hasLat = typeof lat === 'number'
  const hasLng = typeof lng === 'number'
  if (hasLat !== hasLng) {
    throw new AppError(Errors.LOCATION_COORDINATES_INCOMPLETE, { entity: entityLabel })
  }
  if (!hasLat) {
    return null
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new AppError(Errors.LOCATION_LATITUDE_OUT_OF_RANGE, { entity: entityLabel })
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new AppError(Errors.LOCATION_LONGITUDE_OUT_OF_RANGE, { entity: entityLabel })
  }
  return { lat, lng }
}

const reverseGeocodeCoordinates = async (
  lat: number,
  lng: number,
  context: Context,
  types: string[],
): Promise<any> => {
  for (const type of types) {
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

// Writes the feature and the chain of places it lies in (its `context`), and returns the id the
// node is linked to.
const storeLocation = async (session, data): Promise<string> => {
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

  return data.id
}

// Deletes all current locations from the node and adds the new one — none for an id no Location
// carries, which is how a location is cleared.
const attachLocation = async (session, nodeLabel, nodeId, locationId: string) => {
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

export const createOrUpdateLocations = async (
  nodeLabel,
  nodeId,
  locationName,
  session,
  context: Context,
  coordinates?: { lat: number; lng: number } | null,
  // Defaults to the precise, address-level types an event's exact pin uses.
  // Groups pass their own coarser list (place/region/country) — see groups.ts.
  reverseGeocodeTypes: string[] = EVENT_REVERSE_GEOCODE_TYPES,
  // Events drop a pin that need not correspond 1:1 to any piece of text, so
  // their coordinates are authoritative and reverse-geocoded (the default,
  // false, below). User/Group locations are always picked either via exact
  // text search or via a map click that the frontend itself already
  // resolved to a named place (LocationPickerMap's precision="resolved") —
  // there, `locationName` IS the user's actual choice, so it must be
  // matched by forward-geocoding that exact text, never overridden by a
  // second, independent reverse-geocode of the coordinates (which can land
  // on a more specific place — e.g. a city district — than the one picked,
  // since it tries the most specific type first). Coordinates are still
  // useful there, just demoted to a `proximity` bias that disambiguates
  // same-named places instead of a source of truth in their own right.
  matchLocationNameExactly = false,
) => {
  if (locationName === undefined) {
    return
  }

  let locationId

  if (locationName !== null) {
    let data

    if (coordinates && !matchLocationNameExactly) {
      data = await reverseGeocodeCoordinates(
        coordinates.lat,
        coordinates.lng,
        context,
        reverseGeocodeTypes,
      )
      if (!data?.place_type?.length) {
        throw new AppError(Errors.LOCATION_COORDINATES_NOT_RESOLVABLE)
      }
    } else {
      // matchLocationNameExactly reuses reverseGeocodeTypes as the forward-
      // search type filter (already the right granularity — e.g. groups'
      // neighborhood/locality/place/region/country — and, unlike the
      // reverse endpoint, forward search accepts several types in one
      // combined request) instead of the narrower default below, which
      // exists only for callers that never pass coordinates or the flag
      // (e.g. registration.ts) and are unaffected by this branch either way.
      const types = matchLocationNameExactly
        ? reverseGeocodeTypes.join(',')
        : 'region,place,country,address'
      const proximity = coordinates ? `${coordinates.lng},${coordinates.lat}` : null
      const response: any = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          locationName,
        )}.json?access_token=${
          context.config.MAPBOX_TOKEN
        }&types=${types}&language=${locales.join(',')}` +
          (proximity ? `&proximity=${encodeURIComponent(proximity)}` : ''),
        {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        },
      )

      const res = await response.json()

      if (!res?.features?.[0]) {
        throw new AppError(Errors.LOCATION_NAME_NOT_FOUND)
      }

      res.features.forEach((item) => {
        // place_name is what the frontend actually displays and sends back (see
        // LocationSelect.vue, and queryLocations below, which never exposes
        // matching_place_name to it in the first place). matching_place_name is
        // additionally checked for completeness — Mapbox only sets it when it had to
        // fuzzy-correct the query, so it is unset on the common, already-exact case.
        if (item.place_name === locationName || item.matching_place_name === locationName) {
          data = item
        }
      })
      if (!data) {
        // matchLocationNameExactly means locationName IS the user's picked choice (see its own
        // doc comment above) — silently falling back to Mapbox's top-ranked result here would
        // save a different place than the one they picked. Standard mode (no coordinates, no
        // flag) keeps the fallback: there, locationName is free text with no claim to an exact
        // match in the first place.
        if (matchLocationNameExactly) {
          throw new AppError(Errors.LOCATION_NAME_NO_EXACT_MATCH)
        }
        data = res.features[0]
      }

      if (!data?.place_type?.length) {
        throw new AppError(Errors.LOCATION_NAME_NOT_FOUND)
      }
    }

    locationId = await storeLocation(session, data)
  } else {
    locationId = 'non-existent-id'
  }

  await attachLocation(session, nodeLabel, nodeId, locationId)
}

// A Mapbox feature id: its type, a dot, an identifier — a number today (`place.23259194`), but
// opaque by contract, so only its shape is checked here; what confirms it is Mapbox naming it at
// its coordinates. Linear-time, no nesting.
const MAPBOX_FEATURE_ID = /^([a-z]+)\.[\w-]+$/

/**
 * The Mapbox feature the user picked, by its id — confirmed, not trusted.
 *
 * A place NAME is no identifier: it is what Mapbox calls the place in the language it was asked
 * in, so the text the form showed ("Friesack, Kreis Havelland, Brandenburg, Deutschland") is not
 * the text a second, multi-language search returns ("Friesack, Havelland District, …"), and
 * matching the two refused every place whose name has a translated part. The feature id is the
 * same in every language, and it is what the Location node is stored under anyway.
 *
 * The geocoding API has no lookup by id, so the id is confirmed instead: the coordinates the
 * place was picked with (its centre, as the search returned it) are reverse-geocoded with the
 * id's own type, and Mapbox has to name that very feature. That also keeps a client from
 * attaching a node to a place it made up — an id that does not lie at its coordinates is refused.
 *
 * Separate from attaching it (attachLocationFeature) so a resolver can refuse a bad location
 * BEFORE it writes anything, instead of leaving a half-saved node behind.
 */
export const resolveLocationId = async (
  locationId: string,
  coordinates: { lat: number; lng: number } | null,
  context: Context,
  // Which kinds of place the node may be in — the same granularity its search offers.
  allowedTypes: string[],
) => {
  const type = MAPBOX_FEATURE_ID.exec(locationId)?.[1]
  if (!type || !allowedTypes.includes(type)) {
    throw new AppError(Errors.LOCATION_ID_INVALID)
  }
  if (!coordinates) {
    throw new AppError(Errors.LOCATION_ID_COORDINATES_MISSING)
  }
  const data = await reverseGeocodeCoordinates(coordinates.lat, coordinates.lng, context, [type])
  if (data?.id !== locationId || !data.place_type?.length) {
    throw new AppError(Errors.LOCATION_ID_NOT_CONFIRMED)
  }
  return data
}

/**
 * Pulls `locationId` off a mutation's params (it is no property of the node) and resolves it.
 * Null when none was given — the node's location then follows `locationName` as before.
 */
export const extractLocationFeature = async (
  params,
  coordinates: { lat: number; lng: number } | null,
  context: Context,
  allowedTypes: string[],
) => {
  const { locationId } = params
  delete params.locationId
  if (locationId === undefined || locationId === null || locationId === '') {
    return null
  }
  return resolveLocationId(locationId, coordinates, context, allowedTypes)
}

/** Stores a feature resolveLocationId confirmed and makes it the node's only location. */
export const attachLocationFeature = async (session, nodeLabel: string, nodeId: string, data) => {
  await attachLocation(session, nodeLabel, nodeId, await storeLocation(session, data))
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
