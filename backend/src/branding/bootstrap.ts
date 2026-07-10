/* eslint-disable n/no-process-env */ // reads OCELOT_BRANDING_PATH (like config/index.ts)
/* eslint-disable n/no-sync */ // one-off synchronous read at process startup, intentional
/* eslint-disable security/detect-non-literal-fs-filename */ // path is deployment config, not user input
/* eslint-disable no-catch-all/no-catch-all */ // branding injection must never crash startup — any failure falls back to defaults
// Runtime branding injection (backend). Loads a brand's compiled config (JSON — the serialised
// result of the brand's `defineBranding({...})`) from the file at $OCELOT_BRANDING_PATH and injects
// it via setBranding BEFORE the app reads `branding`. Import this FIRST in src/index.ts so
// module-scope reads (e.g. config/index.ts's branding.metadata) see the brand config. No path /
// no file → framework defaults (vanilla image runs as-is). This is what lets a pre-built image be
// branded without a rebuild — see docu/branding-architecture-konzept.md (runtime accessor).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { setBranding } from '@ocelot-social/branding'

import type { BrandingConfig } from '@ocelot-social/branding'

const brandingPath = process.env.OCELOT_BRANDING_PATH
if (brandingPath) {
  try {
    const config = JSON.parse(readFileSync(resolve(brandingPath), 'utf8')) as BrandingConfig
    setBranding(config)
  } catch {
    // no file / unreadable / bad JSON → keep framework defaults
  }
}
