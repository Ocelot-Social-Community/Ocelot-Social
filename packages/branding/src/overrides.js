// THE single brand override slot. Empty by default → pure framework defaults (vanilla).
//
// This is the one file a brand populates. Today it is replaced/populated per deployment (the
// Deploy-Rebranding repo swaps it in); later the same object comes from `GET /branding` + a DB
// patch (Schicht B/C) without a rebuild — the schema stays, only the source changes. See
// docu/branding-architecture-konzept.md.
//
// Sparse: supply only the keys this brand changes (DeepPartial<BrandingConfig>).

/** @type {import('./schema').BrandingOverrides} */
const overrides = {}

module.exports = { overrides }
