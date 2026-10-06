/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { UserInputError } from '@graphql/errors'

export const validateEventParams = (params) => {
  let locationName: string | null | undefined
  // Only set alongside a truthy locationName, and only when the client sent
  // both as numbers (e.g. from a dropped map pin) — createOrUpdateLocations()
  // reverse-geocodes these instead of forward-geocoding locationName's text
  // when present, so the saved location matches the exact point picked
  // rather than a text-search approximation of it.
  let coordinates: { lat: number; lng: number } | null = null
  if (params.postType && params.postType === 'Event') {
    const { eventInput } = params
    validateEventDate(eventInput.eventStart)
    params.eventStart = eventInput.eventStart

    if (eventInput.eventEnd) {
      validateEventEnd(eventInput.eventStart, eventInput.eventEnd)
      params.eventEnd = eventInput.eventEnd
    } else {
      params.eventEnd = null
    }

    // Trimmed before either check below — a whitespace-only venue is not
    // "present" for the first one, and raw (untrimmed) length would let a
    // padded string slip past the second one, both contradicting the
    // frontend's own trim-aware 3-100 character validation for this field.
    const trimmedVenue =
      typeof eventInput.eventVenue === 'string'
        ? eventInput.eventVenue.trim()
        : eventInput.eventVenue
    if (eventInput.eventLocationName && !trimmedVenue) {
      throw new UserInputError('Event venue must be present if event location is given!')
    }
    if (trimmedVenue && (trimmedVenue.length < 3 || trimmedVenue.length > 100)) {
      throw new UserInputError('Event venue must be between 3 and 100 characters!')
    }
    params.eventVenue = trimmedVenue
    params.eventLocationName = eventInput.eventLocationName?.trim()
    if (params.eventLocationName) {
      locationName = params.eventLocationName
      const hasLat = typeof eventInput.lat === 'number'
      const hasLng = typeof eventInput.lng === 'number'
      if (hasLat !== hasLng) {
        throw new UserInputError('Event location requires both lat and lng, or neither!')
      }
      if (hasLat && hasLng) {
        validateEventCoordinates(eventInput.lat, eventInput.lng)
        coordinates = { lat: eventInput.lat, lng: eventInput.lng }
      }
    } else {
      params.eventLocationName = null
      locationName = null
    }
    // Stored directly on the post itself (SET post += $params below), not on
    // the Location node coordinates carries — that node is MERGEd and shared
    // with every other post/user/group at the same address, so it can't hold
    // any one event's exact pick without corrupting it for everyone else
    // pointing at it. Cleared to null alongside locationName so a removed
    // location doesn't leave a stale pin behind.
    params.lat = coordinates?.lat ?? null
    params.lng = coordinates?.lng ?? null
    params.eventIsOnline = !!eventInput.eventIsOnline
  }
  delete params.eventInput
  return { locationName, coordinates }
}

const validateEventCoordinates = (lat: number, lng: number) => {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new UserInputError('Event location latitude must be a finite number between -90 and 90!')
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new UserInputError(
      'Event location longitude must be a finite number between -180 and 180!',
    )
  }
}

const validateEventDate = (dateString) => {
  const date = new Date(dateString)
  if (date.toString() === 'Invalid Date') {
    throw new UserInputError('Event start date must be a valid date!')
  }
  if (date.toISOString() !== dateString) {
    throw new UserInputError('Event start date must be in ISO format!')
  }
}

const validateEventEnd = (start, end) => {
  const endDate = new Date(end)
  if (endDate.toString() === 'Invalid Date') {
    throw new UserInputError('Event end date must be a valid date!')
  }
  if (endDate.toISOString() !== end) {
    throw new UserInputError('Event end date must be in ISO format!')
  }
  const startDate = new Date(start)
  if (endDate < startDate) {
    throw new UserInputError('Event end date must be a after event start date!')
  }
}
