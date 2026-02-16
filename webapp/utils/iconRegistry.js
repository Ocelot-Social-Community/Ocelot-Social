import { ocelotIcons } from '@ocelot-social/ui/ocelot'

export function toCamelCase(str) {
  return str
    .split('-')
    .map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1)))
    .join('')
}

// Branding icons from assets/_new/icons/svgs/ (loaded as Vue components via vue-svg-loader)
const svgContext = require.context('~/assets/_new/icons/svgs', false, /\.svg$/)
const brandingIcons = {}
svgContext.keys().forEach((fileName) => {
  const component = svgContext(fileName).default || svgContext(fileName)
  const kebabName = fileName.replace('./', '').replace('.svg', '')
  brandingIcons[toCamelCase(kebabName)] = component
})

// Branding icons override/extend ocelotIcons
export const iconRegistry = { ...ocelotIcons, ...brandingIcons }
