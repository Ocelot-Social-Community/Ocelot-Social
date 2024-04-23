// eslint-disable-next-line import/no-unassigned-import
import '@mdi/font/css/materialdesignicons.css'
// eslint-disable-next-line import/no-unassigned-import
import 'vuetify/styles'
import { I18n, useI18n } from 'vue-i18n'
import { createVuetify, ThemeDefinition } from 'vuetify'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'

import tokens from '#assets/sass/tokens.module.scss'

const ocelotStandardLightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: tokens.backgroundColorBase,
    surface: tokens.backgroundColorSoft,
    primary: tokens.primaryColor,
    secondary: tokens.colorSecondary,
    success: tokens.colorSuccess,
    info: tokens.colorInfo,
    warning: tokens.colorWarning,
    error: tokens.colorError,
  },
  variables: {
    'border-color': '#000000',
  },
}

const ocelotStandardDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    ...ocelotStandardLightTheme.colors,
    background: tokens.backgroundColorInverse,
    surface: tokens.backgroundColorInverseSoft,
  },
  variables: {
    'border-color': '#000000',
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (i18n: I18n<any, NonNullable<unknown>, NonNullable<unknown>, string, false>) =>
  createVuetify({
    locale: {
      adapter: createVueI18nAdapter({ i18n, useI18n }),
    },
    ssr: true,
    theme: {
      defaultTheme: 'ocelotStandardLightTheme',
      // defaultTheme: 'ocelotStandardDarkTheme',
      themes: {
        ocelotStandardLightTheme,
        ocelotStandardDarkTheme,
      },
    },
  })
