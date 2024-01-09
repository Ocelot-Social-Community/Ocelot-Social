import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Component, h } from 'vue'
import { VApp } from 'vuetify/components'

import AppPage from './+Page.vue'

describe('DataPrivacyPage', () => {
  const wrapper = mount(VApp, {
    slots: {
      default: h(AppPage as Component),
    },
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })
})
