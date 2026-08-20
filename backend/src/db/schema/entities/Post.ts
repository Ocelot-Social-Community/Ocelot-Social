import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Post.ts.
 *
 * `alsoLabelled: ['Article', 'Event']` replaces `neodeInstance.extend('Post', 'Article', {})`
 * in db/neo4j.ts: posts carry a second label matching their `postType`. Without declaring it,
 * the drift check (concept stage P3) would report every `(:Post:Article)` node as an unknown
 * label.
 *
 * `pinned` and `groupPinned` are `true`-or-absent, never `false` — the model spells that as
 * `valid: [null, true]`. Kept as declared rather than normalised to a boolean, because the
 * filters query them with `IS NOT NULL`.
 */
export const Post = defineEntity({
  label: 'Post',
  alsoLabelled: ['Article', 'Event'],
  properties: {
    id: { type: 'string' },
    activityId: { type: ['string', 'null'] },
    objectId: { type: ['string', 'null'] },
    title: { type: 'string', minLength: 3 },
    slug: { type: ['string', 'null'] },
    content: { type: 'string', minLength: 3 },
    deleted: { type: 'boolean' },
    disabled: { type: 'boolean' },
    clickedCount: { type: 'integer', minimum: 0 },
    viewedTeaserCount: { type: 'integer', minimum: 0 },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
    sortDate: { type: 'string', pattern: ISO_DATE_TIME },
    language: { type: ['string', 'null'] },
    pinned: { type: ['boolean', 'null'], enum: [true, null] },
    groupPinned: { type: ['boolean', 'null'], enum: [true, null] },
    postType: { type: 'string', enum: ['Article', 'Event'] },
  },
  required: ['id', 'title', 'content', 'postType', 'createdAt', 'updatedAt'],
  unique: ['slug'],
  fulltext: [{ name: 'post_fulltext_search', properties: ['title', 'content'] }],
})
