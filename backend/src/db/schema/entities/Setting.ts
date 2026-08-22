import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Setting.ts. Generic runtime settings store; uniqueness of
 * (namespace, key) is encoded in `id` = `<namespace>.<key>`.
 *
 * The `namespace` index the model asks for does NOT exist in the database: neode reads the
 * index flag from `index`, not `indexed`, so the statement was never generated. This
 * declaration emits it (see derive/ddl.ts).
 */
export const Setting = defineEntity({
  label: 'Setting',
  properties: {
    id: { type: 'string' },
    namespace: { type: 'string' },
    key: { type: 'string' },
    value: { type: 'string', description: 'JSON-encoded value' },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedBy: { type: 'string' },
  },
  required: ['id', 'namespace', 'key', 'value', 'updatedAt'],
  unique: ['id'],
  indexed: ['namespace'],
})
