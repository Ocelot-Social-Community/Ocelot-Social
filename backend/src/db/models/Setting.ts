// Generic runtime-settings store. Bucket B (network policy) is the first
// namespace; branding etc. will reuse the same (:Setting) label.
//
// Uniqueness of (namespace, key) is encoded in `id` = `<namespace>.<key>`. The
// `primary: true` below makes neode install a uniqueness constraint for it at
// schema.install() time, which the db-migration init runs centrally for all
// models (src/db/migrate/store.ts). The repository writes nodes via raw Cypher
// (MERGE on namespace+key and SET id); this model exists so neode owns the
// constraint version-agnostically (Neo4j 4.x vs 5.x syntax differ).
export default {
  id: { type: 'string', primary: true },
  namespace: { type: 'string', indexed: true },
  key: { type: 'string' },
  value: { type: 'string' },
  updatedAt: { type: 'string' },
  updatedBy: { type: 'string' },
}
