// Hand-maintained type definitions for the permission catalog.
// Must stay in sync with ./permission.catalog.json — the JSON is the single
// source of truth; this union is a hand-mirror of it (a drift-guard test in
// ./schema.spec.ts asserts the two match, mirroring the policy types/schema
// discipline). The hand-union exists so the shield gets compile-time typo
// checking on hasPermission('…') call sites.

// A permission key names a single global capability and a real enforcement point
// in the GraphQL shield. Keys are dotted/namespaced (resource.action) — readable
// and scope-friendly (they double as the OAuth scope vocabulary later), but NOT
// valid GraphQL enum values, so they travel the API as String + catalog-validated.
export type PermissionKey =
  | 'network.statistics.read'
  | 'role.manage'
  | 'policy.manage'
  | 'donation.manage'
  | 'apiKey.administer'
  | 'user.email.readAny'
  | 'user.delete.any'
  | 'badge.manage'
  | 'content.moderate'
  | 'user.disable'
  | 'post.pin'
  | 'post.push'
  | 'post.create'
  | 'comment.create'
  | 'socialMedia.create'
  | 'group.create_public'
  | 'group.create_closed'
  | 'group.create_hidden'
  | 'user.invite'
  | 'videoCall.create_public'
  | 'videoCall.create_closed'
  | 'videoCall.create_hidden'
  | 'apiKey.create'

// Grouping for the admin UI. Open string (the JSON is the source of truth); the
// known groups today are 'administration' | 'moderation' | 'content' | 'membership'
// | 'communication' | 'account'.
export type PermissionGroup = string

// A permission may be gated by a runtime feature toggle: the right exists in the
// catalog and can be bundled into roles, but is only *effective* while its gate is
// open. A gate names the POLICY key that switches it on — see ./gates.ts. Roles thus
// depend only on policy; any env dependency lives inside the policy's effective value
// (e.g. 'videoConference' declares requiresEnv for the LiveKit secrets). Every gate key
// must be a valid (boolean) PolicyKey. This union is the compile-time mirror of the
// catalog's `gatedBy` values — drift-guarded against allPermissionGates() in schema.spec.ts.
export type PermissionGate =
  | 'videoConference'
  | 'apiKeysEnabled'
  | 'badgesEnabled'
  | 'socialMediaEnabled'
  | 'inviteRegistration'

export interface PermissionCatalogEntry {
  group: PermissionGroup
  // Optional runtime feature gate; when set, the permission is only effective while
  // the gate is open. Absent ⇒ always effective.
  gatedBy?: PermissionGate
  description: string
}
