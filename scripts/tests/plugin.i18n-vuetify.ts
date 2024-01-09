import { config } from '@vue/test-utils'

import i18n from '#plugins/i18n'
import vuetify from '#plugins/vuetify'

config.global.plugins.push(i18n)
config.global.plugins.push(vuetify(i18n))

config.global.mocks = {
  ...config.global.mocks,
  i18n$t: i18n.global.t,
  i18n$d: i18n.global.d,
  i18n$n: i18n.global.n,
}
