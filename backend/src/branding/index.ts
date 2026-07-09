// Resolved branding config: framework defaults with the brand's sparse overrides deep-merged
// on top (overrides win). Import this everywhere a brand-tunable constant is needed:
//
//   import branding from '@src/branding'
//   ... branding.group.descriptionMinLength
//
// `merge` mutates its first argument, so we merge into a fresh object to avoid clobbering the
// defaults. See docu/branding-architecture-konzept.md ("Schicht A konkret").

import { merge } from 'lodash'

import { brandingDefaults } from './defaults'
import overrides from './overrides'

import type { BrandingConfig } from './schema'

const branding: BrandingConfig = merge({}, brandingDefaults, overrides)

export type { BrandingConfig } from './schema'
export { brandingDefaults } from './defaults'
export default branding
