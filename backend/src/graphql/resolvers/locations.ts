/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import cypherFields from './helpers/cypherField'
import { queryLocations } from './users/location'

import type { Context } from '@src/context'

export default {
  Location: {
    // Verbatim from the @cypher directives in Location.gql. `name` takes a `lang` argument,
    // which cypherFields passes through as a query parameter, so the localisation fallback
    // chain (requested lang → instance default → raw name → id) is unchanged.
    ...cypherFields('Location', {
      name: {
        // The node's own `name` is the untranslated one, so the pass-through must not win.
        always: true,
        // `lang` defaults to "" in the SDL (Location.gql). Repeat it here: a resolver
        // invoked outside a GraphQL field selection gets no arguments, and a missing
        // Cypher parameter is a hard error rather than a null.
        defaults: { lang: '' },
        statement: `
          RETURN COALESCE(
            CASE WHEN $lang <> '' THEN this['name' + toUpper($lang)] END,
            this['name' + $cypherParams.languageDefault],
            this.name,
            this.nameEN,
            this.id
          )
        `,
      },
      parent: 'MATCH (this)-[:IS_IN]->(l:Location) RETURN l',
    }),
    distanceToMe: async (parent, _params, context: Context, _resolveInfo) => {
      if (!parent.id) {
        throw new Error('Can not identify selected Location!')
      }
      const session = context.driver.session()

      const query = session.readTransaction(async (transaction) => {
        const result = await transaction.run(
          `
            MATCH (loc:Location {id: $parent.id})
            WHERE loc.lat IS NOT NULL AND loc.lng IS NOT NULL
            MATCH (me:User {id: $user.id})-[:IS_IN]->(meLoc:Location)
            WHERE meLoc.lat IS NOT NULL AND meLoc.lng IS NOT NULL
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
    // No try/catch translating failures into UserInputError any more. It could not run: this
    // RETURNED the promise instead of awaiting it, so a rejection from the async
    // queryLocations passed straight by the catch. And what it would have caught is not client
    // input either — with `place: String!` and `lang: String!` pinned by the schema, the only
    // failures left are a Mapbox outage or the 3s request timeout, which are internal errors and
    // must not be reported to the client as "your input was wrong".
    queryLocations: async (_object, args, context: Context, _resolveInfo) =>
      queryLocations(args, context),
  },
}
