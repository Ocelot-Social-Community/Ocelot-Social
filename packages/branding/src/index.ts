// @ocelot-social/branding — the shared branding schema, framework defaults and resolver, consumed
// by both backend and webapp so brand-tunable constants cannot drift between the two.
//
//   import branding from '@ocelot-social/branding'
//   branding.group.nameLengthMax
//
// Authored in TypeScript and built to dist/ (CommonJS + .d.ts) so the webapp (babel/webpack) and
// backend (tsx/tsc) both consume the compiled JS while getting generated types. See
// docu/branding-architecture-konzept.md ("Schicht A konkret").

import { brandingDefaults } from './defaults'
import { defineBranding } from './merge'
import { overrides } from './overrides'

import type { BrandingConfig } from './schema'

export * from './schema'
export { brandingDefaults } from './defaults'
export { defineBranding } from './merge'

/** Resolved config: framework defaults with the (vanilla-empty) override slot merged on top. */
export const branding: BrandingConfig = defineBranding(overrides)

export default branding
