// eslint-disable-next-line import/no-unassigned-import
import '@mdi/font/css/materialdesignicons.css'
// eslint-disable-next-line import/no-unassigned-import
import 'vuetify/styles'
import { I18n, useI18n } from 'vue-i18n'
import { createVuetify, IconAliases } from 'vuetify'
import { aliases } from 'vuetify/iconsets/mdi-svg'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'

import CustomIcons from '#assets/icons'

const aliasesCustom: IconAliases = {
  ...aliases,
}
Object.entries(CustomIcons).forEach(([key, value]) => {
  Object.assign(aliasesCustom, { [key]: value.default as never })
})

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
