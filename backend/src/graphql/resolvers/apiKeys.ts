import { createHash, randomBytes } from 'crypto'
import { v4 as uuid } from 'uuid'

import type { Context } from '@src/context'

function normalizeApiKey(raw: Record<string, unknown>) {
  return {
    ...raw,
    lastUsedAt: raw.lastUsedAt ?? null,
    expiresAt: raw.expiresAt ?? null,
    disabledAt: raw.disabledAt ?? null,
  }
}

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const bytes = randomBytes(32)
  const key = 'oak_' + bytes.toString('base64url')
  const hash = createHash('sha256').update(key).digest('hex')
  const prefix = key.slice(0, 12) // "oak_" + 8 chars
  return { key, hash, prefix }
}

export default {
  Query: {
    myApiKeys: async (_parent, _args, context: Context) => {
      const result = await context.database.query({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey)
          RETURN k {.*}
          ORDER BY k.createdAt DESC
        `,
        variables: { userId: context.user?.id },
      })
      return result.records.map((r) => normalizeApiKey(r.get('k')))
    },

    apiKeyUsers: async (_parent, args, context: Context) => {
      const orderClauses: Record<string, string> = {
        LAST_ACTIVITY: 'lastActivity DESC',
        ACTIVE_KEYS: 'activeCount DESC',
        POSTS_COUNT: 'postsCount DESC',
        COMMENTS_COUNT: 'commentsCount DESC',
      }
      const order = orderClauses[args.orderBy as string] || 'lastActivity DESC'
      const first = (args.first as number) || 50
      const offset = (args.offset as number) || 0

      const result = await context.database.query({
        query: `
          MATCH (u:User)-[:HAS_API_KEY]->(k:ApiKey)
          OPTIONAL MATCH (p:Post { createdByApiKey: k.id })
          OPTIONAL MATCH (c:Comment { createdByApiKey: k.id })
          WITH u,
            sum(CASE WHEN NOT k.disabled THEN 1 ELSE 0 END) AS activeCount,
            sum(CASE WHEN k.disabled THEN 1 ELSE 0 END) AS revokedCount,
            count(DISTINCT p) AS postsCount,
            count(DISTINCT c) AS commentsCount,
            max(k.lastUsedAt) AS lastActivity
          RETURN u {.*} AS user, activeCount, revokedCount, postsCount, commentsCount, lastActivity
          ORDER BY ${order}
          SKIP toInteger($offset) LIMIT toInteger($first)
        `,
        variables: { offset, first },
      })
      return result.records.map((r) => ({
        user: r.get('user'),
        activeCount: r.get('activeCount').toNumber(),
        revokedCount: r.get('revokedCount').toNumber(),
        postsCount: r.get('postsCount').toNumber(),
        commentsCount: r.get('commentsCount').toNumber(),
        lastActivity: r.get('lastActivity') ?? null,
      }))
    },

    apiKeysForUser: async (_parent, args, context: Context) => {
      const result = await context.database.query({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey)
          RETURN k {.*}
          ORDER BY k.disabled ASC, k.createdAt DESC
        `,
        variables: { userId: args.userId },
      })
      return result.records.map((r) => normalizeApiKey(r.get('k')))
    },
  },

  Mutation: {
    createApiKey: async (_parent, args, context: Context) => {
      if (!context.config.API_KEYS_ENABLED) {
        throw new Error('API keys are not enabled')
      }

      const countResult = await context.database.query({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey)
          WHERE NOT k.disabled
          RETURN count(k) AS count
        `,
        variables: { userId: context.user?.id },
      })
      const count = countResult.records[0].get('count').toNumber()
      if (count >= context.config.API_KEYS_MAX_PER_USER) {
        throw new Error(
          `Maximum of ${context.config.API_KEYS_MAX_PER_USER} active API keys reached`,
        )
      }

      let expiresAt: string | null = null
      if (args.expiresInDays) {
        expiresAt = new Date(
          Date.now() + (args.expiresInDays as number) * 86400000,
        ).toISOString()
      }

      const { key, hash, prefix } = generateApiKey()
      const id = uuid()

      const result = await context.database.write({
        query: `
          MATCH (u:User { id: $userId })
          CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
            id: $id,
            name: $name,
            keyHash: $keyHash,
            keyPrefix: $keyPrefix,
            createdAt: toString(datetime()),
            disabled: false
          })
          ${expiresAt ? 'SET k.expiresAt = $expiresAt' : ''}
          RETURN k {.*}
        `,
        variables: {
          userId: context.user?.id,
          id,
          name: args.name,
          keyHash: hash,
          keyPrefix: prefix,
          expiresAt,
        },
      })

      return {
        apiKey: normalizeApiKey(result.records[0].get('k')),
        secret: key,
      }
    },

    updateApiKey: async (_parent, args, context: Context) => {
      const result = await context.database.write({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey { id: $keyId })
          SET k.name = $name
          RETURN k {.*}
        `,
        variables: { userId: context.user?.id, keyId: args.id, name: args.name },
      })
      if (result.records.length === 0) {
        throw new Error('API key not found')
      }
      return normalizeApiKey(result.records[0].get('k'))
    },

    revokeApiKey: async (_parent, args, context: Context) => {
      const result = await context.database.write({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey { id: $keyId })
          SET k.disabled = true, k.disabledAt = toString(datetime())
          RETURN k
        `,
        variables: { userId: context.user?.id, keyId: args.id },
      })
      return result.records.length > 0
    },

    adminRevokeApiKey: async (_parent, args, context: Context) => {
      const result = await context.database.write({
        query: `
          MATCH (k:ApiKey { id: $keyId })
          SET k.disabled = true, k.disabledAt = toString(datetime())
          RETURN k
        `,
        variables: { keyId: args.id },
      })
      return result.records.length > 0
    },

    adminRevokeUserApiKeys: async (_parent, args, context: Context) => {
      const result = await context.database.write({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey)
          WHERE NOT k.disabled
          SET k.disabled = true, k.disabledAt = toString(datetime())
          RETURN count(k) AS count
        `,
        variables: { userId: args.userId },
      })
      return result.records[0].get('count').toNumber()
    },
  },
}
