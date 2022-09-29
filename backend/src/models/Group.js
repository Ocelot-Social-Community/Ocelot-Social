import { v4 as uuid } from 'uuid'

export default {
  id: { type: 'string', primary: true, default: uuid }, // TODO: should be type: 'uuid' but simplified for our tests
  name: { type: 'string', disallow: [null], min: 3 },
  slug: { type: 'string', unique: 'true', regex: /^[a-z0-9_-]+$/, lowercase: true },

  createdAt: {
    type: 'string',
    isoDate: true,
    required: true,
    default: () => new Date().toISOString(),
  },
  updatedAt: {
    type: 'string',
    isoDate: true,
    required: true,
    default: () => new Date().toISOString(),
  },
  deleted: { type: 'boolean', default: false },
  disabled: { type: 'boolean', default: false },

  avatar: {
    type: 'relationship',
    relationship: 'AVATAR_IMAGE',
    target: 'Image',
    direction: 'out',
  },

  about: { type: 'string', allow: [null, ''] },
  groupDescription: { type: 'string', disallow: [null], min: 100 },
  groupDescriptionExcerpt: { type: 'string', allow: [null] },
  groupType: { type: 'string', default: 'public' },
  actionRadius: { type: 'string', default: 'regional' },

  myRole: { type: 'string', default: 'pending' },

  locationName: { type: 'string', allow: [null] },

  isIn: {
    type: 'relationship',
    relationship: 'IS_IN',
    target: 'Location',
    direction: 'out',
  },
}
