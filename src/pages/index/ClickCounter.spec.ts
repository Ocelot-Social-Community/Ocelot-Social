import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import ClickCounter from './ClickCounter.vue'

describe('ClickCounter', () => {
  const wrapper = mount(ClickCounter)

  it('renders Button with a Counter of 0', () => {
    expect(wrapper.find('v-btn').exists()).toBe(true)
    expect(wrapper.text()).toBe("$t('counter') 0")
  })
})
