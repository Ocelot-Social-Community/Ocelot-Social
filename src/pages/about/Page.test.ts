import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Component, h } from 'vue'
import { VApp } from 'vuetify/components'

import AboutPage from './+Page.vue'
import { title } from './+title'

describe('AboutPage', () => {
  const wrapper = mount(VApp, {
    slots: {
      default: h(AboutPage as Component),
    },
  })

  it('title returns correct title', () => {
    expect(title).toBe('IT4C | About')
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })
})
