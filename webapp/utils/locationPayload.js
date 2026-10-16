// What the value of a location field (LocationSelect, LocationPickerMap) says about the place, in
// the shape the mutations take it: UpdateUser, CreateGroup/UpdateGroup and SignupVerification.
//
// A picked search result or map point is an object — `{ value: <name as shown>, id, lat, lng }` —
// while typed text that was never resolved is a plain string. The backend decides the place by
// its Mapbox id where there is one, since a name differs with the language it was shown in
// (#10416, #7018, #7239); the name alone is only matched exactly.

const isObject = (value) => typeof value === 'object' && value !== null

/** The place's name as the field shows it, '' for none. */
export const locationName = (value) => {
  if (typeof value === 'string') return value
  return isObject(value) && typeof value.value === 'string' ? value.value : ''
}

/** The coordinates the place was picked with, null for typed text. */
export const locationCoordinates = (value) =>
  isObject(value) && typeof value.lat === 'number' && typeof value.lng === 'number'
    ? { lat: value.lat, lng: value.lng }
    : null

/**
 * The Mapbox feature id of a picked place, null for typed text or a map point nothing was found
 * at. Only together with coordinates: the backend confirms the id at them, and a feature Mapbox
 * returned without a centre leaves the id unconfirmable — the name path still takes it.
 */
export const locationId = (value) =>
  isObject(value) && typeof value.id === 'string' && locationCoordinates(value) ? value.id : null

/** All of it, as the mutation variables `locationName`, `locationId`, `lat` and `lng`. */
export const locationPayload = (value) => {
  const coordinates = locationCoordinates(value)
  return {
    locationName: locationName(value),
    locationId: locationId(value),
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
  }
}
