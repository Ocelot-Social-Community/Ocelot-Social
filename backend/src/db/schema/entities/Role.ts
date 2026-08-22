import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Role.ts.
 *
 * `id` IS the role name — uniqueness of the name is encoded there, set by the repository's
 * MERGE. `permissions` is a JSON-stringified list rather than a Neo4j list property, so the
 * declaration stays a scalar one (see the model's comment for why).
 */
export const Role = defineEntity({
  label: 'Role',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    protected: { type: 'boolean' },
    permissions: { type: 'string', description: 'JSON-encoded string[]' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedBy: { type: ['string', 'null'] },
  },
  required: ['id', 'name', 'permissions', 'createdAt', 'updatedAt'],
  unique: ['id'],
  indexed: ['name'],
})
