import { locationCoordinates, locationId, locationName, locationPayload } from './locationPayload'

const picked = { value: 'Schweiz', label: 'Schweiz', id: 'country.8738', lat: 46.8, lng: 8.2 }

describe('locationPayload', () => {
  it('sends a picked place by its id and the coordinates it was picked with', () => {
    expect(locationPayload(picked)).toEqual({
      locationName: 'Schweiz',
      locationId: 'country.8738',
      lat: 46.8,
      lng: 8.2,
    })
  })

  it('sends typed text by its name alone', () => {
    expect(locationPayload('Schweiz')).toEqual({
      locationName: 'Schweiz',
      locationId: null,
      lat: null,
      lng: null,
    })
  })

  it('sends nothing for an empty field', () => {
    expect(locationPayload(null)).toEqual({
      locationName: '',
      locationId: null,
      lat: null,
      lng: null,
    })
  })

  // The backend confirms the id at its coordinates; without them it could not.
  it('leaves out an id that came without coordinates', () => {
    expect(locationId({ value: 'Schweiz', id: 'country.8738' })).toBeNull()
  })

  it('takes coordinates only when both are numbers', () => {
    expect(locationCoordinates({ value: 'x', lat: 1 })).toBeNull()
    expect(locationCoordinates({ value: 'x', lat: 0, lng: 0 })).toEqual({ lat: 0, lng: 0 })
  })

  it('reads the name off a picked place or a string, and nothing else', () => {
    expect(locationName(picked)).toBe('Schweiz')
    expect(locationName('Bern')).toBe('Bern')
    expect(locationName({ label: 'no value' })).toBe('')
    expect(locationName(undefined)).toBe('')
  })
})
