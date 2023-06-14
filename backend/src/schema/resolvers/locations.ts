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
    queryLocations: async (object, args, context, resolveInfo) => {
      try {
        return queryLocations(args)
      } catch (e) {
        throw new UserInputError(e.message)
      }
    },
  },
}
