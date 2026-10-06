/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { ErrorCode } from '@graphql/errorCodes'
import { Errors } from '@graphql/errorRegistry'
import { AppError, UserInputError } from '@graphql/errors'

// Same limits as the event form in the webapp (ContributionForm.vue). Every event needs a venue
// description, with or without an address.
const EVENT_VENUE_MIN_LENGTH = 3
const EVENT_VENUE_MAX_LENGTH = 100

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

    const venue = typeof eventInput.eventVenue === 'string' ? eventInput.eventVenue.trim() : ''
    if (!venue) {
      throw new AppError(Errors.POST_EVENT_VENUE_REQUIRED)
    }
    if (venue.length < EVENT_VENUE_MIN_LENGTH || venue.length > EVENT_VENUE_MAX_LENGTH) {
      throw new AppError(Errors.POST_EVENT_VENUE_LENGTH_INVALID, {
        min: EVENT_VENUE_MIN_LENGTH,
        max: EVENT_VENUE_MAX_LENGTH,
      })
    }
    params.eventVenue = eventInput.eventVenue
    params.eventLocationName = eventInput.eventLocationName?.trim()
    if (params.eventLocationName) {
      locationName = params.eventLocationName
      const hasLat = typeof eventInput.lat === 'number'
      const hasLng = typeof eventInput.lng === 'number'
      if (hasLat !== hasLng) {
        throw new UserInputError('Event location requires both lat and lng, or neither!', {
          code: ErrorCode.LOCATION_INVALID,
        })
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
    throw new UserInputError(
      'Event location latitude must be a finite number between -90 and 90!',
      {
        code: ErrorCode.LOCATION_INVALID,
      },
    )
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new UserInputError(
      'Event location longitude must be a finite number between -180 and 180!',
      { code: ErrorCode.LOCATION_INVALID },
    )
  }
}

const validateEventDate = (dateString) => {
  const date = new Date(dateString)
  if (date.toString() === 'Invalid Date') {
    throw new AppError(Errors.POST_EVENT_START_DATE_INVALID)
  }
  if (date.toISOString() !== dateString) {
    throw new AppError(Errors.POST_EVENT_START_DATE_NOT_ISO_FORMAT)
  }
}

const validateEventEnd = (start, end) => {
  const endDate = new Date(end)
  if (endDate.toString() === 'Invalid Date') {
    throw new AppError(Errors.POST_EVENT_END_DATE_INVALID)
  }
  if (endDate.toISOString() !== end) {
    throw new AppError(Errors.POST_EVENT_END_DATE_NOT_ISO_FORMAT)
  }
  const startDate = new Date(start)
  if (endDate < startDate) {
    throw new AppError(Errors.POST_EVENT_END_BEFORE_START)
  }
}
