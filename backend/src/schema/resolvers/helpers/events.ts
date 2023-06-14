import { UserInputError } from 'apollo-server'

export const validateEventParams = (params) => {
  let locationName = null
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

    if (eventInput.eventLocationName && !eventInput.eventVenue) {
      throw new UserInputError('Event venue must be present if event location is given!')
    }
    params.eventVenue = eventInput.eventVenue
    params.eventLocationName = eventInput.eventLocationName && eventInput.eventLocationName.trim()
    if (params.eventLocationName) {
      locationName = params.eventLocationName
    } else {
      params.eventLocationName = null
    }
    params.eventIsOnline = !!eventInput.eventIsOnline
  }
  delete params.eventInput
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
