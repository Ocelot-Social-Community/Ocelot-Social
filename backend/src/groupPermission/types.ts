// Hand-maintained type definitions for the GROUP permission catalog.
// Must stay in sync with ./groupPermission.catalog.json — the JSON is the single
// source of truth; these unions are hand-mirrors of it (drift-guard tests in
// ./schema.spec.ts assert the two match), mirroring the discipline of the network
// catalog in ../permission/types.ts. The hand-unions exist so the shield gets
// compile-time typo checking on hasGroupPermission('…') call sites.

import type { PermissionKey } from '@src/permission'

// A group permission key names a single capability INSIDE one group and a real
// enforcement point in the GraphQL shield. Same dotted/namespaced shape as the
// network keys, and equally not a valid GraphQL enum value — so these travel the
// API as String + catalog-validated.
export type GroupPermissionKey =
  | 'group.read'
  | 'group.content.read'
  | 'group.members.read'
  | 'group.post.create'
  | 'group.comment.create'
  | 'group.post.pin'
  | 'group.post.moderate'
  | 'group.join'
  | 'group.join.request'
  | 'group.leave'
  | 'group.member.remove'
  | 'group.member.role.assign'
  | 'group.invite'
  | 'group.invite.external'
  | 'group.settings.manage'
  | 'group.role.manage'
  | 'group.chat.read'
  | 'group.chat.write'
  | 'group.videoCall.create'
  | 'group.videoCall.join'

// Grouping for the group's rights UI. Open string (the JSON is the source of
// truth); the known groups today are 'visibility' | 'content' | 'moderation'
// | 'membership' | 'administration' | 'communication'.
export type GroupPermissionGroup = string

// Additional runtime feature gates, on top of the `groupsEnabled` policy that gates
// EVERY group permission. That one is applied in code (see ./gates.ts) rather than
// repeated in all twenty entries: a catalog-wide truth cannot drift when it has only
// one place. Every value here must be a valid (boolean) PolicyKey; the union is the
// compile-time mirror of the catalog's `gatedBy` values, drift-guarded in
// ./schema.spec.ts.
export type GroupPermissionGate = 'videoConference' | 'inviteRegistration'

// The policy that gates the group feature as a whole, and with it every key in this
// catalog. Named once here so gates.ts and the tests cannot disagree about it.
export const GROUPS_ENABLED_GATE = 'groupsEnabled'

// The hard cap (concept E3): where a group capability also exists network-wide, the
// group right is only effective while the user ALSO holds the network right. A '<door>'
// placeholder is substituted with whether the group's call can be walked into — see
// ./prerequisites.ts — which is how the flat family videoCall.create_* is addressed
// without repeating it here.
export type NetworkPrerequisiteTemplate = PermissionKey | `${string}<door>`

export interface GroupPermissionCatalogEntry {
  group: GroupPermissionGroup
  // An optional runtime feature gate beyond groupsEnabled; the permission is only effective
  // while it is open. ONE gate, where the network catalog takes a list: no group capability
  // needs two, and `groupsEnabled` — the one every key has — is applied in code rather than
  // repeated here. gatesFor() in ./schema.ts still answers in list form, because that is what
  // the gate check and the API field consume.
  gatedBy?: GroupPermissionGate
  // Optional network permission that must ALSO be held, possibly type-dependent.
  requiresNetworkPermission?: NetworkPrerequisiteTemplate
  description: string
}
