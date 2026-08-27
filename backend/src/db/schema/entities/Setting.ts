import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Setting.ts. Generic runtime settings store; uniqueness of
 * (namespace, key) is encoded in `id` = `<namespace>.<key>`.
 *
 * The `namespace` index was missing from every running database for years: the neode model
 * asked for it, but neode read the flag from `index` while the model spelled it `indexed`, so
 * the statement was never generated. This declaration emits it (derive/ddl.ts), and
 * `migrate init` has created it since — the drift check reported it as MISSING until then.
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
