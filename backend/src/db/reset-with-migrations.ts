/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */

import CONFIG from '@config/index'

import { assertWipeAllowed } from './assertWipeAllowed'
import { cleanDatabase } from './factories'

assertWipeAllowed(CONFIG, 'db:reset:withmigrations')

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
