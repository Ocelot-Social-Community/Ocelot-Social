import { mount } from '@vue/test-utils'
import { beforeEach, expect, describe, it } from 'vitest'
import { Component, h } from 'vue'
import { VApp } from 'vuetify/components'

import DefaultLayout from './DefaultLayout.vue'

describe('LogoAvatar', () => {
  const Wrapper = () => {
    return mount(VApp, {
      slots: {
        default: h(DefaultLayout as Component),
      },
    })
  }
  let wrapper: ReturnType<typeof Wrapper>

  beforeEach(() => {
    wrapper = Wrapper()
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })
})
