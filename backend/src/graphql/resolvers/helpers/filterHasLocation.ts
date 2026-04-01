import { mergeWith, isArray } from 'lodash'

import type { Context } from '@src/context'

interface FilterParams {
  filter?: {
    hasLocation?: boolean
    id_in?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

const ALLOWED_LABELS = ['User', 'Post'] as const
type AllowedLabel = (typeof ALLOWED_LABELS)[number]

const getIdsWithLocation = async (context: Context, label: AllowedLabel): Promise<string[]> => {
  const session = context.driver.session()
  try {
    const result = await session.readTransaction(async (transaction) => {
      const cypher = `
        MATCH (n:${label})-[:IS_IN]->(l:Location)
        RETURN collect(n.id) AS ids`
      const response = await transaction.run(cypher)
      return response.records.map((record) => record.get('ids') as string[])
    })
    const [ids] = result
    return ids
  } finally {
    await session.close()
  }
}

export const filterUsersHasLocation = async (
  params: FilterParams,
  context: Context,
): Promise<FilterParams> => {
  if (!params.filter?.hasLocation) return params
  delete params.filter.hasLocation
  const userIds = await getIdsWithLocation(context, 'User')
  params.filter = mergeWith(
    params.filter,
    { id_in: userIds },
    (objValue: unknown, srcValue: unknown) => {
      if (isArray(objValue)) {
        return (objValue as unknown[]).concat(srcValue)
      }
    },
  )
  return params
}

export const filterPostsHasLocation = async (
  params: FilterParams,
  context: Context,
): Promise<FilterParams> => {
  if (!params.filter?.hasLocation) return params
  delete params.filter.hasLocation
  const postIds = await getIdsWithLocation(context, 'Post')
  params.filter = mergeWith(
    params.filter,
    { id_in: postIds },
    (objValue: unknown, srcValue: unknown) => {
      if (isArray(objValue)) {
        return (objValue as unknown[]).concat(srcValue)
      }
    },
  )
  return params
}
