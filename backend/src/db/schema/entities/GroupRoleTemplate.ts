import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * The network-wide default role set a newly created group starts from, and what a reset
 * restores — one template per group type, because a closed group starts stricter than a
 * public one.
 *
 * Unlike `GroupRole` these are few and global, so they are cached and cross-instance
 * synced like `Role` and the policy settings. `id` is `<groupType>:<name>`.
 *
 * A template change deliberately does NOT propagate to existing groups (concept E12);
 * the admin action that applies it selects groups whose roles were never customised
 * (`Group.rolesCustomizedAt IS NULL`).
 */
export const GroupRoleTemplate = defineEntity({
  label: 'GroupRoleTemplate',
  properties: {
    id: { type: 'string', description: '<groupType>:<name>' },
    groupType: { type: 'string' },
    name: { type: 'string' },
    label: { type: ['string', 'null'], description: 'display name, null ⇒ i18n default' },
    system: { type: 'boolean' },
    protected: { type: 'boolean' },
    permissions: { type: 'string', description: 'JSON-encoded string[]' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedBy: { type: ['string', 'null'] },
  },
  required: [
    'id',
    'groupType',
    'name',
    'system',
    'protected',
    'permissions',
    'createdAt',
    'updatedAt',
  ],
  unique: ['id'],
  indexed: ['groupType'],
})
