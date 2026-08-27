import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/** Transcribed from db/models/Category.ts. */
export const Category = defineEntity({
  label: 'Category',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    icon: { type: 'string' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'name', 'slug', 'icon', 'createdAt'],
  unique: ['id', 'slug'],
})
