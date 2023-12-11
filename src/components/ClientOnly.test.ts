import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import ClientOnly from './ClientOnly.vue'

describe('ClientOnly', () => {
  const wrapper = mount(ClientOnly)

  it('renders content if mounted', () => {
    expect(wrapper.isVisible()).toBeTruthy()
  })
})
