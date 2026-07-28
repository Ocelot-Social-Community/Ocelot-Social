// Webpack alias target (NOT a runtime module). The @ocelot-social/branding server-only loader
// (dist/discover.js → dist/tar.js → nanotar) reads brand archives off disk with Node built-ins
// (node:fs / node:path / node:zlib). It runs ONLY under a `process.server` guard, but webpack still
// resolves the static `require('.../dist/discover.js')` when building the CLIENT bundle — where the
// `node:` scheme is unresolvable and nanotar's ESM (optional chaining) can't be parsed by webpack 4.
// nuxt.config.js aliases those submodules to this empty stub for the client build, so the guarded
// server code compiles to a no-op it never actually calls in the browser.
module.exports = {}
