import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * NEW: `Message` has no neode model either — same story as Room. `indexId` is the per-room
 * running number the chat frontend pages by, which is why it carries its own index.
 *
 * `id` carries NO index here and not yet a `unique` either — release 1 of 2. Migration
 * 20260821120000 drops the plain index and creates the uniqueness constraint, because Neo4j
 * 4.4 rejects a constraint while an index on the same label/property exists, and the init
 * container applies this declaration BEFORE any migration runs. Declaring `unique` in the
 * same release would make init emit a statement the server rejects, which `enforce` turns
 * into a failed deployment. It moves here in the next release; until then the drift check
 * reports `constraint Message(id)` as SURPLUS. See the migration for the full reasoning.
 */
export const Message = defineEntity({
  label: 'Message',
  properties: {
    id: { type: 'string' },
    content: { type: 'string' },
    indexId: { type: 'integer', minimum: 0 },
    saved: { type: 'boolean' },
    distributed: { type: 'boolean' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'content', 'indexId', 'saved', 'distributed', 'createdAt'],
  indexed: ['indexId'],
})
