/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */

import CONFIG from '@config/index'
import { emptyBucket } from '@src/uploads/emptyBucket'

import { assertWipeAllowed } from './assertWipeAllowed'
import { cleanDatabase } from './factories'
import { nudgeCacheResync } from './resync-caches'

assertWipeAllowed(CONFIG, 'db:reset')

// `npm run db:reset -- --with-uploads` empties the uploads' bucket as well. Never without being
// asked: on staging the bucket is a real S3, and wiping the database says nothing about the files.
const withUploads = process.argv.includes('--with-uploads')

;(async function () {
  try {
    await cleanDatabase()
    console.log('Successfully deleted all nodes and relations!') // eslint-disable-line no-console
    if (withUploads) {
      const deleted = await emptyBucket(CONFIG)
      // eslint-disable-next-line no-console
      console.log(
        `Successfully deleted ${deleted} file(s) from bucket ${CONFIG.AWS_BUCKET} at ${CONFIG.AWS_ENDPOINT}!`,
      )
    }
    // A running server still holds stale role/policy caches after this wipe — nudge it
    // to resync (best-effort; no-op if the backend is down).
    await nudgeCacheResync()
    process.exit(0)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err) {
    console.log(`Error occurred resetting the db\n\n${err}`) // eslint-disable-line no-console
    process.exit(1)
  }
})()
