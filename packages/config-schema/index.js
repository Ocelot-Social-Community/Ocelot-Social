// CommonJS-Eintragspunkt für Backend (TS via require/import) und Webapp (webpack).
// Liefert Schema-Objekt + Konstanten für Resolver/Codegen.

const policySchema = require('./policy.schema.json')

const NAMESPACES = {
  POLICY: 'policy',
}

const VISIBILITY = {
  PUBLIC: 'public',
  ADMIN: 'admin',
}

/**
 * Liefert die Liste aller Keys in einem Schema, gefiltert nach x-visibility.
 * @param {object} schema - JSON-Schema-Objekt
 * @param {string} visibility - 'public' oder 'admin' (admin schließt public ein)
 * @returns {string[]}
 */
function keysByVisibility(schema, visibility) {
  const props = schema.properties || {}
  return Object.keys(props).filter((key) => {
    const vis = props[key]['x-visibility'] || 'admin'
    if (visibility === 'admin') return true
    return vis === 'public'
  })
}

/**
 * Liefert Default-Wert aus Schema-Property.
 */
function schemaDefault(schema, key) {
  return schema.properties?.[key]?.default
}

/**
 * Liefert ENV-Seed-Variablen-Name aus Schema-Property (oder undefined).
 */
function envSeed(schema, key) {
  return schema.properties?.[key]?.['x-envSeed']
}

module.exports = {
  policySchema,
  NAMESPACES,
  VISIBILITY,
  keysByVisibility,
  schemaDefault,
  envSeed,
}
