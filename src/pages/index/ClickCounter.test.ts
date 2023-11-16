import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import ClickCounter from './ClickCounter.vue'

describe('clickCounter', () => {
  const wrapper = mount(ClickCounter)

  it('renders Button with a Counter of 0', () => {
    expect(wrapper.find('v-btn').exists()).toBeTruthy()
    expect(wrapper.text()).toBe("$t('counter') 0")
  })
})
