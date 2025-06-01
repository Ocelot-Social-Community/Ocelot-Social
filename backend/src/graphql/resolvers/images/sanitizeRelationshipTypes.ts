export function sanitizeRelationshipType(
  relationshipType: string,
): asserts relationshipType is 'HERO_IMAGE' | 'AVATAR_IMAGE' {
  // Cypher query language does not allow to parameterize relationship types
  // See: https://github.com/neo4j/neo4j/issues/340
  if (!['HERO_IMAGE', 'AVATAR_IMAGE'].includes(relationshipType)) {
    throw new Error(`Unknown relationship type ${relationshipType}`)
  }
}
