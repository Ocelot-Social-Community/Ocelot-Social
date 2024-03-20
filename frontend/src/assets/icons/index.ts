// see https://vitejs.dev/guide/features.html#glob-import
const iconsModule = import.meta.glob('./svgComponents/' + '*.vue', {
  eager: true,
})

type Module = {
  default: object
}
const icons: Record<string, Module> = {}

Object.entries(iconsModule).forEach(([key, module]) => {
  const iconName: string = key.split('/').slice(-1)[0].replace('.vue', '')
  // eslint-disable-next-line security/detect-object-injection
  icons[iconName] = module as Module
})

export default icons
