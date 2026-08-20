import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME, SLUG } from './patterns'

/**
 * Transcribed from db/models/User.ts. Two deliberate differences from that model:
 *
 * 1. No `role` property. db/types/User.ts declares one; it does not exist since the single
 *    role edge replaced it — the role comes from (:User)-[:HAS_ROLE]->(:Role). That drift
 *    is the reason this file exists.
 * 2. `required` lists what a node ACTUALLY always carries, not what neode's Joi would like.
 *    neode marks only `updatedAt` as required, but validates nothing on nodes written by raw
 *    Cypher — which is most of them. Whether the claims below hold for existing data is what
 *    the audit queries answer (concept stage P3); they are declared first so the audit has
 *    something to check.
 */
export const User = defineEntity({
  label: 'User',
  properties: {
    id: { type: 'string' },
    actorId: { type: ['string', 'null'] },
    name: { type: 'string', minLength: 3 },
    slug: { type: 'string', pattern: SLUG },
    encryptedPassword: { type: 'string' },
    deleted: { type: 'boolean' },
    disabled: { type: 'boolean' },
    publicKey: { type: ['string', 'null'] },
    privateKey: { type: ['string', 'null'] },
    wasInvited: { type: 'boolean' },
    wasSeeded: { type: 'boolean' },
    locationName: { type: ['string', 'null'] },
    about: { type: ['string', 'null'] },
    lastActiveAt: { type: 'string', pattern: ISO_DATE_TIME },
    lastOnlineStatus: { type: 'string' },
    awaySince: { type: 'string', pattern: ISO_DATE_TIME },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
    termsAndConditionsAgreedVersion: { type: ['string', 'null'] },
    termsAndConditionsAgreedAt: { type: ['string', 'null'] },
    allowEmbedIframes: { type: 'boolean' },
    showShoutsPublicly: { type: 'boolean' },
    locale: { type: ['string', 'null'] },

    emailNotificationsCommentOnObservedPost: { type: 'boolean' },
    emailNotificationsMention: { type: 'boolean' },
    emailNotificationsChatMessage: { type: 'boolean' },
    emailNotificationsGroupMemberJoined: { type: 'boolean' },
    emailNotificationsGroupMemberLeft: { type: 'boolean' },
    emailNotificationsGroupMemberRemoved: { type: 'boolean' },
    emailNotificationsGroupMemberRoleChanged: { type: 'boolean' },
    emailNotificationsFollowingUsers: { type: 'boolean' },
    emailNotificationsPostInGroup: { type: 'boolean' },
  },
  required: ['id', 'name', 'slug', 'createdAt', 'updatedAt'],
  unique: ['id', 'slug'],
  fulltext: [{ name: 'user_fulltext_search', properties: ['name', 'slug'] }],
})
