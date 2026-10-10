import { getDriver } from '@db/neo4j'

export const description =
  "Make every user's shouts public (showShoutsPublicly = true), the new default. The setting was stored but never enforced since 2021, so shouts were public for everybody whatever it said; the setting is enforced now, and public is kept as the default users opt out of. The previous value is kept on the user (showShoutsPubliclyBeforeMigration) so down restores it exactly. Idempotent."

export async function up(_next) {
  const session = getDriver().session()
  try {
    // Only users not migrated yet: a second run must not overwrite the kept value with `true`.
    await session.writeTransaction((transaction) =>
      transaction.run(`
        MATCH (user:User)
        WHERE user.showShoutsPubliclyBeforeMigration IS NULL
        SET user.showShoutsPubliclyBeforeMigration = CASE user.showShoutsPublicly
              WHEN true THEN 'true'
              WHEN false THEN 'false'
              ELSE 'unset'
            END,
            user.showShoutsPublicly = true
      `),
    )
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const session = getDriver().session()
  try {
    await session.writeTransaction((transaction) =>
      transaction.run(`
        MATCH (user:User)
        WHERE user.showShoutsPubliclyBeforeMigration IS NOT NULL
        SET user.showShoutsPublicly = CASE user.showShoutsPubliclyBeforeMigration
              WHEN 'true' THEN true
              WHEN 'false' THEN false
              ELSE null
            END
        REMOVE user.showShoutsPubliclyBeforeMigration
      `),
    )
  } finally {
    await session.close()
  }
}
