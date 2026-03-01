/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/return-await */
import { UserInputError } from '@graphql/errors'

import CONFIG from '@src/config'

import { queryLocations } from './users/location'

import type { Context } from '@src/context'

export default {
  Location: {
    name: (parent, { lang }) => {
      if (lang) {
        const field = `name${lang.toUpperCase()}`
        if (parent[field]) return parent[field]
      }
      const defaultField = `name${CONFIG.LANGUAGE_DEFAULT.toUpperCase()}`
      if (parent[defaultField]) return parent[defaultField]
      return parent.name || parent.nameEN || parent.id
    },
    distanceToMe: async (parent, _params, context: Context, _resolveInfo) => {
      if (!parent.id) {
        throw new Error('Can not identify selected Location!')
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
        return queryLocations(args, context)
      } catch (e) {
        throw new UserInputError(e.message)
      }
    },
  },
}
