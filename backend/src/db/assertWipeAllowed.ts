import type { Config } from '@config/index'

/**
 * Refuses to go on unless the instance allows its database to be wiped (DB_WIPE_ALLOWED=true).
 *
 * The first thing db:reset, db:reset:withmigrations and db:seed do. The switch belongs to the
 * instance, not to NODE_ENV: a seed job run with NODE_ENV=test against a production database used
 * to pass the old guard (`PRODUCTION && !PRODUCTION_DB_CLEAN_ALLOW`), because it only looked at
 * production. Now nothing is wiped where nobody said so.
 */
export const assertWipeAllowed = (
  config: Pick<Config, 'DB_WIPE_ALLOWED'>,
  action: string,
): void => {
  if (config.DB_WIPE_ALLOWED) {
    return
  }
  throw new Error(
    `${action} wipes the database, and this instance does not allow that. Set DB_WIPE_ALLOWED=true where the data may go — development, test, staging, never production. (It replaces PRODUCTION_DB_CLEAN_ALLOW, which is no longer read.)`,
  )
}
