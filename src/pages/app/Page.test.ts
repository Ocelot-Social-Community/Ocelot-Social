import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Component, h } from 'vue'
import { VApp } from 'vuetify/components'

import AppPage from './+Page.vue'
import { title } from './+title'

describe('AppPage', () => {
  const wrapper = mount(VApp, {
    slots: {
      default: h(AppPage as Component),
    },
  })

  it('title returns correct title', () => {
    expect(title).toBe('IT4C | App')
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })
})
