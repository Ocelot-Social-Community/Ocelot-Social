import { h } from 'vue'
import { IconProps } from 'vuetify'

import type { IconSet, IconAliases } from 'vuetify'

type Module = {
  default: object
}

// see https://vitejs.dev/guide/features.html#glob-import
const iconModules: Record<string, Module> = import.meta.glob('./svgComponents/' + '*.vue', {
  eager: true,
})

const icons: Record<string, Module> = {}
const iconNames: string[] = []

Object.entries(iconModules).forEach(([key, module]) => {
  const iconName: string = key.split('/').slice(-1)[0].replace('.vue', '')
  // eslint-disable-next-line security/detect-object-injection
  icons[iconName] = module
  iconNames.push('$' + iconName) // because it's used this way
})

const aliases: IconAliases = {} as IconAliases
Object.entries(icons).forEach(([key, value]) => {
  Object.assign(aliases, { [key]: value.default })
})

const set: IconSet = {
  component: (props: IconProps) =>
    h(props.tag, [h(icons[props.icon as string], { class: 'v-icon__svg' })]),
}

export { iconNames, aliases, set }
