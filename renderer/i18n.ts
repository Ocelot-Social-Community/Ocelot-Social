import { createI18n } from 'vue-i18n'

// eslint-disable-next-line import/no-relative-parent-imports
import de from '../src/locales/de'
// eslint-disable-next-line import/no-relative-parent-imports
import en from '../src/locales/en'

export default createI18n({
  legacy: false, // Vuetify does not support the legacy mode of vue-i18n
  locale: 'de',
  fallbackLocale: 'en',
  messages: { de, en },
})
