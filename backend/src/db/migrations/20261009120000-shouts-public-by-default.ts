import { getDriver } from '@db/neo4j'

export const description =
  "Make every user's shouts public (showShoutsPublicly = true), the new default. The setting was stored but never enforced since 2021, so shouts were public for everybody whatever it said; the setting is enforced now, and public is kept as the default users opt out of. The previous value is kept on the user (showShoutsPubliclyBeforeMigration) so down restores it, except for users who opted out since; they stay private. Idempotent."

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

// Reverts only what is still up's doing. A user who opted out since then made that choice under
// the enforced setting — the one choice that really counts — so they are left alone, value AND
// kept marker: rolled back they stay private, and a later `up` skips them (it only takes users
// without the marker), so the opt-out survives the round trip. A user back at `true` after an
// opt-out gets the old value, which errs on the private side.
export async function down(_next) {
  const session = getDriver().session()
  try {
    await session.writeTransaction((transaction) =>
      transaction.run(`
        MATCH (user:User)
        WHERE user.showShoutsPubliclyBeforeMigration IS NOT NULL
          AND user.showShoutsPublicly = true
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
