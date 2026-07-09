// THE single brand override slot. Empty by default → pure framework defaults (vanilla).
//
// This is the one file a brand populates. Today it is replaced/populated per deployment (the
// Deploy-Rebranding repo swaps it in at build time); later the same object comes from
// `GET /branding` + a DB patch (Schicht B/C) without a rebuild — the schema stays, only the
// source of these values changes. See docu/branding-architecture-konzept.md.
//
// Sparse: supply only the keys this brand changes (DeepPartial<BrandingConfig>).

import type { BrandingOverrides } from './schema'

const overrides: BrandingOverrides = {}

export default overrides
