import cheerio from 'cheerio'

export const queryAllUserIds = async (context, offset = -1, pageSize = -1) => {
  const offsetCypher = offset >= 0 ? ` SKIP ${offset}` : ''
  const pageSizeCypher = pageSize >= 0 ? ` LIMIT ${pageSize}` : ''
  const allUserIdCypher = `
    MATCH (user: User)
    // blocked users are not filtered out
    RETURN user {.id}${offsetCypher}${pageSizeCypher}
  `
  const session = context.driver.session()
  const writeTxResultPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(allUserIdCypher, {})
    return transactionResponse.records.map((record) => record.get('user').id)
  })
  try {
    const ids = await writeTxResultPromise
    return ids
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
}

export const extractMentionedUsers = async (content?) => {
  if (!content) return []
  const $ = cheerio.load(content)
  const userIds = $('a.mention[data-mention-id]')
    .map((_, el) => {
      return $(el).attr('data-mention-id')
    })
    .get()
    .map((id) => id.trim())
    .filter((id) => !!id)
    .filter((id, index, allIds) => allIds.indexOf(id) === index)
  return userIds
}
