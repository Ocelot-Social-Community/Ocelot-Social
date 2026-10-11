import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * A role definition owned by ONE group — the group-scoped counterpart of `Role`.
 *
 * `id` is `<groupId>:<name>`, which is what encodes "a role name is unique WITHIN a group"
 * as a database constraint; `groupId` and `name` are kept as their own properties so the
 * hot lookup (a member's role in a group) can index on them instead of parsing the id.
 *
 * `name` is the internal key the membership edge points at (`MEMBER_OF.role`) and the one
 * thing that never changes for a system role. `label` is the group's display name for it,
 * or null for the translated default.
 *
 * `permissions` is a JSON-stringified list, the same trade-off `Role.permissions` and
 * `Setting.value` make: a scalar property keeps the declaration (and the validation) simple.
 */
export const GroupRole = defineEntity({
  label: 'GroupRole',
  properties: {
    id: { type: 'string', description: '<groupId>:<name>' },
    groupId: { type: 'string' },
    name: { type: 'string' },
    label: { type: ['string', 'null'], description: 'display name, null ⇒ i18n default' },
    system: { type: 'boolean', description: 'code behaviour depends on it: none, pending, owner' },
    protected: { type: 'boolean', description: 'only owner: resolves to the full catalog' },
    permissions: { type: 'string', description: 'JSON-encoded string[]' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedBy: { type: ['string', 'null'] },
  },
  required: [
    'id',
    'groupId',
    'name',
    'system',
    'protected',
    'permissions',
    'createdAt',
    'updatedAt',
  ],
  unique: ['id'],
  indexed: ['groupId', 'name'],
})
