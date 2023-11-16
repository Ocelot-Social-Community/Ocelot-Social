import { config } from '@vue/test-utils'

// eslint-disable-next-line import/no-relative-parent-imports
import i18n from '../renderer/i18n'
// eslint-disable-next-line import/no-relative-parent-imports
import vuetify from '../renderer/vuetify'

config.global.plugins.push(vuetify(i18n))

config.global.mocks = {
  ...config.global.mocks,
  i18n$t: i18n.global.t,
  i18n$d: i18n.global.d,
  i18n$n: i18n.global.n,
}
