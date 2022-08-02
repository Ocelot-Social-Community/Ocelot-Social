import { v4 as uuid } from 'uuid'

export default {
  id: { type: 'string', primary: true, default: uuid }, // TODO: should be type: 'uuid' but simplified for our tests
  name: { type: 'string', disallow: [null], min: 3 },
  slug: { type: 'string', unique: 'true', regex: /^[a-z0-9_-]+$/, lowercase: true },
  avatar: {
    type: 'relationship',
    relationship: 'AVATAR_IMAGE',
    target: 'Image',
    direction: 'out',
  },
  deleted: { type: 'boolean', default: false },
  disabled: { type: 'boolean', default: false },
  wasSeeded: 'boolean', // Wolle: used or needed?
  locationName: { type: 'string', allow: [null] },
  about: { type: 'string', allow: [null, ''] }, // Wolle: null?
  description: { type: 'string', allow: [null, ''] }, // Wolle: null? HTML with Tiptap, similar to post content
  // Wolle: followedBy: {
  //   type: 'relationship',
  //   relationship: 'FOLLOWS',
  //   target: 'User',
  //   direction: 'in',
  //   properties: {
  //     createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  //   },
  // },
  // Wolle: correct this way?
  members: { type: 'relationship', relationship: 'MEMBERS', target: 'User', direction: 'out' },
  // Wolle: needed? lastActiveAt: { type: 'string', isoDate: true },
  createdAt: {
    type: 'string',
    isoDate: true,
    default: () => new Date().toISOString(),
  },
  updatedAt: {
    type: 'string',
    isoDate: true,
    required: true,
    default: () => new Date().toISOString(),
  },
  // Wolle: emoted: {
  //   type: 'relationships',
  //   relationship: 'EMOTED',
  //   target: 'Post',
  //   direction: 'out',
  //   properties: {
  //     emotion: {
  //       type: 'string',
  //       valid: ['happy', 'cry', 'surprised', 'angry', 'funny'],
  //       invalid: [null],
  //     },
  //   },
  //   eager: true,
  //   cascade: true,
  // },
  // Wolle: blocked: {
  //   type: 'relationship',
  //   relationship: 'BLOCKED',
  //   target: 'User',
  //   direction: 'out',
  //   properties: {
  //     createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  //   },
  // },
  // Wolle: muted: {
  //   type: 'relationship',
  //   relationship: 'MUTED',
  //   target: 'User',
  //   direction: 'out',
  //   properties: {
  //     createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  //   },
  // },
  // Wolle: notifications: {
  //   type: 'relationship',
  //   relationship: 'NOTIFIED',
  //   target: 'User',
  //   direction: 'in',
  // },
  // Wolle inviteCodes: {
  //   type: 'relationship',
  //   relationship: 'GENERATED',
  //   target: 'InviteCode',
  //   direction: 'out',
  // },
  // Wolle: redeemedInviteCode: {
  //   type: 'relationship',
  //   relationship: 'REDEEMED',
  //   target: 'InviteCode',
  //   direction: 'out',
  // },
  // Wolle: shouted: {
  //   type: 'relationship',
  //   relationship: 'SHOUTED',
  //   target: 'Post',
  //   direction: 'out',
  //   properties: {
  //     createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  //   },
  // },
  isIn: {
    type: 'relationship',
    relationship: 'IS_IN',
    target: 'Location',
    direction: 'out',
  },
  // Wolle: pinned: {
  //   type: 'relationship',
  //   relationship: 'PINNED',
  //   target: 'Post',
  //   direction: 'out',
  //   properties: {
  //     createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  //   },
  // },
  // Wolle: showShoutsPublicly: {
  //   type: 'boolean',
  //   default: false,
  // },
  // Wolle: sendNotificationEmails: {
  //   type: 'boolean',
  //   default: true,
  // },
  // Wolle: locale: {
  //   type: 'string',
  //   allow: [null],
  // },
}
