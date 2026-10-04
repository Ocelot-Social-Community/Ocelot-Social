import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME, SLUG } from './patterns'

/**
 * Transcribed from db/models/Group.ts.
 *
 * `showMembers` is not in the model but sits on one seeded node — see the note in
 * entities/README-drift.md. Declared so the read path does not reject it. It is also the
 * oldest of the three derived non-member columns (see groupRole/nonMemberAccess.ts): all
 * three mirror what the group's `none` role grants, which is the source of truth.
 */
export const Group = defineEntity({
  label: 'Group',
  properties: {
    id: { type: 'string' },
    name: { type: 'string', minLength: 3 },
    slug: { type: 'string', pattern: SLUG },
    about: { type: ['string', 'null'] },
    description: { type: 'string' },
    template: {
      type: 'string',
      enum: ['public', 'closed', 'hidden'],
      description:
        'which role template this group was created from or last reset to. Stored because nothing derives it — unlike the visibility, which is a function of the two columns below and therefore has no property of its own (groupRole/privacyLevel.ts)',
    },
    actionRadius: { type: 'string' },
    locationName: { type: ['string', 'null'] },
    showMembers: { type: 'boolean' },
    nonMemberRead: {
      type: 'boolean',
      description:
        'derived: the non-member role holds group.read. A column so the group list can decide for many groups in one statement — see groupRole/nonMemberAccess.ts',
    },
    nonMemberContentRead: {
      type: 'boolean',
      description:
        'derived: the non-member role holds group.content.read. A column so the post filter needs no per-row role lookup — see groupRole/nonMemberAccess.ts',
    },
    nonMemberJoin: {
      type: 'boolean',
      description:
        'derived: the non-member role holds group.join. With nonMemberRead it answers whether a stranger can walk into the group, which caps opening a video call — see groupRole/callDoor.ts',
    },
    deleted: { type: 'boolean' },
    disabled: { type: 'boolean' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
    rolesCustomizedAt: {
      type: ['string', 'null'],
      pattern: ISO_DATE_TIME,
      description:
        'when this group first edited its own role definitions; null ⇒ still on the template, which is what the "apply template" admin action selects by',
    },
  },
  required: ['id', 'name', 'slug', 'template', 'createdAt', 'updatedAt'],
  unique: ['id', 'slug'],
  fulltext: [
    { name: 'group_fulltext_search', properties: ['name', 'slug', 'about', 'description'] },
  ],
})
