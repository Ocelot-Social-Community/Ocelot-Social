// Get icons
const moduleStrings = import.meta.glob('./svg/*.svg', {
  query: '?raw',
  import: 'default',
})

const iconNames = []
const icons = {}

for (const svgImport of Object.entries(moduleStrings)) {
  const [path, module] = svgImport
  const name = path.replace('./svg/', '').replace('.svg', '')
  iconNames.push(name)
  module().then((svg) => icons[name] = svg)
}

export { iconNames }

export default icons
