import { mergeWith, isArray } from 'lodash'

const getInvisiblePosts = async (context) => {
  const session = context.driver.session()
  const readTxResultPromise = await session.readTransaction(async (transaction) => {
    let cypher = ''
    const { user } = context
    if (user && user.id) {
      cypher = `
        MATCH (post:Post)<-[:CANNOT_SEE]-(user:User { id: $userId })
        RETURN collect(post.id) AS invisiblePostIds`
    } else {
      cypher = `
        MATCH (post:Post)-[:IN]->(group:Group)
        WHERE NOT group.groupType = 'public'
        RETURN collect(post.id) AS invisiblePostIds`
    }
    const invisiblePostIdsResponse = await transaction.run(cypher, {
      userId: user ? user.id : null,
    })
    return invisiblePostIdsResponse.records.map((record) => record.get('invisiblePostIds'))
  })
  try {
    const [invisiblePostIds] = readTxResultPromise
    return invisiblePostIds
  } finally {
    await session.close()
  }
}

export const filterInvisiblePosts = async (params, context) => {
  const invisiblePostIds = await getInvisiblePosts(context)
  if (!invisiblePostIds.length) return params

  params.filter = mergeWith(
    params.filter,
    {
      id_not_in: invisiblePostIds,
    },
    (objValue, srcValue) => {
      if (isArray(objValue)) {
        return objValue.concat(srcValue)
      }
    },
  )
  return params
}
