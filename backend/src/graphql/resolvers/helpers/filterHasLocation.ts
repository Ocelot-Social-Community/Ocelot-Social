import { mergeWith, isArray } from 'lodash'

import type { Context } from '@src/context'

const getIdsWithLocation = async (context: Context, label: string): Promise<string[]> => {
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

export const filterUsersHasLocation = async (params, context: Context) => {
  if (!params.filter?.hasLocation) return params
  delete params.filter.hasLocation
  const userIds = await getIdsWithLocation(context, 'User')
  params.filter = mergeWith(params.filter, { id_in: userIds }, (objValue, srcValue) => {
    if (isArray(objValue)) {
      return objValue.concat(srcValue)
    }
  })
  return params
}

export const filterPostsHasLocation = async (params, context: Context) => {
  if (!params.filter?.hasLocation) return params
  delete params.filter.hasLocation
  const postIds = await getIdsWithLocation(context, 'Post')
  params.filter = mergeWith(params.filter, { id_in: postIds }, (objValue, srcValue) => {
    if (isArray(objValue)) {
      return objValue.concat(srcValue)
    }
  })
  return params
}
