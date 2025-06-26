/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { UserInputError } from 'apollo-server'

import type { Context } from '@src/server'

import Resolver from './helpers/Resolver'
import { queryLocations } from './users/location'

export default {
  Location: {
    ...Resolver('Location', {
      undefinedToNull: [
        'nameEN',
        'nameDE',
        'nameFR',
        'nameNL',
        'nameIT',
        'nameES',
        'namePT',
        'namePL',
        'nameRU',
      ],
    }),
    distanceToMe: async (parent, _params, context, _resolveInfo) => {
      if (!parent.id) {
        throw new UserInputError('Can not identify selected Location!')
      }
      const session = context.driver.session()

      const query = session.readTransaction(async (transaction) => {
        const result = await transaction.run(
          `
            MATCH (loc:Location {id: $parent.id})
            MATCH (me:User {id: $user.id})-[:IS_IN]->(meLoc:Location)
            WITH
              point({latitude: loc.lat, longitude: loc.lng}) as locPoint,
              point({latitude: meLoc.lat, longitude: meLoc.lng}) as mePoint
            RETURN round(point.distance(locPoint, mePoint) / 1000) as distance
          `,
          { parent, user: context.user },
        )

        return result.records.map((record) => record.get('distance'))[0]
      })

      try {
        return await query
      } finally {
        await session.close()
      }
    },
  },
  Query: {
    queryLocations: async (_object, args, context: Context, _resolveInfo) => {
      try {
        return queryLocations(args)
      } catch (e) {
        context.logger.error('queryLocations', e)
        throw new Error(e.message)
      }
    },
  },
}
