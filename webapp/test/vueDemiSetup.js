/**
 * This setup file ensures vue-demi is loaded correctly for Vue 2.7.
 *
 * The @ocelot-social/ui package is handled by the mock in test/__mocks__/@ocelot-social/ui.js
 */
const path = require('path')
const Module = require('module')

// Path to webapp's vue-demi (configured for Vue 2.7)
const vueDemiPath = path.resolve(__dirname, '../node_modules/vue-demi/lib/index.cjs')

// Patch Module._resolveFilename to intercept vue-demi requires
const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'vue-demi') {
    return vueDemiPath
  }
  return originalResolveFilename.apply(this, arguments)
}

// Pre-load vue-demi to ensure correct version is cached
const vueDemi = require(vueDemiPath)
if (!vueDemi.isVue2) {
  throw new Error('vue-demi setup failed: isVue2 should be true')
}
