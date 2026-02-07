import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from './App.vue'

describe('vue 3 Example App', () => {
  it('mounts successfully', () => {
    const wrapper = mount(App)
    expect(wrapper.exists()).toBeTruthy()
  })

  it('displays the correct heading', () => {
    const wrapper = mount(App)
    expect(wrapper.find('h1').text()).toBe('Vue 3 + @ocelot-social/ui')
  })
})
