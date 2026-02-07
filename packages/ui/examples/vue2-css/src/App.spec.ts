import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from './App.vue'

describe('vue 2 CSS Example App', () => {
  it('mounts successfully', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const wrapper = mount(App)
    expect(wrapper.exists()).toBeTruthy()
  })

  it('displays the correct heading', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const wrapper = mount(App)
    expect(wrapper.find('h1').text()).toBe('Vue 2.7 + CSS + @ocelot-social/ui')
  })
})
