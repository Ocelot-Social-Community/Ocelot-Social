// The one place where an error a user can trigger is defined: its name, its error class and its
// English text belong together here, so they cannot drift apart between the places that throw it.
//
// - The name is the stable, machine-readable code. The webapp translates by it, from the
//   `backendErrors.<NAME>` key in webapp/locales/*.json, so rename one only together with its
//   locale keys (scripts/translations/backend-error-codes.sh checks that every name has an English
//   translation). Names read `<AREA>_<OBJECT>_<PROBLEM>`, spelled out.
// - `type` is Apollo's standard error class, sent as `extensions.code`.
// - `text` is the English message for logs and API clients. A `{placeholder}` in it is filled from
//   the params the error is thrown with; the same params go to the webapp for its translation.
// - `params` lists values only the translation uses (e.g. a limit the English text leaves out).
//   The compiler requires a throw site to pass exactly the placeholders plus these.
//
// Thrown as `throw new AppError(Errors.API_KEYS_FEATURE_DISABLED)` (see errors.ts).
export type ErrorType = 'BAD_USER_INPUT' | 'FORBIDDEN' | 'UNAUTHENTICATED'

interface ErrorDefinition {
  type: ErrorType
  text: string
  // Values only the translation uses, on top of the placeholders in `text`.
  params?: readonly string[]
}

const definitions = {
  // authentication & account
  LOGIN_ACCOUNT_DISABLED: { type: 'UNAUTHENTICATED', text: 'Your account has been disabled.' },
  LOGIN_CREDENTIALS_INCORRECT: {
    type: 'UNAUTHENTICATED',
    text: 'Incorrect email address or password.',
  },
  PASSWORD_CHANGE_OLD_PASSWORD_INCORRECT: {
    type: 'BAD_USER_INPUT',
    text: 'Old password is not correct',
  },
  PASSWORD_CHANGE_NEW_PASSWORD_EQUALS_OLD: {
    type: 'BAD_USER_INPUT',
    text: 'Old password and new password should be different',
  },
  // e-mail & registration
  EMAIL_CHANGE_ADDRESS_ALREADY_IN_USE: {
    type: 'BAD_USER_INPUT',
    text: 'A user account with this email already exists.',
  },
  EMAIL_CHANGE_ADDRESS_INVALID: { type: 'BAD_USER_INPUT', text: 'must be a valid email' },
  EMAIL_CHANGE_CONFIRMATION_CODE_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Invalid nonce or no email address found.',
  },
  REGISTRATION_CONFIRMATION_CODE_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Invalid email or nonce',
  },
  REGISTRATION_USER_SLUG_ALREADY_TAKEN: {
    type: 'BAD_USER_INPUT',
    text: 'User with this slug already exists!',
  },
  // users & badges
  USER_DOES_NOT_EXIST: { type: 'BAD_USER_INPUT', text: 'Could not find user.' },
  USER_UNBLOCK_USER_NOT_BLOCKED: { type: 'BAD_USER_INPUT', text: 'Could not find blocked user.' },
  USER_PROFILE_NAME_TOO_SHORT: {
    type: 'BAD_USER_INPUT',
    text: 'Username must be at least {min} character long!',
  },
  BADGE_SELECTION_BADGE_NOT_REWARDED: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot set badges not rewarded to you.',
  },
  // groups
  GROUP_SAVE_DESCRIPTION_TOO_SHORT: {
    type: 'BAD_USER_INPUT',
    text: 'Description too short!',
    params: ['min'],
  },
  // A query selected a computed Group field (myRole, postsCount, …) without the group's id.
  GROUP_FIELD_GROUP_ID_MISSING: {
    type: 'BAD_USER_INPUT',
    text: 'Can not identify selected Group!',
  },
  GROUP_SAVE_SLUG_ALREADY_TAKEN: {
    type: 'BAD_USER_INPUT',
    text: 'Group with this slug already exists!',
  },
  GROUP_SAVE_TOO_FEW_CATEGORIES: {
    type: 'BAD_USER_INPUT',
    text: 'Too few categories!',
    params: ['min'],
  },
  GROUP_SAVE_TOO_MANY_CATEGORIES: {
    type: 'BAD_USER_INPUT',
    text: 'Too many categories!',
    params: ['max'],
  },
  GROUP_MEMBERSHIP_USER_NOT_A_MEMBER: {
    type: 'BAD_USER_INPUT',
    text: 'User is not a member of this group',
  },
  // posts, comments & events
  POST_DOES_NOT_EXIST: { type: 'BAD_USER_INPUT', text: 'Could not find post.' },
  COMMENT_SAVE_CONTENT_TOO_SHORT: {
    type: 'BAD_USER_INPUT',
    text: 'Comment must be at least {min} character long!',
  },
  POST_EVENT_END_BEFORE_START: {
    type: 'BAD_USER_INPUT',
    text: 'The end date must be after the start date.',
  },
  POST_EVENT_VENUE_REQUIRED: { type: 'BAD_USER_INPUT', text: 'Event venue must be present!' },
  POST_EVENT_VENUE_LENGTH_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Event venue must be between {min} and {max} characters long!',
  },
  POST_PIN_FEATURE_DISABLED: { type: 'FORBIDDEN', text: 'Pinned posts are not allowed!' },
  POST_PIN_LIMIT_REACHED: {
    type: 'BAD_USER_INPUT',
    text: 'Maximum number of pinned posts reached. Unpin a post first.',
  },
  POST_SAVE_SLUG_ALREADY_TAKEN: {
    type: 'BAD_USER_INPUT',
    text: 'Post with this slug already exists!',
  },
  // moderation
  REPORT_TARGET_IS_OWN: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot report yourself or your own content!',
  },
  REVIEW_TARGET_IS_OWN: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot review a report about yourself or your own content!',
  },
  REVIEW_TARGET_DOES_NOT_EXIST: {
    type: 'BAD_USER_INPUT',
    text: 'Resource not found or is not a Post|Comment|User!',
  },
  REVIEW_TARGET_NOT_REPORTED: {
    type: 'BAD_USER_INPUT',
    text: 'Before starting the review process, please report the {label}!',
  },
  // roles
  ROLE_ASSIGNMENT_LAST_OWNER_NOT_REMOVABLE: {
    type: 'FORBIDDEN',
    text: 'Cannot remove the last owner.',
  },
  ROLE_ASSIGNMENT_OWNER_ROLE_REQUIRES_OWNER: {
    type: 'FORBIDDEN',
    text: 'Only an owner may assign or change the owner role.',
  },
  ROLE_SAVE_NAME_ALREADY_TAKEN: { type: 'BAD_USER_INPUT', text: "Role '{name}' already exists." },
  ROLE_SAVE_NAME_INVALID: { type: 'BAD_USER_INPUT', text: 'Invalid role name.' },
  ROLE_DOES_NOT_EXIST: { type: 'BAD_USER_INPUT', text: 'Unknown role: {name}' },
  // API keys
  API_KEY_CREATE_EXPIRY_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'The validity must be at least one day (expiresInDays ≥ 1).',
  },
  API_KEY_DOES_NOT_EXIST: { type: 'BAD_USER_INPUT', text: 'API key not found' },
  API_KEYS_FEATURE_DISABLED: { type: 'FORBIDDEN', text: 'API keys are not enabled' },
  API_KEY_CREATE_LIMIT_REACHED: {
    type: 'BAD_USER_INPUT',
    text: 'Maximum of {max} active API keys reached',
  },
  // chat & video calls
  CHAT_GROUP_ROOM_NOT_CREATED: {
    type: 'FORBIDDEN',
    text: 'Could not create group room. User may not be a member of the group.',
  },
  VIDEO_CALL_GROUP_MEMBERSHIP_NOT_FOUND: {
    type: 'FORBIDDEN',
    text: 'No active membership in this group found for the video call: not a member, membership still pending, or the group does not exist.',
  },
  CHAT_MESSAGE_CONTENT_MISSING: {
    type: 'BAD_USER_INPUT',
    text: 'Message must have content or files',
  },
  CHAT_ROOM_PARTNER_IS_SELF: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot create a chat with yourself.',
  },
  VIDEO_CALL_START_NOT_PERMITTED: {
    type: 'FORBIDDEN',
    text: 'You may not start a video call in this group.',
  },
  VIDEO_CALL_FEATURE_DISABLED: { type: 'FORBIDDEN', text: 'Video calls are disabled.' },
} as const satisfies Record<string, ErrorDefinition>

export type ErrorName = keyof typeof definitions

export type RegisteredError<Name extends ErrorName = ErrorName> = (typeof definitions)[Name] & {
  code: Name
}

// The code is the key itself, so it is written exactly once.
export const Errors = Object.fromEntries(
  Object.entries(definitions).map(([code, definition]) => [code, { code, ...definition }]),
) as { [Name in ErrorName]: RegisteredError<Name> }
