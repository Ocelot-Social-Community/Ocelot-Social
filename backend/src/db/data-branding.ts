/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { getNeode } from './neo4j'

const dataFolder = path.join(__dirname, 'data/')
const neode = getNeode()

;(async function () {
  const files = await readdir(dataFolder)
  for await (const file of files) {
    if (file.slice(0, -3).endsWith('-branding')) {
      const importedModule = await import(path.join(dataFolder, file))
      if (!importedModule.default) {
        throw new Error('Your data file must export a default function')
      }
      await importedModule.default()
    }
  }

  // close database connection
  neode.close()
})()
