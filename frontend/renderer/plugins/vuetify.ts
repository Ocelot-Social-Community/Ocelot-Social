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
    background: 'rgb(255, 255, 255)',
    surface: 'rgb(255, 255, 255)',
    // primary: rgbToHex(23, 181, 63, '#'),
    primary: tokens.primaryColor,
    // 'primary-darken-1': rgbToHex(25, 122, 49, '#'),
    'primary-darken-1': 'rgb(25, 122, 49)',
    secondary: 'rgb(0, 142, 230)',
    // 'secondary-darken-1': '#018786',
    error: 'rgb(219, 57, 36)',
    // info: '#2196F3',
    success: 'rgb(23, 181, 63)',
    warning: 'rgb(230, 121, 25)',
  },
  variables: {
    'border-color': '#000000',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#0000FF',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#F5F5F5',
    'theme-on-code': '#000000',
  },
}

const ocelotStandardDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: 'rgb(0, 0, 0)',
    surface: 'rgb(14, 17, 23)',
    // primary: rgbToHex(23, 181, 63, '#'),
    primary: 'rgb(23, 181, 63)',
    // 'primary-darken-1': rgbToHex(25, 122, 49, '#'),
    'primary-darken-1': 'rgb(25, 122, 49)',
    secondary: 'rgb(0, 142, 230)',
    // 'secondary-darken-1': '#018786',
    error: 'rgb(219, 57, 36)',
    // info: '#2196F3',
    success: 'rgb(23, 181, 63)',
    warning: 'rgb(230, 121, 25)',
  },
  variables: {
    'border-color': '#000000',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#0000FF',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#F5F5F5',
    'theme-on-code': '#000000',
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
