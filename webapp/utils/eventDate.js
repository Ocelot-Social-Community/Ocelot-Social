// Mirrors filterEventDates() in backend/src/graphql/resolvers/posts.ts: an
// event stays "current" through the rest of the calendar day it ends on (or,
// without an eventEnd, the day it started), only truly "past" once that
// whole day has elapsed — not the instant the raw timestamp passes. A
// still-running event (started, not yet ended) must never count as past.
//
// Local time, deliberately not UTC: unlike the backend (which has no
// reliable notion of the requesting user's timezone and uses UTC for that
// reason), this runs in the viewer's own browser — the viewer's actual local
// calendar day is the correct boundary here, not a UTC one.
export function isEventPast(post) {
  if (!post?.eventStart) return false
  const endOfRelevantDate = new Date(post.eventEnd || post.eventStart)
  endOfRelevantDate.setHours(23, 59, 59, 999)
  return endOfRelevantDate < new Date()
}
