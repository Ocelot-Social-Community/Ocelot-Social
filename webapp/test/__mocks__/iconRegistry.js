/**
 * Jest mock for ~/utils/iconRegistry
 *
 * In webpack, iconRegistry uses require.context to load branding SVGs and merge
 * them with ocelotIcons. In Jest, we simply re-export ocelotIcons since branding
 * SVGs are not available in the test environment.
 */
const { ocelotIcons } = require('@ocelot-social/ui/ocelot')

function toCamelCase(str) {
  return str
    .split('-')
    .map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1)))
    .join('')
}

module.exports = { iconRegistry: ocelotIcons, toCamelCase }
