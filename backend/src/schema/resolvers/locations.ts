/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { UserInputError } from 'apollo-server'

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
  },
  Query: {
    queryLocations: async (_object, args, _context, _resolveInfo) => {
      try {
        return queryLocations(args)
      } catch (e) {
        throw new UserInputError(e.message)
      }
    },
  },
}
