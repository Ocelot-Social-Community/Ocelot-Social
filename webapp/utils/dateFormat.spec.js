import {
  PRESETS,
  format,
  formatAbsolute,
  formatRange,
  formatRelative,
  isSameDay,
} from './dateFormat'

// Intl separates with narrow and thin no-break spaces ("2:00 PM", "2:00 – 4:30 PM").
const plain = (text) => text.replace(/[\u00a0\u2009\u202f]/g, ' ')

// Local time, so the specs hold in any time zone.
const now = new Date(2026, 9, 19, 16, 0) // Monday, 19 October 2026, 16:00
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute)

describe('format', () => {
  it.each([
    ['date', 'de-DE', '19.10.2026'],
    ['date', 'en-US', 'Oct 19, 2026'],
    ['dateTime', 'de-DE', '19.10.2026, 16:00'],
    ['dateTime', 'en-US', 'Oct 19, 2026, 4:00 PM'],
    ['numericDate', 'de-DE', '19.10.2026'],
    ['numericDate', 'en-US', '10/19/2026'],
    ['numericDate', 'fr-FR', '19/10/2026'],
    ['monthYear', 'de-DE', 'Oktober 2026'],
    ['monthYear', 'en-US', 'October 2026'],
    ['time', 'de-DE', '16:00'],
    ['time', 'en-US', '4:00 PM'],
  ])('writes %s in %s as "%s"', (preset, locale, expected) => {
    expect(plain(format(now, preset, locale))).toBe(expected)
  })

  it('takes a date string as well', () => {
    expect(format(now.toISOString(), 'numericDate', 'de-DE')).toBe('19.10.2026')
  })

  it('has a preset for every name the templates use', () => {
    expect(Object.keys(PRESETS)).toEqual(['date', 'dateTime', 'numericDate', 'monthYear', 'time'])
  })
})

describe('formatRange', () => {
  it('writes a span of time on one day the way the locale does', () => {
    expect(plain(formatRange(at(19, 14), at(19, 16, 30), 'time', 'de-DE'))).toBe('14:00–16:30 Uhr')
    expect(plain(formatRange(at(19, 14), at(19, 16, 30), 'time', 'en-US'))).toBe('2:00 – 4:30 PM')
  })
})

describe('formatAbsolute', () => {
  it('writes the date only, with no timeStyle', () => {
    expect(formatAbsolute(now, { dateStyle: 'medium', timeStyle: null }, 'de-DE')).toBe(
      '19.10.2026',
    )
  })

  it('writes the time only, with no dateStyle', () => {
    expect(formatAbsolute(now, { dateStyle: null, timeStyle: 'short' }, 'de-DE')).toBe('16:00')
  })

  it('writes both', () => {
    expect(plain(formatAbsolute(now, { dateStyle: 'long', timeStyle: 'short' }, 'en-US'))).toBe(
      'October 19, 2026 at 4:00 PM',
    )
  })
})

describe('formatRelative', () => {
  const relative = (date, locale, dateStyle = 'medium') =>
    plain(formatRelative(date, now, { dateStyle }, locale))

  it.each([
    ['today', at(19, 9, 30), 'de-DE', 'heute, 09:30'],
    ['today', at(19, 9, 30), 'en-US', 'today, 9:30 AM'],
    ['yesterday', at(18, 20, 15), 'de-DE', 'gestern, 20:15'],
    ['yesterday', at(18, 20, 15), 'en-US', 'yesterday, 8:15 PM'],
    ['tomorrow', at(20, 8), 'en-US', 'tomorrow, 8:00 AM'],
    ['within the past week', at(15, 11), 'de-DE', 'Donnerstag, 11:00'],
    ['within the past week', at(13, 11), 'en-US', 'Tuesday 11:00 AM'],
    ['within the coming week', at(24, 11), 'en-US', 'Saturday 11:00 AM'],
    ['beyond a week', at(12, 11), 'de-DE', '12.10.2026'],
    ['beyond a week', at(12, 11), 'en-US', 'Oct 12, 2026'],
  ])('writes a time %s by its day (%s, %s)', (_, date, locale, expected) => {
    expect(relative(date, locale)).toBe(expected)
  })

  it("writes the date beyond a week in the branding's dateStyle", () => {
    expect(relative(at(12, 11), 'en-US', 'long')).toBe('October 12, 2026')
  })

  it('writes the date beyond a week even when the branding shows no date', () => {
    expect(relative(at(12, 11), 'en-US', null)).toBe('Oct 12, 2026')
  })

  it('counts calendar days, not 24-hour spans', () => {
    // 1 minute after midnight is today, 16 hours before it.
    expect(relative(at(19, 0, 1), 'en-US')).toBe('today, 12:01 AM')
    // 23:59 the day before is yesterday, only 16 hours ago.
    expect(relative(at(18, 23, 59), 'en-US')).toBe('yesterday, 11:59 PM')
  })

  it('counts a day across a daylight saving switch as one day', () => {
    // 25 October 2026 is 25 hours long in Europe; the count is right in any time zone.
    const sunday = new Date(2026, 9, 25, 12)
    const monday = new Date(2026, 9, 26, 12)
    expect(plain(formatRelative(sunday, monday, { dateStyle: 'medium' }, 'en-US'))).toBe(
      'yesterday, 12:00 PM',
    )
  })
})

describe('isSameDay', () => {
  it('is true on one calendar day', () => {
    expect(isSameDay(at(19, 0, 1), at(19, 23, 59))).toBe(true)
  })

  it('is false across midnight', () => {
    expect(isSameDay(at(19, 23, 59), at(20, 0, 1))).toBe(false)
  })

  it('takes date strings as well', () => {
    expect(isSameDay(at(19, 8).toISOString(), at(19, 9).toISOString())).toBe(true)
  })
})
