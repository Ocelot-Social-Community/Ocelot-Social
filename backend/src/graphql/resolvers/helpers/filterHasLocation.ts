/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mergeWith, isArray } from 'lodash'

const getIdsWithLocation = async (context, label: string) => {
  const session = context.driver.session()
  try {
    const result = await session.readTransaction(async (transaction) => {
      const cypher = `
        MATCH (n:${label})-[:IS_IN]->(l:Location)
        RETURN collect(n.id) AS ids`
      const response = await transaction.run(cypher)
      return response.records.map((record) => record.get('ids'))
    })
    const [ids] = result
    return ids
  } finally {
    await session.close()
  }
}

export const filterUsersHasLocation = async (params, context) => {
  if (!params.filter?.hasLocation) return params
  delete params.filter.hasLocation
  const userIds = await getIdsWithLocation(context, 'User')
  params.filter = mergeWith(
    params.filter,
    { id_in: userIds },
    (objValue, srcValue) => {
      if (isArray(objValue)) {
        return objValue.concat(srcValue)
      }
    },
  )
  return params
}

export const filterPostsHasLocation = async (params, context) => {
  if (!params.filter?.hasLocation) return params
  delete params.filter.hasLocation
  const postIds = await getIdsWithLocation(context, 'Post')
  params.filter = mergeWith(
    params.filter,
    { id_in: postIds },
    (objValue, srcValue) => {
      if (isArray(objValue)) {
        return objValue.concat(srcValue)
      }
    },
  )
  return params
}
