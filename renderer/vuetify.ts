import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/lib/styles/main.sass'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/lib/components/index.mjs'
import * as directives from 'vuetify/lib/directives/index.mjs'

import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'

import { useI18n } from 'vue-i18n'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (i18n: any) =>
  createVuetify({
    locale: {
      adapter: createVueI18nAdapter({ i18n, useI18n }),
    },
    components,
    directives,
  })
