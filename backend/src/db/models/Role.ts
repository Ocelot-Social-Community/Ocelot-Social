// A global role: a named, admin-managed bundle of permissions, bound to users via
// (:User)-[:HAS_ROLE]->(:Role). Definitions are runtime data (see src/role/), this
// model exists so neode owns the uniqueness constraint version-agnostically.
//
// Uniqueness of the role name is encoded in `id` (= the role name, set by the
// repository's MERGE). `primary: true` makes neode install a uniqueness constraint
// for it at schema.install() time (run centrally by src/db/migrate/store.ts).
// `permissions` is JSON-stringified (like Setting.value) to avoid Neo4j list-property
// constraints and stay schema-stable.
export default {
  id: { type: 'string', primary: true },
  name: { type: 'string', indexed: true },
  protected: { type: 'boolean', default: false },
  permissions: { type: 'string', default: '[]' },
  members: {
    type: 'relationship',
    relationship: 'HAS_ROLE',
    target: 'User',
    direction: 'in',
  },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  updatedAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  updatedBy: { type: 'string', allow: [null] },
}
