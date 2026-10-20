// Dates and times as the browser's Intl writes them for the user's locale: the order, the separators,
// the month names and the 12/24-hour clock all come from there, so no locale carries a format string.
//
// Formatters are created per call, not cached: Intl.DateTimeFormat fixes the time zone when it is
// created, and the hydration specs switch the time zone between server and client render.

const DAY = 24 * 60 * 60 * 1000

// The named formats the templates ask for (filters `date` and `dateTime`).
export const PRESETS = {
  // 19 Oct 2026 · 19.10.2026
  date: { dateStyle: 'medium' },
  // 19 Oct 2026, 14:00
  dateTime: { dateStyle: 'medium', timeStyle: 'short' },
  // 10/19/2026 · 19.10.2026
  numericDate: { year: 'numeric', month: '2-digit', day: '2-digit' },
  // October 2026
  monthYear: { year: 'numeric', month: 'long' },
  // 2:00 PM · 14:00
  time: { timeStyle: 'short' },
}

const toDate = (value) => (value instanceof Date ? value : new Date(value))

export function format(value, preset, locale) {
  return new Intl.DateTimeFormat(locale, PRESETS[preset]).format(toDate(value))
}

// "2:00 – 4:30 PM", "14:00–16:30 Uhr": a span the locale writes as one, sharing what both ends share.
export function formatRange(start, end, preset, locale) {
  return new Intl.DateTimeFormat(locale, PRESETS[preset]).formatRange(toDate(start), toDate(end))
}

// The branding's `dateStyle` / `timeStyle`, a `null` one left out.
export function formatAbsolute(value, { dateStyle, timeStyle }, locale) {
  const options = {}
  if (dateStyle) options.dateStyle = dateStyle
  if (timeStyle) options.timeStyle = timeStyle
  return new Intl.DateTimeFormat(locale, options).format(toDate(value))
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

// Days between the calendar days of both, in local time. Rounded: a day with a daylight saving switch
// is 23 or 25 hours long.
const calendarDaysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY)

// "today, 3:55 PM", "yesterday, 8:15 PM", "Thursday 11:00 AM" within a week either way, and the date
// (in the branding's `dateStyle`) beyond.
export function formatRelative(value, now, { dateStyle }, locale) {
  const date = toDate(value)
  const days = calendarDaysBetween(now, date)
  if (Math.abs(days) <= 1) {
    const day = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day')
    return `${day}, ${format(date, 'time', locale)}`
  }
  if (Math.abs(days) <= 6) {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }
  return formatAbsolute(date, { dateStyle: dateStyle || 'medium', timeStyle: null }, locale)
}

export function isSameDay(a, b) {
  return calendarDaysBetween(toDate(a), toDate(b)) === 0
}
