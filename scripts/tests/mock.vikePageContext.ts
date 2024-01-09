import { config } from '@vue/test-utils'

import { vikePageContext } from '#context/usePageContext'

config.global.provide = {
  ...config.global.provide,
  [vikePageContext as symbol]: { urlPathname: '/some-url' },
}
