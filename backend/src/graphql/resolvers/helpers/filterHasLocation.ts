import type { Context } from '@src/context'

interface FilterParams {
  filter?: {
    hasLocation?: boolean
    id_in?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

// `hasLocation` is passed straight through to the Cypher builders, which turn it into an
// EXISTS pattern. Previously both helpers ran a query that collected the id of EVERY node
// with a location and intersected it with the filter — unbounded, and re-run per request.
// The library could not filter on a relation; hand-written Cypher can.

export const filterPostsHasLocation = (params: FilterParams): FilterParams => params

export const filterUsersHasLocation = async (
  params: FilterParams,
  context: Context,
): Promise<FilterParams> => {
  if (!params.filter?.hasLocation) return params
  // The User query builds its WHERE by hand and has no operator table, so resolve it here.
  delete params.filter.hasLocation
  const session = context.driver.session()
  try {
    const result = await session.readTransaction((transaction) =>
      transaction.run('MATCH (u:User)-[:IS_IN]->(:Location) RETURN collect(u.id) AS ids'),
    )
    const ids = (result.records[0]?.get('ids') as string[] | undefined) ?? []
    params.filter.id_in = params.filter.id_in
      ? params.filter.id_in.filter((id) => ids.includes(id))
      : ids
    return params
  } finally {
    await session.close()
  }
}
