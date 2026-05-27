// Neo4j-Repository for (:Setting) nodes.
// Generic over namespaces — policy is the first, branding/etc. will reuse this.

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import type databaseContext from '@context/database'

type DbContext = ReturnType<typeof databaseContext>

export const POLICY_NAMESPACE = 'policy'

// Uniqueness on (namespace, key) is enforced application-side via MERGE on both
// properties. A proper composite-uniqueness constraint should be added via a
// db-migration once we know the deployed Neo4j version (4.x vs 5.x syntax differ).
export async function ensureConstraint(_db: DbContext): Promise<void> {
  // No-op for B5. Migration ticket: add (:Setting {namespace, key}) IS UNIQUE.
}

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
    } catch {
      // Skip malformed entries — bootstrap will reseed
    }
  }
  return out
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
            SET s.value = $value,
                s.updatedAt = toString(datetime()),
                s.updatedBy = $actor`,
    variables: {
      namespace,
      key,
      value: JSON.stringify(value),
      actor,
    },
  })
}

export async function deleteSetting(
  db: DbContext,
  namespace: string,
  key: string,
): Promise<void> {
  await db.write({
    query: `MATCH (s:Setting {namespace: $namespace, key: $key}) DELETE s`,
    variables: { namespace, key },
  })
}
