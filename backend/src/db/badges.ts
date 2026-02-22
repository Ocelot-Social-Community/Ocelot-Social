/* eslint-disable @typescript-eslint/no-floating-promises */
import { getNeode } from './neo4j'
import { trophies, verification } from './seed/badges'

// eslint-disable-next-line import-x/newline-after-import
;(async function () {
  const neode = getNeode()
  try {
    await trophies()
    await verification()
  } finally {
    neode.close()
  }
})()
