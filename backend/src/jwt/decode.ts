/* eslint-disable @typescript-eslint/no-unsafe-return */

import { verify } from 'jsonwebtoken'

import type CONFIG from '@src/config'

import type { JwtPayload } from 'jsonwebtoken'
import type { Driver } from 'neo4j-driver'

export interface DecodedUser {
  id: string
  slug: string
  name: string
  role: string
  disabled: boolean
}

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

    const writeTxResultPromise = session.writeTransaction<DecodedUser[]>(async (transaction) => {
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
