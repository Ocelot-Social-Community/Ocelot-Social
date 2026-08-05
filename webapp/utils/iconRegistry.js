import { ocelotIcons } from '@ocelot-social/ui/ocelot'

import { iconKeyFromFile, toCamelCase } from '~/utils/iconName'

// Re-exported for callers that had it from here; the implementation lives in utils/iconName.js so
// that it is shared with test/__mocks__/iconRegistry.js instead of copied into it.
export { toCamelCase }

// Branding icons from assets/icons/svgs/ (loaded as Vue components via vue-svg-loader). The context
// is flat and its filter anchored — `svgs/` has no subdirectories, and `/\.svg/` unanchored would
// also match something like `icon.svg.js`.
const svgContext = require.context('~/assets/icons/svgs', false, /\.svg$/)
const brandingIcons = {}
svgContext.keys().forEach((fileName) => {
  const component = svgContext(fileName).default || svgContext(fileName)
  brandingIcons[iconKeyFromFile(fileName)] = component
})

// Branding icons override/extend ocelotIcons
export const iconRegistry = { ...ocelotIcons, ...brandingIcons }

export function resolveIcon(iconName) {
  if (!iconName) return undefined
  const icon = iconRegistry[toCamelCase(iconName)]
  // eslint-disable-next-line no-console
  if (!icon) console.warn(`Unknown icon: "${iconName}"`)
  return icon
}
