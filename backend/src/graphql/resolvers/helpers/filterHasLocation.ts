import type { Context } from '@src/context'

interface FilterParams {
  filter?: {
    hasLocation?: boolean
    id_in?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

type AllowedLabel = 'User' | 'Post'

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

const mergeIdIn = (existing: string[] | undefined, incoming: string[]): string[] => {
  if (!existing) return incoming
  return existing.filter((id) => incoming.includes(id))
}

export const filterUsersHasLocation = async (
  params: FilterParams,
  context: Context,
): Promise<FilterParams> => {
  if (!params.filter?.hasLocation) return params
  delete params.filter.hasLocation
  const userIds = await getIdsWithLocation(context, 'User')
  params.filter.id_in = mergeIdIn(params.filter.id_in, userIds)
  return params
}

export const filterPostsHasLocation = async (
  params: FilterParams,
  context: Context,
): Promise<FilterParams> => {
  if (!params.filter?.hasLocation) return params
  delete params.filter.hasLocation
  const postIds = await getIdsWithLocation(context, 'Post')
  params.filter.id_in = mergeIdIn(params.filter.id_in, postIds)
  return params
}
