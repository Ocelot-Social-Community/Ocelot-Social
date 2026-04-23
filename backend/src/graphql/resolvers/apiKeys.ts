import { createHash, randomBytes } from 'node:crypto'

import { v4 as uuid } from 'uuid'

import type { Context } from '@src/context'
import type { Integer, Record as Neo4jRecord } from 'neo4j-driver'

interface ApiKeyArgs {
  id?: string
  name?: string
  expiresInDays?: number
  userId?: string
  first?: number
  offset?: number
}

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

function toNumber(value: Integer | number): number {
  return typeof value === 'number' ? value : value.toNumber()
}

function getRecord(record: Neo4jRecord, field: string): Record<string, unknown> {
  return record.get(field) as Record<string, unknown>
}

export default {
  Query: {
    myApiKeys: async (_parent: unknown, _args: unknown, context: Context) => {
      const result = await context.database.query({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey)
          RETURN k {.*}
          ORDER BY k.createdAt DESC, k.id DESC
        `,
        variables: { userId: context.user?.id },
      })
      return result.records.map((r: Neo4jRecord) => normalizeApiKey(getRecord(r, 'k')))
    },

    apiKeyUsers: async (_parent: unknown, args: ApiKeyArgs, context: Context) => {
      const first = args.first ?? 50
      const offset = args.offset ?? 0

      const result = await context.database.query({
        query: `
          MATCH (u:User)-[:HAS_API_KEY]->(k:ApiKey)
          WITH u, collect(k) AS keys
          WITH u, keys,
            size([k IN keys WHERE NOT k.disabled]) AS activeCount,
            size([k IN keys WHERE k.disabled]) AS revokedCount,
            reduce(m = null, k IN keys | CASE WHEN k.lastUsedAt IS NOT NULL AND (m IS NULL OR k.lastUsedAt > m) THEN k.lastUsedAt ELSE m END) AS lastActivity
          ORDER BY lastActivity IS NULL, lastActivity DESC
          SKIP toInteger($offset) LIMIT toInteger($first)
          WITH u, keys, activeCount, revokedCount, lastActivity,
            [k IN keys | k.id] AS keyIds
          OPTIONAL MATCH (p:Post) WHERE p.createdByApiKey IN keyIds
          WITH u, activeCount, revokedCount, lastActivity, keyIds, count(p) AS postsCount
          OPTIONAL MATCH (c:Comment) WHERE c.createdByApiKey IN keyIds
          RETURN u {.*} AS user, activeCount, revokedCount, postsCount, count(c) AS commentsCount, lastActivity
        `,
        variables: { offset, first },
      })
      return result.records.map((r: Neo4jRecord) => ({
        user: r.get('user') as Record<string, unknown>,
        activeCount: toNumber(r.get('activeCount') as Integer),
        revokedCount: toNumber(r.get('revokedCount') as Integer),
        postsCount: toNumber(r.get('postsCount') as Integer),
        commentsCount: toNumber(r.get('commentsCount') as Integer),
        lastActivity: (r.get('lastActivity') as string | null) ?? null,
      }))
    },

    apiKeysForUser: async (_parent: unknown, args: ApiKeyArgs, context: Context) => {
      const result = await context.database.query({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey)
          RETURN k {.*}
          ORDER BY k.disabled ASC, k.createdAt DESC, k.id DESC
        `,
        variables: { userId: args.userId },
      })
      return result.records.map((r: Neo4jRecord) => normalizeApiKey(getRecord(r, 'k')))
    },
  },

  Mutation: {
    createApiKey: async (_parent: unknown, args: ApiKeyArgs, context: Context) => {
      if (!context.config.API_KEYS_ENABLED) {
        throw new Error('API keys are not enabled')
      }

      if (args.expiresInDays != null && args.expiresInDays < 1) {
        throw new Error('expiresInDays must be a positive integer')
      }

      let expiresAt: string | null = null
      if (args.expiresInDays) {
        expiresAt = new Date(Date.now() + args.expiresInDays * 86400000).toISOString()
      }

      const { key, hash, prefix } = generateApiKey()
      const id = uuid()
      // Generate the ISO timestamp in Node rather than via Cypher's
      // `toString(datetime())`: Neo4j omits the fractional-seconds part when
      // it is zero (e.g. "2026-04-23T14:05:32Z" instead of
      // "2026-04-23T14:05:32.000Z"). That variable width breaks lexicographic
      // `ORDER BY k.createdAt DESC`, because "Z" > "." in ASCII. JS's
      // `Date#toISOString()` always emits 3 fractional digits, so string sort
      // remains in chronological order.
      const createdAt = new Date().toISOString()

      const result = await context.database.write({
        query: `
          MATCH (u:User { id: $userId })
          OPTIONAL MATCH (u)-[:HAS_API_KEY]->(existing:ApiKey)
          WHERE NOT existing.disabled
          WITH u, count(existing) AS activeCount
          WHERE activeCount < toInteger($maxKeys)
          CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
            id: $id,
            name: $name,
            keyHash: $keyHash,
            keyPrefix: $keyPrefix,
            createdAt: $createdAt,
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
          createdAt,
          expiresAt,
          maxKeys: context.config.API_KEYS_MAX_PER_USER,
        },
      })

      if (result.records.length === 0) {
        throw new Error(
          `Maximum of ${String(context.config.API_KEYS_MAX_PER_USER)} active API keys reached`,
        )
      }

      return {
        apiKey: normalizeApiKey(getRecord(result.records[0], 'k')),
        secret: key,
      }
    },

    updateApiKey: async (_parent: unknown, args: ApiKeyArgs, context: Context) => {
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
      return normalizeApiKey(getRecord(result.records[0], 'k'))
    },

    revokeApiKey: async (_parent: unknown, args: ApiKeyArgs, context: Context) => {
      const result = await context.database.write({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey { id: $keyId })
          WHERE NOT k.disabled
          SET k.disabled = true, k.disabledAt = $disabledAt
          RETURN k
        `,
        variables: {
          userId: context.user?.id,
          keyId: args.id,
          disabledAt: new Date().toISOString(),
        },
      })
      return result.records.length > 0
    },

    adminRevokeApiKey: async (_parent: unknown, args: ApiKeyArgs, context: Context) => {
      const result = await context.database.write({
        query: `
          MATCH (k:ApiKey { id: $keyId })
          WHERE NOT k.disabled
          SET k.disabled = true, k.disabledAt = $disabledAt
          RETURN k
        `,
        variables: { keyId: args.id, disabledAt: new Date().toISOString() },
      })
      return result.records.length > 0
    },

    adminRevokeUserApiKeys: async (_parent: unknown, args: ApiKeyArgs, context: Context) => {
      const result = await context.database.write({
        query: `
          MATCH (u:User { id: $userId })-[:HAS_API_KEY]->(k:ApiKey)
          WHERE NOT k.disabled
          SET k.disabled = true, k.disabledAt = $disabledAt
          RETURN count(k) AS count
        `,
        variables: { userId: args.userId, disabledAt: new Date().toISOString() },
      })
      return toNumber(result.records[0].get('count') as Integer)
    },
  },
}
