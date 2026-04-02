/* eslint-disable @typescript-eslint/no-unsafe-return */

import { createHash } from 'crypto'
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
  authMethod?: 'jwt' | 'apiKey'
  apiKeyId?: string
}

const jwt = { verify }

const decodeJwt = async (
  context: { config: Pick<typeof CONFIG, 'JWT_SECRET'>; driver: Driver },
  token: string,
): Promise<DecodedUser | null> => {
  let id: null | string = null
  try {
    const decoded = jwt.verify(token, context.config.JWT_SECRET) as JwtPayload
    id = decoded.sub ?? null
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch {
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
      authMethod: 'jwt' as const,
    }
  } finally {
    await session.close()
  }
}

const decodeApiKey = async (driver: Driver, key: string): Promise<DecodedUser | null> => {
  const keyHash = createHash('sha256').update(key).digest('hex')
  const session = driver.session()
  try {
    const result = await session.readTransaction(async (transaction) => {
      return transaction.run(
        `
        MATCH (user:User)-[:HAS_API_KEY]->(k:ApiKey { keyHash: $keyHash })
        WHERE k.disabled = false
          AND (k.expiresAt IS NULL OR datetime(k.expiresAt) > datetime())
          AND user.deleted = false
          AND user.disabled = false
        RETURN user {.id, .slug, .name, .role, .disabled, .actorId} AS user, k.id AS keyId
        LIMIT 1
      `,
        { keyHash },
      )
    })
    if (result.records.length === 0) return null

    const record = result.records[0]
    const user = record.get('user')
    const keyId = record.get('keyId') as string

    // Update lastUsedAt asynchronously (non-blocking)
    session
      .writeTransaction(async (transaction) => {
        await transaction.run(
          `MATCH (k:ApiKey { id: $keyId }) SET k.lastUsedAt = toString(datetime())`,
          { keyId },
        )
      })
      .catch(() => {})

    return {
      ...user,
      authMethod: 'apiKey' as const,
      apiKeyId: keyId,
    }
  } finally {
    await session.close()
  }
}

export const decode =
  (context: { config: Pick<typeof CONFIG, 'JWT_SECRET'>; driver: Driver }) =>
  async (authorizationHeader: string | undefined | null) => {
    if (!authorizationHeader) return null
    const token = authorizationHeader.replace('Bearer ', '')

    // Route by token prefix: oak_ = API key, otherwise JWT
    if (token.startsWith('oak_')) {
      return decodeApiKey(context.driver, token)
    }

    return decodeJwt(context, token)
  }
