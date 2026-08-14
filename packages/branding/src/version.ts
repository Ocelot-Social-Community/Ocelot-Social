// The @ocelot-social/branding SCHEMA version — the compatibility axis baked into every archive's
// manifest (manifest.schemaVersion) AND the version the runtime compares an archive against (compat.ts).
// It is the package's own version; version.spec keeps it in lock-step with package.json (drift guard),
// so this stays a plain constant that BOTH the CommonJS dist and the type-checker can read — no
// import.meta (unavailable in the CJS emit) or __dirname (unavailable in the ESM source).
// The trailing marker lets release-please bump this in lock-step with package.json (see
// .github/release-please/branding-config.json `extra-files`), so the drift guard in version.spec never
// trips on a release.
export const SCHEMA_VERSION = '0.1.4' // x-release-please-version
