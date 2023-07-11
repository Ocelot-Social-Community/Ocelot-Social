import { mergeWith, isArray } from 'lodash'

const getMyGroupIds = async (context) => {
  const { user } = context
  if (!(user && user.id)) return []
  const session = context.driver.session()

  const readTxResultPromise = await session.readTransaction(async (transaction) => {
    const cypher = `
      MATCH (group:Group)<-[membership:MEMBER_OF]-(:User { id: $userId })
      WHERE membership.role IN ['usual', 'admin', 'owner']
      RETURN collect(group.id) AS myGroupIds`
    const getMyGroupIdsResponse = await transaction.run(cypher, { userId: user.id })
    return getMyGroupIdsResponse.records.map((record) => record.get('myGroupIds'))
  })
  try {
    const [myGroupIds] = readTxResultPromise
    return myGroupIds
  } finally {
    session.close()
  }
}

export const filterPostsOfMyGroups = async (params, context) => {
  if (!(params.filter && params.filter.postsInMyGroups)) return params
  delete params.filter.postsInMyGroups
  const myGroupIds = await getMyGroupIds(context)
  params.filter = mergeWith(
    params.filter,
    {
      group: { id_in: myGroupIds },
    },
    (objValue, srcValue) => {
      if (isArray(objValue)) {
        return objValue.concat(srcValue)
      }
    },
  )
  return params
}
