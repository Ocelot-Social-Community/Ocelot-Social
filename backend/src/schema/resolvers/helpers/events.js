import { UserInputError } from 'apollo-server'

export const validateEventParams = (params) => {
  if (params.postType && params.postType === 'Event') {
    const { eventInput } = params
    validateEventDate(eventInput.eventStart)
    params.eventStart = eventInput.eventStart
    if (eventInput.eventEnd) {
      validateEventEnd(eventInput.eventStart, eventInput.eventEnd)
      params.eventEnd = eventInput.eventEnd
    }
    if (eventInput.eventLocation && !eventInput.eventVenue) {
      throw new UserInputError('Event venue must be present if event location is given!')
    }
    params.eventVenue = eventInput.eventVenue
    params.eventLocation = eventInput.eventLocation
    params.eventIsOnline = !!eventInput.eventIsOnline
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

const validateEventEnd = (start, end) => {
  const endDate = new Date(end)
  if (endDate.toString() === 'Invalid Date')
    throw new UserInputError('Event end date must be a valid date!')
  const startDate = new Date(start)
  if (endDate < startDate)
    throw new UserInputError('Event end date must be a after event start date!')
}
