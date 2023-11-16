// eslint-disable-next-line import/no-unassigned-import
import '@mdi/font/css/materialdesignicons.css'
// eslint-disable-next-line import/no-unassigned-import
import 'vuetify/lib/styles/main.sass'
import { useI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
// eslint-disable-next-line import/no-namespace
import * as components from 'vuetify/lib/components/index.mjs'
// eslint-disable-next-line import/no-namespace
import * as directives from 'vuetify/lib/directives/index.mjs'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (i18n: any) =>
  createVuetify({
    locale: {
      adapter: createVueI18nAdapter({ i18n, useI18n }),
    },
    components,
    directives,
  })
