/* eslint-disable n/no-sync, security/detect-non-literal-fs-filename */
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

import { parse } from 'graphql'

// Lets scripts run through tsx/node import GraphQL documents (db:seed does). Node's loader has no
// idea what a `.gql` file is and aborts with ERR_UNKNOWN_FILE_EXTENSION, so `load` intercepts
// those URLs and returns a module whose default export is the parsed DocumentNode — the same job
// the Vite plugin in vitest.config.ts does for the test run.
//
// This replaced a `Module._extensions['.gql']` require hook, which lost all effect when the
// package became ESM: that mechanism is CommonJS-only, and `tsx --require` does not reach ESM
// either. Loaded via `tsx --import` (see the db:seed script) so it runs before the entry module.
//
// `registerHooks`, not `register`: the latter is deprecated as of Node 26 and runs the hooks on a
// separate thread, which would force this file to be plain JavaScript. These hooks are synchronous
// and in-thread, so the whole thing stays here in one piece.
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.gql')) {
      return nextLoad(url, context)
    }
    const path = fileURLToPath(url)
    const source = readFileSync(path, 'utf-8')
    try {
      return {
        format: 'module',
        shortCircuit: true,
        source: `export default ${JSON.stringify(parse(source))}`,
      }
    } catch (error: unknown) {
      throw new Error(
        `Failed to parse ${path}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      )
    }
  },
})
