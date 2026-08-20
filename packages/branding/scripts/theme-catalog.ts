// Reads the brandable theme surface straight out of the webapp's stylesheets. Build-time only — it
// touches the filesystem, and it is the reason the package no longer ships a copy of that list.
//
// Reachable in this repo (packages/branding sits next to webapp/); a brand packaged in its own
// repository has no webapp beside it, so callers must treat "no directory" as "cannot check" rather
// than as "no tokens".
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { customPropertiesIn } from './lib/css.ts'

const here = fileURLToPath(new URL('.', import.meta.url))
export const CSS_DIR = join(here, '..', '..', '..', 'webapp', 'assets', 'css')

/** Whether the webapp's stylesheets can be read from here at all. */
export function catalogAvailable(dir: string = CSS_DIR): boolean {
  return existsSync(dir)
}

/** Every `:root` custom property across the webapp's stylesheets, keyed without the leading `--`. */
export function computeCatalog(dir: string = CSS_DIR): Record<string, string> {
  if (!existsSync(dir)) {
    return {}
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .sort()
  const out: Record<string, string> = {}
  for (const f of files) {
    Object.assign(out, customPropertiesIn(readFileSync(join(dir, f), 'utf8')))
  }
  return out
}
