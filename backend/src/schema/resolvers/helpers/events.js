import { UserInputError } from 'apollo-server'

export const validateEventParams = (params) => {
  if (params.postType && params.postType === 'Event') {
    const { eventInput } = params
    validateEventDate(eventInput.eventStart)
    params.eventStart = eventInput.eventStart
    if (eventInput.eventLocation && !eventInput.eventVenue) {
      throw new UserInputError('Event venue must be present if event location is given!')
    }
    params.eventVenue = eventInput.eventVenue
    params.eventLocation = eventInput.eventLocation
  }
  delete params.eventInput
  let locationName
  if (params.eventLocation) {
    params.eventLocationName = params.eventLocation
    locationName = params.eventLocation
  } else {
    params.eventLocationName = null
    locationName = null
  }
  delete params.eventLocation
  return locationName
}

const validateEventDate = (dateString) => {
  const date = new Date(dateString)
  if (date.toString() === 'Invalid Date')
    throw new UserInputError('Event start date must be a valid date!')
  const now = new Date()
  if (date.getTime() < now.getTime()) {
    throw new UserInputError('Event start date must be in the future!')
  }
}
