import cheerio from 'cheerio'

const queryAllUserIds = async (context) => {
  const allUserIdCypher = `
    MATCH (user: User)
    // blocked users are not filtered out
    RETURN user {.id}
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

export default async (context, content?) => {
  if (!content) return []
  console.log('extractMentionedUsers – content: ', content)
  const $ = cheerio.load(content)
  let userIds = $('a.mention[data-mention-id]')
    .map((_, el) => {
      return $(el).attr('data-mention-id')
    })
    .get()
    .map((id) => id.trim())
    .filter((id) => !!id)
    .filter((id, index, allIds) => allIds.indexOf(id) === index)
  console.log('extractMentionedUsers – userIds: ', userIds)
  if (userIds.find((id) => id === 'all')) {
    userIds = await queryAllUserIds(context)
    console.log('extractMentionedUsers – all userIds: ', userIds)
  }
  return userIds
}
