/* eslint-disable n/no-sync, security/detect-non-literal-fs-filename */
// Register a require hook for .gql files so they can be imported at runtime.
// Jest uses its own graphqlTransform.ts for this; this hook covers tsx/node usage
// (e.g. db:seed).
import { readFileSync } from 'node:fs'
import Module from 'node:module'

import { parse } from 'graphql'

// @ts-expect-error -- require.extensions is deprecated but still functional for CJS hooks
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
Module._extensions['.gql'] = function (_module: typeof module, filename: string) {
  const content = readFileSync(filename, 'utf-8')
  try {
    _module.exports = parse(content)
  } catch (error: unknown) {
    throw new Error(
      `Failed to parse ${filename}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
