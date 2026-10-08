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
//   The compiler requires a throw site to pass exactly the placeholders.
//
// Thrown as `throw new AppError(Errors.API_KEYS_FEATURE_DISABLED)` (see errors.ts).
export type ErrorType = 'BAD_USER_INPUT' | 'FORBIDDEN' | 'UNAUTHENTICATED'

interface ErrorDefinition {
  type: ErrorType
  text: string
}

const definitions = {
  // authentication & account
  // graphql-shield's answer to every denied permission rule.
  PERMISSION_RULE_ACCESS_DENIED: {
    type: 'UNAUTHENTICATED',
    text: 'Not Authorized!',
  },
  LOGIN_ACCOUNT_DISABLED: { type: 'UNAUTHENTICATED', text: 'Your account has been disabled.' },
  LOGIN_CREDENTIALS_INCORRECT: {
    type: 'UNAUTHENTICATED',
    text: 'Incorrect email address or password.',
  },
  PASSWORD_CHANGE_OLD_PASSWORD_INCORRECT: {
    type: 'BAD_USER_INPUT',
    text: 'Old password is not correct.',
  },
  PASSWORD_CHANGE_NEW_PASSWORD_EQUALS_OLD: {
    type: 'BAD_USER_INPUT',
    text: 'Old password and new password should be different.',
  },
  // e-mail & registration
  EMAIL_CHANGE_ADDRESS_ALREADY_IN_USE: {
    type: 'BAD_USER_INPUT',
    text: 'A user account with this email already exists.',
  },
  EMAIL_CHANGE_ADDRESS_INVALID: { type: 'BAD_USER_INPUT', text: 'Must be a valid email.' },
  EMAIL_CHANGE_CONFIRMATION_CODE_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Invalid nonce or no email address found.',
  },
  REGISTRATION_CONFIRMATION_CODE_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Invalid email or nonce.',
  },
  REGISTRATION_USER_SLUG_ALREADY_TAKEN: {
    type: 'BAD_USER_INPUT',
    text: 'User with this slug already exists.',
  },
  // users & badges
  USER_ADMIN_SEARCH_NOT_PERMITTED: {
    type: 'FORBIDDEN',
    text: 'You are not allowed to search the user administration.',
  },
  USER_DOES_NOT_EXIST: { type: 'BAD_USER_INPUT', text: 'Could not find user.' },
  USER_UNBLOCK_USER_NOT_BLOCKED: { type: 'BAD_USER_INPUT', text: 'Could not find blocked user.' },
  USER_PROFILE_NAME_TOO_SHORT: {
    type: 'BAD_USER_INPUT',
    text: 'The name must be at least {min} characters long.',
  },
  BADGE_SELECTION_BADGE_NOT_REWARDED: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot set badges not rewarded to you.',
  },
  // groups
  // The groups feature is switched off network-wide; nothing group-related is reachable.
  GROUPS_FEATURE_DISABLED: { type: 'FORBIDDEN', text: 'Groups are not enabled.' },
  GROUP_SAVE_DESCRIPTION_TOO_SHORT: {
    type: 'BAD_USER_INPUT',
    text: 'Description too short (at least {min} characters).',
  },
  // A query selected a computed Group field (myRole, postsCount, …) without the group's id.
  GROUP_FIELD_GROUP_ID_MISSING: {
    type: 'BAD_USER_INPUT',
    text: 'Can not identify selected Group.',
  },
  GROUP_SAVE_SLUG_ALREADY_TAKEN: {
    type: 'BAD_USER_INPUT',
    text: 'Group with this slug already exists.',
  },
  GROUP_SAVE_TOO_FEW_CATEGORIES: {
    type: 'BAD_USER_INPUT',
    text: 'Too few categories (at least {min}).',
  },
  GROUP_SAVE_TOO_MANY_CATEGORIES: {
    type: 'BAD_USER_INPUT',
    text: 'Too many categories (at most {max}).',
  },
  GROUP_MEMBERSHIP_USER_NOT_A_MEMBER: {
    type: 'BAD_USER_INPUT',
    text: 'User is not a member of this group.',
  },
  GROUP_MEMBERSHIP_USER_OR_GROUP_NOT_FOUND: {
    type: 'BAD_USER_INPUT',
    text: 'Could not find user or group!',
  },
  GROUP_RIGHTS_GROUP_NOT_FOUND: { type: 'BAD_USER_INPUT', text: 'Group not found!' },
  // Making a group more private is the same act as creating it that private: the network right
  // group.create_<visibility> caps both ways there — the visibility switch and the rights editor.
  GROUP_VISIBILITY_RAISE_NOT_PERMITTED: {
    type: 'FORBIDDEN',
    text: 'You cannot make this group more private than you may create one!',
  },
  GROUP_SAVE_MEMBER_LIST_UNAVAILABLE: {
    type: 'BAD_USER_INPUT',
    text: 'A group outsiders cannot find has no member list to open.',
  },
  GROUP_POST_REMOVE_POST_NOT_IN_GROUP: {
    type: 'BAD_USER_INPUT',
    text: 'That post is not in this group!',
  },
  // group roles & templates
  GROUP_ROLE_NAME_UNKNOWN: { type: 'BAD_USER_INPUT', text: 'Unknown group role!' },
  GROUP_ROLE_NAME_INVALID: { type: 'BAD_USER_INPUT', text: 'Invalid role name!' },
  GROUP_ROLE_NAME_RESERVED: {
    type: 'BAD_USER_INPUT',
    text: 'That name belongs to a system role!',
  },
  GROUP_ROLE_NAME_ALREADY_TAKEN: {
    type: 'BAD_USER_INPUT',
    text: 'A role with that name already exists in this group!',
  },
  GROUP_ROLE_LABEL_INVALID: { type: 'BAD_USER_INPUT', text: 'Invalid role label!' },
  GROUP_ROLE_PERMISSIONS_NOT_HELD: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot grant rights you do not hold yourself: {permissions}',
  },
  GROUP_ROLE_OWNER_NOT_EDITABLE: {
    type: 'BAD_USER_INPUT',
    text: 'The owner role holds every right and cannot be edited!',
  },
  GROUP_ROLE_SYSTEM_NOT_RENAMEABLE: {
    type: 'BAD_USER_INPUT',
    text: 'A system role keeps its name; set its label instead!',
  },
  GROUP_ROLE_SYSTEM_NOT_DELETABLE: {
    type: 'BAD_USER_INPUT',
    text: 'A system role cannot be deleted!',
  },
  GROUP_ROLE_REASSIGN_TARGET_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Members must be moved to a different role!',
  },
  // Parked in the shield (#10356); the resolver behind it stays whole.
  GROUP_ROLE_CREATE_NOT_AVAILABLE: {
    type: 'BAD_USER_INPUT',
    text: 'Groups cannot define their own roles yet!',
  },
  GROUP_TEMPLATE_NAME_UNKNOWN: {
    type: 'BAD_USER_INPUT',
    text: "No group role template named '{template}'",
  },
  GROUP_TEMPLATE_ROLE_UNKNOWN: { type: 'BAD_USER_INPUT', text: 'Unknown group role template!' },
  GROUP_TEMPLATE_PERMISSIONS_VISIBILITY_MISMATCH: {
    type: 'BAD_USER_INPUT',
    text: 'These rights would make this template a different visibility than it is named!',
  },
  // acting with network rights inside a group
  GROUP_ELEVATION_REASON_MISSING: { type: 'BAD_USER_INPUT', text: 'A reason is required!' },
  GROUP_ELEVATION_RIGHTS_MISSING: {
    type: 'BAD_USER_INPUT',
    text: 'You hold nothing here beyond reading!',
  },
  // posts, comments & events
  POST_DOES_NOT_EXIST: { type: 'BAD_USER_INPUT', text: 'Could not find post.' },
  COMMENT_SAVE_CONTENT_TOO_SHORT: {
    type: 'BAD_USER_INPUT',
    text: 'The comment must be at least {min} characters long.',
  },
  POST_EVENT_LOCATION_COORDINATES_INCOMPLETE: {
    type: 'BAD_USER_INPUT',
    text: 'Event location requires both lat and lng, or neither.',
  },
  POST_EVENT_LOCATION_LATITUDE_OUT_OF_RANGE: {
    type: 'BAD_USER_INPUT',
    text: 'Event location latitude must be a finite number between -90 and 90.',
  },
  POST_EVENT_LOCATION_LONGITUDE_OUT_OF_RANGE: {
    type: 'BAD_USER_INPUT',
    text: 'Event location longitude must be a finite number between -180 and 180.',
  },
  POST_EVENT_START_DATE_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Event start date must be a valid date.',
  },
  POST_EVENT_START_DATE_NOT_ISO_FORMAT: {
    type: 'BAD_USER_INPUT',
    text: 'Event start date must be in ISO format.',
  },
  POST_EVENT_END_DATE_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Event end date must be a valid date.',
  },
  POST_EVENT_END_DATE_NOT_ISO_FORMAT: {
    type: 'BAD_USER_INPUT',
    text: 'Event end date must be in ISO format.',
  },
  POST_EVENT_END_BEFORE_START: {
    type: 'BAD_USER_INPUT',
    text: 'The end date must be after the start date.',
  },
  POST_EVENT_VENUE_REQUIRED: { type: 'BAD_USER_INPUT', text: 'Event venue must be present.' },
  POST_EVENT_VENUE_LENGTH_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'Event venue must be between {min} and {max} characters long.',
  },
  POST_PIN_FEATURE_DISABLED: { type: 'FORBIDDEN', text: 'Pinned posts are not allowed.' },
  POST_PIN_LIMIT_REACHED: {
    type: 'BAD_USER_INPUT',
    text: 'Maximum number of pinned posts reached. Unpin a post first.',
  },
  POST_SAVE_SLUG_ALREADY_TAKEN: {
    type: 'BAD_USER_INPUT',
    text: 'Post with this slug already exists.',
  },
  // locations
  // A query selected Location.distanceToMe without the location's id.
  LOCATION_FIELD_LOCATION_ID_MISSING: {
    type: 'BAD_USER_INPUT',
    text: 'Can not identify selected Location.',
  },
  LOCATION_COORDINATES_INCOMPLETE: {
    type: 'BAD_USER_INPUT',
    text: '{entity} location requires both lat and lng, or neither.',
  },
  LOCATION_LATITUDE_OUT_OF_RANGE: {
    type: 'BAD_USER_INPUT',
    text: '{entity} location latitude must be a finite number between -90 and 90.',
  },
  LOCATION_LONGITUDE_OUT_OF_RANGE: {
    type: 'BAD_USER_INPUT',
    text: '{entity} location longitude must be a finite number between -180 and 180.',
  },
  LOCATION_COORDINATES_NOT_RESOLVABLE: {
    type: 'BAD_USER_INPUT',
    text: 'Location coordinates are invalid.',
  },
  LOCATION_NAME_NOT_FOUND: {
    type: 'BAD_USER_INPUT',
    text: 'The locationName is invalid.',
  },
  LOCATION_NAME_NO_EXACT_MATCH: {
    type: 'BAD_USER_INPUT',
    text: 'The locationName is invalid.',
  },
  // moderation
  REPORT_TARGET_IS_OWN: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot report yourself or your own content.',
  },
  REVIEW_TARGET_IS_OWN: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot review a report about yourself or your own content.',
  },
  REVIEW_TARGET_DOES_NOT_EXIST: {
    type: 'BAD_USER_INPUT',
    text: 'Resource not found or is not a Post|Comment|User.',
  },
  REVIEW_TARGET_NOT_REPORTED: {
    type: 'BAD_USER_INPUT',
    text: 'Before starting the review process, please report the {label}.',
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
  ROLE_SAVE_NAME_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'The role name must be 2 to 50 characters long, contain only letters, digits, _ and -, and start with a letter or digit.',
  },
  ROLE_DOES_NOT_EXIST: { type: 'BAD_USER_INPUT', text: 'Unknown role: {name}.' },
  ROLE_EDIT_ROLE_PROTECTED: {
    type: 'FORBIDDEN',
    text: "Role '{name}' is protected and cannot be edited.",
  },
  ROLE_SAVE_PROTECTED_FLAG_NOT_ALLOWED: {
    type: 'FORBIDDEN',
    text: 'Cannot create or flag a protected role.',
  },
  ROLE_RENAME_SYSTEM_ROLE: {
    type: 'FORBIDDEN',
    text: "Role '{name}' is a system role and cannot be renamed.",
  },
  ROLE_DELETE_SYSTEM_ROLE: {
    type: 'FORBIDDEN',
    text: "Role '{name}' is a system role and cannot be deleted.",
  },
  ROLE_DELETE_ROLE_HAS_MEMBERS: {
    type: 'FORBIDDEN',
    text: "Role '{name}' is assigned to {count} user(s) and cannot be deleted.",
  },
  // API keys
  API_KEY_CREATE_EXPIRY_INVALID: {
    type: 'BAD_USER_INPUT',
    text: 'The validity must be at least one day (expiresInDays ≥ 1).',
  },
  API_KEY_DOES_NOT_EXIST: { type: 'BAD_USER_INPUT', text: 'API key not found.' },
  API_KEYS_FEATURE_DISABLED: { type: 'FORBIDDEN', text: 'API keys are not enabled.' },
  API_KEY_CREATE_LIMIT_REACHED: {
    type: 'BAD_USER_INPUT',
    text: 'Maximum of {max} active API keys reached.',
  },
  // invite codes
  INVITE_CODE_CREATE_GROUP_MEMBERSHIP_REQUIRED: {
    type: 'FORBIDDEN',
    text: 'You must be a member of this group to create an invite link for it.',
  },
  INVITE_CODE_INVALIDATE_CODE_NOT_FOUND: {
    type: 'FORBIDDEN',
    text: 'Invite link not found.',
  },
  INVITE_CODE_CREATE_LIMIT_REACHED: {
    type: 'BAD_USER_INPUT',
    text: 'You have reached the maximum of invite codes you can generate.',
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
    text: 'Message must have content or files.',
  },
  CHAT_ROOM_PARTNER_IS_SELF: {
    type: 'BAD_USER_INPUT',
    text: 'You cannot create a chat with yourself.',
  },
  VIDEO_CALL_START_NOT_PERMITTED: {
    type: 'FORBIDDEN',
    text: 'You may not start a video call in this group.',
  },
} as const satisfies Record<string, ErrorDefinition>

export type ErrorName = keyof typeof definitions

export type RegisteredError<Name extends ErrorName = ErrorName> = (typeof definitions)[Name] & {
  code: Name
}

// The code is the key itself, so it is written exactly once.
export const Errors = Object.fromEntries(
  Object.entries(definitions).map(([code, definition]) => [code, { code, ...definition }]),
) as { [Name in ErrorName]: RegisteredError<Name> }
