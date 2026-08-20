import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME, SLUG } from './patterns'

/**
 * Transcribed from db/models/Group.ts.
 *
 * `showMembers` is not in the model but sits on one seeded node — see the note in
 * entities/README-drift.md. Declared so the read path does not reject it.
 */
export const Group = defineEntity({
  label: 'Group',
  properties: {
    id: { type: 'string' },
    name: { type: 'string', minLength: 3 },
    slug: { type: 'string', pattern: SLUG },
    about: { type: ['string', 'null'] },
    description: { type: 'string' },
    descriptionExcerpt: { type: ['string', 'null'] },
    groupType: { type: 'string', enum: ['public', 'closed', 'hidden'] },
    actionRadius: { type: 'string' },
    locationName: { type: ['string', 'null'] },
    showMembers: { type: 'boolean' },
    deleted: { type: 'boolean' },
    disabled: { type: 'boolean' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'name', 'slug', 'groupType', 'createdAt', 'updatedAt'],
  unique: ['id', 'slug'],
  fulltext: [
    { name: 'group_fulltext_search', properties: ['name', 'slug', 'about', 'description'] },
  ],
})
