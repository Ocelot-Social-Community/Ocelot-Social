// TRANSITIONAL — errorRegistry.ts is the single source of truth for user-facing errors. What is
// left here are the codes still thrown with more than one text or error class, so they do not fit
// one registry entry yet. Each moves there once its text and type are decided; then this file goes.
//
// Errors without a code (developer-facing input like filter syntax or paging arguments, and every
// internal failure) are shown by the webapp with the generic message for their `extensions.code`.
export const ErrorCode = {
  // authentication & account
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  // e-mail & registration
  // users & badges
  // groups
  // posts, comments & events
  EVENT_DATE_INVALID: 'EVENT_DATE_INVALID',
  LOCATION_INVALID: 'LOCATION_INVALID',
  MAX_PINNED_POSTS_REACHED: 'MAX_PINNED_POSTS_REACHED',
  // moderation
  // roles
  ROLE_CHANGE_NOT_ALLOWED: 'ROLE_CHANGE_NOT_ALLOWED',
  // invite codes
  INVITE_CODES_LIMIT_REACHED: 'INVITE_CODES_LIMIT_REACHED',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
