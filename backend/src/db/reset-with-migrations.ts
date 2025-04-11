/* eslint-disable n/no-process-exit */
import CONFIG from '@config/index'

import { cleanDatabase } from './factories'

if (CONFIG.PRODUCTION && !CONFIG.PRODUCTION_DB_CLEAN_ALLOW) {
  throw new Error(`You cannot clean the database in a non-staging and real production environment!`)
}

;(async function () {
  try {
    await cleanDatabase({ withMigrations: true })
    console.log('Successfully deleted all nodes and relations including!') // eslint-disable-line no-console
    process.exit(0)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err) {
    console.log(`Error occurred deleting the nodes and relations (reset the db)\n\n${err}`) // eslint-disable-line no-console
    process.exit(1)
  }
})()
