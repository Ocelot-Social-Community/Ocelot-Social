/**
 * Jest mock for ~/utils/iconRegistry
 *
 * In webpack, iconRegistry uses require.context to load branding SVGs and merge
 * them with ocelotIcons. In Jest, we simply re-export ocelotIcons since branding
 * SVGs are not available in the test environment.
 */
const { ocelotIcons } = require('@ocelot-social/ui/ocelot')
const { toCamelCase, resolveIcon } = require('../../utils/iconRegistry')

module.exports = { iconRegistry: ocelotIcons, toCamelCase, resolveIcon }
