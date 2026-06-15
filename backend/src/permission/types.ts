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
  | 'badge.manage'
  | 'content.moderate'
  | 'user.delete.any'
  | 'post.pin'
  | 'post.push'
  | 'post.create'
  | 'comment.create'
  | 'socialMedia.create'
  | 'group.create'
  | 'group.create_hidden'
  | 'user.invite'
  | 'videoCall.create_public'
  | 'videoCall.create_closed'
  | 'videoCall.create_hidden'

// Grouping for the admin UI. Open string (the JSON is the source of truth); the
// known groups today are 'administration' | 'moderation' | 'content' | 'membership'
// | 'communication'.
export type PermissionGroup = string

export interface PermissionCatalogEntry {
  group: PermissionGroup
  description: string
}
