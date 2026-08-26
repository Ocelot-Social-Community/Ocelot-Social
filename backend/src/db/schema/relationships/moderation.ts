import { Report } from '@db/schema/entities/Report'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import { createdAt, timestamps } from './timestamps'

// Reports filed against content and the decisions taken on them.

export const FILED = defineRelationship({
  type: 'FILED',
  from: User,
  to: Report,
  cardinality: 'many',
  properties: {
    createdAt,
    resourceId: { type: 'string' },
    reasonCategory: {
      type: 'string',
      enum: [
        'other',
        'discrimination_etc',
        'pornographic_content_links',
        'glorific_trivia_of_cruel_inhuman_acts',
        'doxing',
        'intentional_intimidation_stalking_persecution',
        'advert_products_services_commercial',
        'criminal_behavior_violation_german_law',
      ],
    },
    reasonDescription: { type: ['string', 'null'] },
  },
  required: ['createdAt', 'resourceId', 'reasonCategory'],
})

export const REVIEWED = defineRelationship({
  type: 'REVIEWED',
  from: User,
  to: Report,
  cardinality: 'many',
  properties: { ...timestamps, disable: { type: 'boolean' }, closed: { type: 'boolean' } },
  required: ['createdAt', 'disable', 'closed'],
})
