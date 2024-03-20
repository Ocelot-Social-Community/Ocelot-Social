// eslint-disable-next-line import/no-unassigned-import
import '@mdi/font/css/materialdesignicons.css'
// eslint-disable-next-line import/no-unassigned-import
import 'vuetify/styles'
import { I18n, useI18n } from 'vue-i18n'
import { createVuetify, IconAliases } from 'vuetify'
import { aliases } from 'vuetify/iconsets/mdi-svg'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'

import CustomIcon from '#assets/icons/svgComponents/glass.vue'

const aliasesCustom: IconAliases = {
  ...aliases,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  glass: CustomIcon,
}

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
