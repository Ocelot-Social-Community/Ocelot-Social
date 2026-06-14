import { createHash } from 'node:crypto'

import { verify } from 'jsonwebtoken'

import { resolveRoleName } from '@src/role'

import type CONFIG from '@src/config'
import type { JwtPayload } from 'jsonwebtoken'
import type { Driver } from 'neo4j-driver'

export interface DecodedUser {
  id: string
  slug: string
  name: string
  // The user's single resolved role name from (:User)-[:HAS_ROLE]->(:Role),
  // collapsed at decode time by resolveRoleName (>1 edge fails closed to the
  // baseline). Authorization resolves from this (see effectiveRoleName). Optional so
  // other DecodedUser constructions need not set it; absent ⇒ USER_ROLE baseline.
  roleName?: string
  disabled: boolean
  authMethod?: 'jwt' | 'apiKey'
  apiKeyId?: string
}

// The raw user shape as returned by the decode Cypher (carries the HAS_ROLE edge
// names as an array + actorId); collapsed to DecodedUser via resolveRoleName.
type RawDbUser = Omit<DecodedUser, 'roleName'> & { roles?: string[]; actorId?: string }

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

  const readTxResultPromise = session.readTransaction<RawDbUser[]>(async (transaction) => {
    const fetchUserTransactionResponse = await transaction.run(
      `
      MATCH (user:User {id: $id, deleted: false, disabled: false })
      RETURN user {
        .id, .slug, .name, .disabled, .actorId,
        roles: [(user)-[:HAS_ROLE]->(r:Role) | r.name]
      }
      LIMIT 1
    `,
      { id },
    )
    return fetchUserTransactionResponse.records.map((record) => record.get('user') as RawDbUser)
  })
  try {
    const [raw] = await readTxResultPromise
    if (!raw) return null
    const { roles, ...rest } = raw
    return {
      ...rest,
      roleName: resolveRoleName(roles),
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
        RETURN user {
          .id, .slug, .name, .disabled, .actorId,
          roles: [(user)-[:HAS_ROLE]->(r:Role) | r.name]
        } AS user, k.id AS keyId
        LIMIT 1
      `,
        { keyHash },
      )
    })
    if (result.records.length === 0) return null

    const record = result.records[0]
    const raw = record.get('user') as RawDbUser
    const keyId = record.get('keyId') as string

    // Update lastUsedAt asynchronously (non-blocking, separate session)
    const updateSession = driver.session()
    void updateSession
      .writeTransaction(async (transaction) => {
        await transaction.run(
          `MATCH (k:ApiKey { id: $keyId }) SET k.lastUsedAt = toString(datetime())`,
          { keyId },
        )
      })
      .catch(() => {})
      .finally(async () => updateSession.close())

    const { roles, ...rest } = raw
    return {
      ...rest,
      roleName: resolveRoleName(roles),
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
