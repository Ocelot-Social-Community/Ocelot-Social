/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import jwt from 'jsonwebtoken'

import CONFIG from '@config/index'

export default async (driver, authorizationHeader) => {
  if (!authorizationHeader) return null
  const token = authorizationHeader.replace('Bearer ', '')
  let id = null
  try {
    const decoded = await jwt.verify(token, CONFIG.JWT_SECRET)
    id = decoded.sub
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err) {
    return null
  }
  const session = driver.session()

  const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    const updateUserLastActiveTransactionResponse = await transaction.run(
      `
        MATCH (user:User {id: $id, deleted: false, disabled: false })
        SET user.lastActiveAt = toString(datetime())
        RETURN user {.id, .slug, .name, .role, .disabled, .actorId}
        LIMIT 1
      `,
      { id },
    )
    return updateUserLastActiveTransactionResponse.records.map((record) => record.get('user'))
  })
  try {
    const [currentUser] = await writeTxResultPromise
    if (!currentUser) return null
    return {
      token,
      ...currentUser,
    }
  } finally {
    session.close()
  }
}
