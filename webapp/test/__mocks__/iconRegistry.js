/**
 * Jest mock for ~/utils/iconRegistry
 *
 * In webpack, iconRegistry uses require.context to load branding SVGs and merge
 * them with ocelotIcons. In Jest, we simply re-export ocelotIcons since branding
 * SVGs are not available in the test environment.
 */
const { ocelotIcons } = require('@ocelot-social/ui/ocelot')

const iconRegistry = ocelotIcons

function toCamelCase(str) {
  return str
    .split('-')
    .filter(Boolean)
    .map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1)))
    .join('')
}

function resolveIcon(iconName) {
  if (!iconName) return undefined
  return iconRegistry[toCamelCase(iconName)]
}

module.exports = { iconRegistry, toCamelCase, resolveIcon }
