import { getNeode } from './neo4j'
import { badges, verification } from './seed/badges'

// eslint-disable-next-line import/newline-after-import
;(async function () {
  const neode = getNeode()
  try {
    await badges()
    await verification()
  } finally {
    await neode.close()
  }
})()
