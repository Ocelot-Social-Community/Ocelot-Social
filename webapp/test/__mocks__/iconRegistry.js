/**
 * Jest mock for ~/utils/iconRegistry
 *
 * In webpack, iconRegistry uses require.context to load branding SVGs and merge
 * them with ocelotIcons. In Jest, we simply re-export ocelotIcons since branding
 * SVGs are not available in the test environment.
 *
 * The NAME derivation is imported rather than reimplemented: it used to be copied into this file, so
 * a change to the rule would have applied in the app but not in the tests exercising it. It lives in
 * utils/iconName.js, which is free of `require.context` precisely so both sides can share one copy
 * — and so it can be tested at all (utils/iconName.spec.js).
 */
const { ocelotIcons } = require('@ocelot-social/ui/ocelot')

const { toCamelCase } = require('../../utils/iconName')

const iconRegistry = ocelotIcons

function resolveIcon(iconName) {
  if (!iconName) return undefined
  return iconRegistry[toCamelCase(iconName)]
}

module.exports = { iconRegistry, toCamelCase, resolveIcon }
