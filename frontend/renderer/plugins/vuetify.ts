// eslint-disable-next-line import/no-unassigned-import
import '@mdi/font/css/materialdesignicons.css'
// eslint-disable-next-line import/no-unassigned-import
import 'vuetify/styles'
import { I18n, useI18n } from 'vue-i18n'
import { createVuetify, IconAliases } from 'vuetify'
import { aliases } from 'vuetify/iconsets/mdi-svg'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'

import CustomIcons from '#assets/icons'
import CustomIcon from '#assets/icons/svgComponents/glass.vue'

console.log('aliases: ', aliases)
console.log('CustomIcons.glass: ', CustomIcons.glass.default)
console.log('CustomIcon: ', CustomIcon)

const aliasesCustom: IconAliases = {
  ...aliases,
  // glass: CustomIcon,
  glass: CustomIcons.glass.default as never,
  // ...CustomIcons,
}

// CustomIcons.forEach((component) => {
//   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//   aliasesCustom[component.iconName] = component.mod
// })

// for (const component in CustomIcons) {
//   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//   aliasesCustom[component.iconName] = component.mod
// }
// Object.entries(CustomIcons).forEach(([key, module]) => {
//   // aliasesCustom[key] = module as IconValue
//   aliasesCustom = { ...aliasesCustom, [key]: module }
// })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (i18n: I18n<any, NonNullable<unknown>, NonNullable<unknown>, string, false>) =>
  createVuetify({
    locale: {
      adapter: createVueI18nAdapter({ i18n, useI18n }),
    },
    ssr: true,
    icons: {
      aliases: aliasesCustom,
    },
  })
