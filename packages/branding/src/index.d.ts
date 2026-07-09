import type { BrandingConfig } from './schema'

export type { BrandingConfig, BrandingOverrides, DeepPartial } from './schema'

/** Framework ("vanilla") defaults, before any brand override. */
export declare const brandingDefaults: BrandingConfig

/** Resolved config: defaults with the brand's sparse overrides deep-merged on top. */
export declare const branding: BrandingConfig

declare const _default: BrandingConfig
export default _default
