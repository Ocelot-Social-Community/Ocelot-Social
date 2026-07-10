// Backend access point for the shared branding config. Thin re-export of the framework-wide
// `@ocelot-social/branding` package — the SINGLE source consumed by both backend and webapp, so
// brand-tunable constants (group limits, registration lengths, metadata, logo paths, …) cannot
// drift between the two. Import it as `@src/branding`:
//
//   import branding from '@src/branding'
//   branding.group.descriptionMinLength
//
// The schema, framework defaults and the brand override slot live in the package; see
// docu/branding-architecture-konzept.md ("Schicht A konkret").

export { default, brandingDefaults, setBranding, getBranding } from '@ocelot-social/branding'
export type { BrandingConfig } from '@ocelot-social/branding'
