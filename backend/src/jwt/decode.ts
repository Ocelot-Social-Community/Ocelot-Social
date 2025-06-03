/* eslint-disable @typescript-eslint/no-unsafe-return */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { verify } from 'jsonwebtoken'

import type CONFIG from '@src/config'

import type { JwtPayload } from 'jsonwebtoken'
import type { Driver } from 'neo4j-driver'

const jwt = { verify }
export const decode =
  (context: { config: Pick<typeof CONFIG, 'JWT_SECRET'>; driver: Driver }) =>
  async (authorizationHeader: string | undefined | null) => {
    if (!authorizationHeader) return null
    const token = authorizationHeader.replace('Bearer ', '')
    let id: null | string = null
    try {
      const decoded = jwt.verify(token, context.config.JWT_SECRET) as JwtPayload
      id = decoded.sub ?? null
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (err) {
      return null
    }
    const session = context.driver.session()

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
      await session.close()
    }
  }
