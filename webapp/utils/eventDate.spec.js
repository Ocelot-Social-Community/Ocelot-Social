import { isEventPast } from './eventDate'

describe('isEventPast', () => {
  // Frozen at midday (rather than the real current time) so the smallest
  // offsets below (e.g. -1h/-3h) can't drift across a local midnight
  // boundary and break the "still today" assertions.
  beforeEach(() => {
    const noon = new Date()
    noon.setHours(12, 0, 0, 0)
    jest.useFakeTimers()
    jest.setSystemTime(noon)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const hoursFromNow = (h) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString()

  it('returns true when both eventStart and eventEnd are in the past', () => {
    const post = { eventStart: hoursFromNow(-48), eventEnd: hoursFromNow(-24) }
    expect(isEventPast(post)).toBe(true)
  })

  it('returns false for a still-running event (eventStart past, eventEnd future)', () => {
    const post = { eventStart: hoursFromNow(-1), eventEnd: hoursFromNow(1) }
    expect(isEventPast(post)).toBe(false)
  })

  it('returns false while still within the day its eventEnd falls on', () => {
    const post = { eventStart: hoursFromNow(-3), eventEnd: hoursFromNow(-1) }
    expect(isEventPast(post)).toBe(false)
  })

  it('returns false for future events', () => {
    const post = { eventStart: hoursFromNow(24), eventEnd: hoursFromNow(48) }
    expect(isEventPast(post)).toBe(false)
  })

  it('returns false without an eventStart', () => {
    expect(isEventPast({ eventStart: undefined, eventEnd: undefined })).toBe(false)
  })

  it('returns false for an event without eventEnd while still within its start day', () => {
    const post = { eventStart: hoursFromNow(-1), eventEnd: null }
    expect(isEventPast(post)).toBe(false)
  })

  it('returns true for an event without eventEnd once its start day has fully elapsed', () => {
    const post = { eventStart: hoursFromNow(-30), eventEnd: null }
    expect(isEventPast(post)).toBe(true)
  })
})
