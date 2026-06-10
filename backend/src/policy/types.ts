// Hand-maintained type definitions for the network policy.
// Must stay in sync with ./policy.schema.json — the JSON schema is the single
// source of truth; these types and the GraphQL SDL are hand-mirrors of it.

export interface NetworkPolicy {
  publicRegistration: boolean
  inviteRegistration: boolean
  askForRealName: boolean
  requireLocation: boolean
  categoriesActive: boolean
  badgesEnabled: boolean
  apiKeysEnabled: boolean
  apiKeysMaxPerUser: number
  maxGroupPinnedPosts: number
}

export type PolicyKey = keyof NetworkPolicy

// The value a policy key can hold across all keys (boolean toggles and integer
// limits today; string-typed keys are supported by the schema/service for later).
export type PolicyValue = NetworkPolicy[PolicyKey]

// An audience is a tag that a policy key can be made visible to (via the key's
// "x-visibility" list in the schema) and that a viewer can be a member of.
//
// Well-known audiences:
//   • 'public'        — every viewer, including anonymous (universal membership)
//   • 'authenticated' — any logged-in user
//   • role names      — 'admin', 'moderator', and, in the future, admin-defined
//                       dynamic roles
//
// 'admin' is an implicit superuser: it sees every key and need not be listed on
// one. Visibility is membership-based (set intersection in canView), NOT a
// linear rank — so non-hierarchical / dynamically-created roles slot in without
// touching any call site. The type is intentionally open (string) because the
// full set of audiences is not known at compile time once roles are dynamic.
export type Audience = string

export const PUBLIC_AUDIENCE: Audience = 'public'
export const AUTHENTICATED_AUDIENCE: Audience = 'authenticated'
export const ADMIN_AUDIENCE: Audience = 'admin'
