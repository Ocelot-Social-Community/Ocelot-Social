/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { getNeode } from '@db/neo4j'

import Resolver from './helpers/Resolver'

const neode = getNeode()

export default {
  Mutation: {
    CreateSocialMedia: async (_object, params, context, _resolveInfo) => {
      const [user, socialMedia] = await Promise.all([
        neode.find('User', context.user.id),
        neode.create('SocialMedia', params),
      ])
      await socialMedia.relateTo(user, 'ownedBy')
      const response = await socialMedia.toJson()

      return response
    },
    UpdateSocialMedia: async (_object, params, _context, _resolveInfo) => {
      const socialMedia = await neode.find('SocialMedia', params.id)
      await socialMedia.update({ url: params.url })
      const response = await socialMedia.toJson()

      return response
    },
    DeleteSocialMedia: async (_object, { id }, _context, _resolveInfo) => {
      const socialMedia = await neode.find('SocialMedia', id)
      if (!socialMedia) return null
      await socialMedia.delete()
      return socialMedia.toJson()
    },
  },
  SocialMedia: Resolver('SocialMedia', {
    idAttribute: 'url',
    hasOne: {
      ownedBy: '-[:OWNED_BY]->(related:User)',
    },
  }),
}
