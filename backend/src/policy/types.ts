// Hand-maintained type definitions for the network policy.
// Must stay in sync with ./policy.schema.json — the JSON schema is the single
// source of truth; these types and the GraphQL SDL are hand-mirrors of it.

// An audience is a tag a policy key can be made visible to (via its "visibility"
// list in the schema) and that a viewer can belong to. There are two auth-state
// audiences plus permission audiences:
//   • 'public'        — every viewer, including anonymous (universal membership)
//   • 'authenticated' — any logged-in user
//   • 'perm:<key>'    — viewers holding that permission (owner/admin via their
//                       effective permission set)
//
// Permission audiences REPLACE the former role-name audiences ('admin'/'moderator'/
// role names): keying on permissions decouples the static, code-owned schema from
// dynamic, admin-managed role names (a rename/delete can no longer silently
// mis-scope a key) and from the legacy `user.role` field. Visibility is membership-
// based (set intersection in canView), never a linear rank. An empty/missing
// visibility list ⇒ admin-only, resolved to 'perm:policy.manage' in audiencesFor.
import { allPermissionKeys } from '@src/permission'

export interface NetworkPolicy {
  publicRegistration: boolean
  inviteRegistration: boolean
  askForRealName: boolean
  requireLocation: boolean
  inviteLinkLimit: number
  inviteCodesPersonalPerUser: number
  inviteCodesGroupPerUser: number
  categoriesActive: boolean
  badgesEnabled: boolean
  socialMediaEnabled: boolean
  groupsEnabled: boolean
  showContentFilterHeaderMenu: boolean
  showContentFilterMasonryGrid: boolean
  showGroupButtonInHeader: boolean
  apiKeysEnabled: boolean
  videoConference: boolean
  apiKeysMaxPerUser: number
  maxPinnedPosts: number
  maxGroupPinnedPosts: number
  // Id of the live baked-in branding (see /branding/manifest.json); '' = framework defaults.
  // A string-typed policy key: switched via setActiveBranding (branding.manage), read by the
  // SSR branding loader; not shown in the generic (boolean/integer) policy editor.
  activeBranding: string
}

export type PolicyKey = keyof NetworkPolicy

// The value a policy key can hold across all keys: boolean toggles, integer limits, and now
// string-typed keys (activeBranding) — the schema/service already supported strings.
export type PolicyValue = NetworkPolicy[PolicyKey]

// Presence state of an env var: set (defined, non-empty), empty (defined but blank), or
// missing. Produced by the PolicyService (envState) and surfaced in the admin config view;
// lives here so config/systemConfig can import it without a config → policy → config cycle.
export type ConfigKeyState = 'set' | 'empty' | 'missing'

export type Audience = string

export const PUBLIC_AUDIENCE: Audience = 'public'
export const AUTHENTICATED_AUDIENCE: Audience = 'authenticated'
export const PERMISSION_AUDIENCE_PREFIX = 'perm:'

// Audiences that may appear in a key's `visibility` list in the schema: the two
// auth-state audiences plus one 'perm:<key>' per catalog permission. Used to
// enum-validate `visibility` at module load, so a typo'd permission audience —
// which would silently match nobody — is rejected rather than mis-scoping a key.
export const KNOWN_AUDIENCES: Audience[] = [
  PUBLIC_AUDIENCE,
  AUTHENTICATED_AUDIENCE,
  ...allPermissionKeys().map((key) => `${PERMISSION_AUDIENCE_PREFIX}${key}`),
]
