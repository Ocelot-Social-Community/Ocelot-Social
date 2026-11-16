/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */

import CONFIG from '@config/index'

import { assertWipeAllowed } from './assertWipeAllowed'
import { cleanDatabase } from './factories'
import { nudgeCacheResync } from './resync-caches'

assertWipeAllowed(CONFIG, 'db:reset')

;(async function () {
  try {
    await cleanDatabase()
    console.log('Successfully deleted all nodes and relations!') // eslint-disable-line no-console
    // A running server still holds stale role/policy caches after this wipe — nudge it
    // to resync (best-effort; no-op if the backend is down).
    await nudgeCacheResync()
    process.exit(0)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err) {
    console.log(`Error occurred deleting the nodes and relations (reset the db)\n\n${err}`) // eslint-disable-line no-console
    process.exit(1)
  }
})()
