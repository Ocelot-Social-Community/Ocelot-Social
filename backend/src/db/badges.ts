/* eslint-disable @typescript-eslint/no-floating-promises */
import { closeDriver } from './neo4j'
import { trophies, verification } from './seed/badges'

// eslint-disable-next-line import-x/newline-after-import
;(async function () {
  try {
    await trophies()
    await verification()
  } finally {
    // Was `neode.close()`, which closed neode's own driver. The work above goes through the
    // shared one, so that is what has to be closed for the process to exit.
    await closeDriver()
  }
})()
