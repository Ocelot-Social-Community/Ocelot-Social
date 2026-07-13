// @ocelot-social/branding — the shared branding schema, framework defaults and RUNTIME resolver,
// consumed by both backend and webapp.
//
//   import branding from '@ocelot-social/branding'
//   branding.group.nameLengthMax
//
// `branding` resolves at ACCESS time, not import time: each domain is an enumerable getter over
// getBranding(), which returns the runtime-injected brand config (globalThis.__OCELOT_BRANDING__)
// or, when none is injected, the framework defaults. This is what lets a brand be grafted onto a
// pre-built image WITHOUT a rebuild — a small bootstrap (webapp plugin / backend entry) calls
// setBranding() with the brand's compiled `defineBranding({...})` before the app reads a value.
// A value read inside a function / method / component reflects the injected config; consumers keep
// `import branding` unchanged. (Module-scope reads that CAPTURE a value at import time see whatever
// is current then — see docu/branding-architecture-konzept.md for the build-vs-runtime split.)

import { defineBranding } from './merge'

import type { BrandingConfig } from './schema'

export type * from './schema'
export * from './buckets'
export * from './theme'
export { brandingDefaults } from './defaults'
export { defineBranding } from './merge'

const GLOBAL_KEY = '__OCELOT_BRANDING__'

type BrandingGlobal = typeof globalThis & { [GLOBAL_KEY]?: BrandingConfig }

// Framework-resolved config (the defaults, with no brand override applied) — the fallback when no
// brand config has been injected at runtime.
const vanilla: BrandingConfig = defineBranding({})

/** The currently effective config: the runtime-injected brand config, else framework defaults. */
export function getBranding(): BrandingConfig {
  return (globalThis as BrandingGlobal)[GLOBAL_KEY] ?? vanilla
}

/**
 * Inject a brand's compiled config at runtime, before the app reads `branding`. The brand builds
 * `defineBranding({...})` in its own repo and ships the result; a webapp plugin / backend bootstrap
 * calls this with it. Pass `undefined` to reset to the framework defaults.
 */
export function setBranding(config: BrandingConfig | undefined): void {
  // Storing `undefined` resets to the framework defaults just as well as deleting the key would:
  // getBranding()'s `?? vanilla` treats a present-but-undefined slot and an absent one identically.
  ;(globalThis as BrandingGlobal)[GLOBAL_KEY] = config
}

const branding = {} as BrandingConfig
for (const domain of Object.keys(vanilla) as (keyof BrandingConfig)[]) {
  Object.defineProperty(branding, domain, {
    enumerable: true,
    configurable: false,
    get: () => getBranding()[domain],
  })
}

export { branding }
export default branding
