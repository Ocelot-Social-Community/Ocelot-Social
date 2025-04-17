import { readdir } from 'node:fs/promises'
import path from 'node:path'

const dataFolder = path.join(__dirname, 'data/')

;(async function () {
  const files = await readdir(dataFolder)
  files.forEach(async (file) => {
    if (file.slice(0, -3).endsWith('-branding')) {
      const importedModule = await import(path.join(dataFolder, file))
      if (!importedModule.default) {
        throw new Error('Your data file must export a default function')
      }
      await importedModule.default()
    }
  })
})()
