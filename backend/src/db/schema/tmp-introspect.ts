/* eslint-disable */
import { closeDriver, getDriver } from '@db/neo4j'

// Throwaway: dumps what the database actually contains, as raw material for the entity and
// relationship declarations. Not part of the schema layer.

const num = (value: any): number => (typeof value === 'number' ? value : Number(value?.toString?.() ?? 0))

const main = async () => {
  const session = getDriver().session()
  const out: string[] = []

  const labelsResult = await session.run('CALL db.labels()')
  const labels = labelsResult.records.map((r) => String(r.get('label')))

  for (const label of labels) {
    const total = num(
      (await session.run(`MATCH (n:\`${label}\`) RETURN count(n) AS c`)).records[0].get('c'),
    )
    const props = await session.run(
      `MATCH (n:\`${label}\`) WITH n LIMIT 20000
       UNWIND keys(n) AS key
       RETURN key, collect(DISTINCT apoc.meta.cypher.type(n[key])) AS types, count(*) AS present
       ORDER BY key`,
    )
    const secondary = await session.run(
      `MATCH (n:\`${label}\`) WITH labels(n) AS ls LIMIT 20000
       RETURN DISTINCT ls ORDER BY ls`,
    )
    out.push(`\n## ${label} (${total} nodes)`)
    out.push(
      `   labelsets: ${secondary.records.map((r) => JSON.stringify(r.get('ls'))).join(' ')}`,
    )
    for (const record of props.records) {
      const present = num(record.get('present'))
      out.push(
        `   ${String(record.get('key'))}: ${(record.get('types') as string[]).join('|')}` +
          `  ${present}/${total}${present === total ? ' REQ' : ''}`,
      )
    }
  }

  const typesResult = await session.run('CALL db.relationshipTypes()')
  const types = typesResult.records.map((r) => String(r.get('relationshipType')))
  out.push('\n\n# RELATIONSHIPS')
  for (const type of types) {
    const endpoints = await session.run(
      `MATCH (a)-[r:\`${type}\`]->(b) RETURN labels(a) AS a, labels(b) AS b, count(*) AS c ORDER BY c DESC`,
    )
    const props = await session.run(
      `MATCH ()-[r:\`${type}\`]->() WITH r LIMIT 20000
       UNWIND keys(r) AS key
       RETURN key, collect(DISTINCT apoc.meta.cypher.type(r[key])) AS types, count(*) AS present
       ORDER BY key`,
    )
    const totalEdges = num(
      (await session.run(`MATCH ()-[r:\`${type}\`]->() RETURN count(r) AS c`)).records[0].get('c'),
    )
    const degree = await session.run(
      `MATCH (a)-[r:\`${type}\`]->() WITH a, count(r) AS c RETURN max(c) AS maxOut, min(c) AS minOut`,
    )
    out.push(`\n## ${type} (${totalEdges} edges, maxOut=${num(degree.records[0].get('maxOut'))})`)
    for (const record of endpoints.records) {
      out.push(
        `   ${JSON.stringify(record.get('a'))} -> ${JSON.stringify(record.get('b'))}: ${num(record.get('c'))}`,
      )
    }
    for (const record of props.records) {
      const present = num(record.get('present'))
      out.push(
        `   prop ${String(record.get('key'))}: ${(record.get('types') as string[]).join('|')}` +
          `  ${present}/${totalEdges}${present === totalEdges ? ' REQ' : ''}`,
      )
    }
  }

  console.log(out.join('\n'))
  await session.close()
  await closeDriver()
}

void main()
