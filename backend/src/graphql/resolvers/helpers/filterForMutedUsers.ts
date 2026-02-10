/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mergeWith, isArray } from 'lodash'

import { getMutedUsers } from '@graphql/resolvers/users'

export const filterForMutedUsers = async (params, context) => {
  if (!context.user) return params
  // Skip mute filter for single post lookups (direct navigation by id or slug)
  if (params.id || params.slug) return params
  const [mutedUsers] = await Promise.all([getMutedUsers(context)])
  const mutedUsersIds = [...mutedUsers.map((user) => user.id)]
  if (!mutedUsersIds.length) return params

  params.filter = mergeWith(
    params.filter,
    {
      author_not: { id_in: mutedUsersIds },
    },
    (objValue, srcValue) => {
      if (isArray(objValue)) {
        return objValue.concat(srcValue)
      }
    },
  )
  return params
}
