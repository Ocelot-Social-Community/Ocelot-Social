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
  | 'group.join'
  | 'group.join.request'
  | 'group.leave'
  | 'group.member.approve'
  | 'group.member.remove'
  | 'group.member.role.assign'
  | 'group.invite'
  | 'group.invite.external'
  | 'group.settings.manage'
  | 'group.type.change'
  | 'group.role.manage'
  | 'group.chat.participate'
  | 'group.videoCall.create'
  | 'group.videoCall.join'

// Grouping for the group's rights UI. Open string (the JSON is the source of
// truth); the known groups today are 'visibility' | 'content' | 'membership'
// | 'administration' | 'communication'.
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
// group right is only effective while the user ALSO holds the network right. A
// '<type>' placeholder is substituted with the group's groupType — see
// ./prerequisites.ts — which is how the flat per-type families group.create_* and
// videoCall.create_* are addressed without repeating them per type here.
export type NetworkPrerequisiteTemplate = PermissionKey | `${string}<type>`

export interface GroupPermissionCatalogEntry {
  group: GroupPermissionGroup
  // Optional runtime feature gate(s) beyond groupsEnabled; the permission is only
  // effective while every listed gate is open. A single string is shorthand for a
  // one-element list. Normalised via gatesFor() in ./schema.ts.
  gatedBy?: GroupPermissionGate | GroupPermissionGate[]
  // Optional network permission that must ALSO be held, possibly type-dependent.
  requiresNetworkPermission?: NetworkPrerequisiteTemplate
  description: string
}
