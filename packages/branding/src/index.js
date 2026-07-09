// Resolved branding config: framework defaults with the brand's sparse overrides deep-merged
// on top (overrides win). Plain CommonJS + a hand-written .d.ts so BOTH the backend (TS/tsx)
// and the webapp (babel/webpack) can consume it without a build step or a runtime dependency.
//
//   // backend (TS)                    // webapp (JS)
//   import branding from '@ocelot-social/branding'
//   branding.group.descriptionMinLength
//
// See docu/branding-architecture-konzept.md ("Schicht A konkret").

const { brandingDefaults } = require('./defaults')
const { overrides } = require('./overrides')

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Recursive merge for plain-object config trees (no lodash dependency — keeps this a
// zero-dep leaf package). `patch` wins; nested objects merge, everything else replaces.
function deepMerge(base, patch) {
  const result = { ...base }
  for (const key of Object.keys(patch || {})) {
    result[key] =
      isPlainObject(base[key]) && isPlainObject(patch[key])
        ? deepMerge(base[key], patch[key])
        : patch[key]
  }
  return result
}

const branding = deepMerge(brandingDefaults, overrides)

// Expose both a default (for `import branding from …`) and named exports. `__esModule: true`
// so a TS/babel `esModuleInterop` default import resolves to `branding` (not the whole
// module.exports).
module.exports = { __esModule: true, default: branding, branding, brandingDefaults }
