import { createI18n } from 'vue-i18n'

// eslint-disable-next-line import/no-relative-parent-imports
import de from '../src/locales/de.json'
// import { de as $vuetify } from 'vuetify/locale'
// eslint-disable-next-line import/no-relative-parent-imports
import en from '../src/locales/en.json'
// import { en as $vuetify } from 'vuetify/locale'

export default createI18n({
  legacy: false, // Vuetify does not support the legacy mode of vue-i18n
  locale: 'de',
  fallbackLocale: 'en',
  messages: { de, en },
})
