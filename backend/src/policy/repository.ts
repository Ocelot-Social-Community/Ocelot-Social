// Neo4j-Repository for (:Setting) nodes.
// Generic over namespaces — policy is the first, branding/etc. will reuse this.

/* eslint-disable security/detect-object-injection */ // keys come from DB Setting nodes, not request input
import type databaseContext from '@context/database'

type DbContext = ReturnType<typeof databaseContext>

export const POLICY_NAMESPACE = 'policy'

// Uniqueness of (namespace, key) is encoded in the Setting node's `id`
// (`<namespace>.<key>`, set by writeSetting below). The constraint itself is
// owned by the neode Setting model (primary: true → uniqueness constraint) and
// installed centrally by the db-migration init (src/db/migrate/store.ts →
// getNeode().schema.install()), so nothing extra is needed here.

export async function readAllSettings(
  db: DbContext,
  namespace: string,
): Promise<Record<string, unknown>> {
  const result = await db.query({
    query: `MATCH (s:Setting {namespace: $namespace})
            RETURN s.key AS key, s.value AS value`,
    variables: { namespace },
  })

  const out: Record<string, unknown> = {}
  for (const record of result.records) {
    const key = record.get('key') as string
    const rawValue = record.get('value') as string
    try {
      out[key] = JSON.parse(rawValue)
    } catch (error) {
      // Skip malformed JSON (bootstrap will reseed); rethrow anything unexpected.
      if (!(error instanceof SyntaxError)) {
        throw error
      }
    }
  }
  return out
}

// The most recent *human* change across all settings in a namespace (who +
// when), or null if only system seeds exist / nothing has been written yet.
// System writes (actor "system:*", e.g. the init seed) are excluded so the
// admin UI shows "never changed" until a real admin edits something.
export async function readLastChange(
  db: DbContext,
  namespace: string,
): Promise<{ actor: string; timestamp: string } | null> {
  const result = await db.query({
    query: `MATCH (s:Setting {namespace: $namespace})
            WHERE s.updatedAt IS NOT NULL AND NOT s.updatedBy STARTS WITH 'system:'
            RETURN s.updatedBy AS actor, s.updatedAt AS timestamp
            ORDER BY s.updatedAt DESC LIMIT 1`,
    variables: { namespace },
  })
  const record = result.records[0]
  if (!record) {
    return null
  }
  return {
    actor: record.get('actor') as string,
    timestamp: record.get('timestamp') as string,
  }
}

export async function writeSetting(
  db: DbContext,
  namespace: string,
  key: string,
  value: unknown,
  actor: string,
): Promise<void> {
  await db.write({
    query: `MERGE (s:Setting {namespace: $namespace, key: $key})
            SET s.id = $id,
                s.value = $value,
                s.updatedAt = toString(datetime()),
                s.updatedBy = $actor`,
    variables: {
      namespace,
      key,
      id: `${namespace}.${key}`,
      value: JSON.stringify(value),
      actor,
    },
  })
}

export async function deleteSetting(db: DbContext, namespace: string, key: string): Promise<void> {
  await db.write({
    query: `MATCH (s:Setting {namespace: $namespace, key: $key}) DELETE s`,
    variables: { namespace, key },
  })
}
