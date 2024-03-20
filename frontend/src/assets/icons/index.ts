// see https://vitejs.dev/guide/features.html#glob-import
const iconsModule = import.meta.glob('./svgComponents/' + '*.vue', {
  eager: true,
})

// Wolle console.log('iconsModule: ', iconsModule)

type Module = {
  default: object
}
const icons: Record<string, Module> = {}

Object.entries(iconsModule).forEach(([key, module]) => {
  const iconName: string = key.split('/').slice(-1)[0].replace('.vue', '')
  // eslint-disable-next-line security/detect-object-injection
  icons[iconName] = module as Module
})

// Wolle console.log('icons: ', icons)

export default icons
