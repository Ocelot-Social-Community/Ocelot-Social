import { mount, config } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import ClickCounter from './ClickCounter.vue'

describe('clickCounter', () => {
  const wrapper = mount(ClickCounter)

  it('renders Button with a Counter of 0', () => {
    expect(wrapper.find('.v-btn').exists()).toBeTruthy()
    expect(wrapper.text()).toBe("$t('counter') 0")
  })

  it('has default Translation German', () => {
    const $Backup = config.global.mocks.$t
    config.global.mocks.$t = config.global.mocks.i18n$t
    const wrapper = mount(ClickCounter)
    expect(wrapper.text()).toBe('Zähler 0')
    config.global.mocks.$t = $Backup
  })
})
