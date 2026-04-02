import { createHash, randomBytes } from 'crypto'
import { v4 as uuid } from 'uuid'

import type { Context } from '@src/context'

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
      return result.records.map((r) => r.get('k'))
    },

    allApiKeys: async (_parent, args, context: Context) => {
      const orderClauses: Record<string, string> = {
        LAST_USED: 'k.lastUsedAt DESC',
        LAST_CONTENT: 'lastContentAt DESC',
        CREATED_AT: 'k.createdAt DESC',
        POSTS_COUNT: 'postsCount DESC',
        COMMENTS_COUNT: 'commentsCount DESC',
      }
      const order = orderClauses[args.orderBy as string] || 'k.lastUsedAt DESC'
      const first = (args.first as number) || 50
      const offset = (args.offset as number) || 0

      const result = await context.database.query({
        query: `
          MATCH (u:User)-[:HAS_API_KEY]->(k:ApiKey)
          OPTIONAL MATCH (p:Post { createdByApiKey: k.id })
          OPTIONAL MATCH (c:Comment { createdByApiKey: k.id })
          WITH u, k,
            count(DISTINCT p) AS postsCount,
            count(DISTINCT c) AS commentsCount,
            max(p.createdAt) AS lastPostAt,
            max(c.createdAt) AS lastCommentAt
          WITH u, k, postsCount, commentsCount,
            CASE WHEN lastPostAt > lastCommentAt
              THEN lastPostAt ELSE lastCommentAt
            END AS lastContentAt
          RETURN k {.*} AS apiKey, u {.*} AS owner, postsCount, commentsCount, lastContentAt
          ORDER BY ${order}
          SKIP toInteger($offset) LIMIT toInteger($first)
        `,
        variables: { offset, first },
      })
      return result.records.map((r) => ({
        apiKey: r.get('apiKey'),
        owner: r.get('owner'),
        postsCount: r.get('postsCount').toNumber(),
        commentsCount: r.get('commentsCount').toNumber(),
        lastContentAt: r.get('lastContentAt'),
      }))
    },

    contentByApiKey: async (_parent, args, context: Context) => {
      const result = await context.database.query({
        query: `
          OPTIONAL MATCH (p:Post { createdByApiKey: $apiKeyId })
          WITH collect(DISTINCT p {.*}) AS posts
          OPTIONAL MATCH (c:Comment { createdByApiKey: $apiKeyId })
          RETURN posts, collect(DISTINCT c {.*}) AS comments
        `,
        variables: { apiKeyId: args.apiKeyId },
      })
      const record = result.records[0]
      return {
        posts: record.get('posts'),
        comments: record.get('comments'),
      }
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
          WHERE k.disabled = false
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
        apiKey: result.records[0].get('k'),
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
      return result.records[0].get('k')
    },

    revokeApiKey: async (_parent, args, context: Context) => {
      const result = await context.database.write({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey { id: $keyId })
          SET k.disabled = true
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
          SET k.disabled = true
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
          WHERE k.disabled = false
          SET k.disabled = true
          RETURN count(k) AS count
        `,
        variables: { userId: args.userId },
      })
      return result.records[0].get('count').toNumber()
    },
  },
}
