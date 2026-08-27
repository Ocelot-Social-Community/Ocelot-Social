import { getDriver } from '@db/neo4j'

export const description = `
  Store SELECTED.slot as an INTEGER everywhere.

  db/models/User.ts declares the badge slot as \`int\`, and db/schema/relationships.ts declares
  it \`integer\`. The data disagreed: a seeded database held three FLOAT slots next to eleven
  INTEGER ones — and the three were exactly the ones with \`slot: 0\`.

  The cause is in neode, not in our code. GenerateDefaultValues.js:45 reads

      if (output[key]) { output[key] = CleanValue(config, output[key]) }

  and \`CleanValue\` is what turns an \`int\` property into \`neo4j.int(...)\`. Zero is falsy, so the
  conversion is skipped for it alone and the plain JS number reaches the driver, which stores
  JS numbers as FLOAT. Every non-zero slot is converted and lands as INTEGER.

  \`resolvers/badges.ts\` was hardened in the same change (\`toInteger($slot)\`) because it passed
  a bare JS number too — but it was not the source of these three edges.

  This migration converts what already exists. A fresh \`db:seed\` reintroduces the FLOATs,
  because the seed writes those edges through neode: the schema audit keeps reporting them
  until the seed leaves neode behind (concept stage P6).

  It went unnoticed because the only reader stringifies before comparing —
  \`collect(toString(selected.slot))\` and then \`parseInt(item)\`, where "0.0" happens to parse
  back to 0. Ordering and equality against an integer literal would not have been so forgiving.

  \`toInteger\` on a value that is already an integer is a no-op, so the statement is idempotent
  and safe to re-run. It touches every SELECTED edge, which is a handful per user at most.
`

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    await session.writeTransaction((transaction) =>
      transaction.run(`
        MATCH ()-[selected:SELECTED]->()
        WHERE selected.slot IS NOT NULL
        SET selected.slot = toInteger(selected.slot)
      `),
    )
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  // Deliberately empty. The previous state was "some FLOAT, some INTEGER", which is not a
  // state worth reconstructing — and toFloat() on every edge would create the inconsistency
  // rather than restore it.
  await Promise.resolve()
}
