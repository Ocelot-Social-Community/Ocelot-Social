import { mount } from '@vue/test-utils'
import { navigate } from 'vike/client/router'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import VikeBtn from './VikeBtn.vue'

vi.mock('vike/client/router')
vi.mocked(navigate).mockResolvedValue()

describe('VikeBtn', () => {
  const Wrapper = () => {
    return mount(VikeBtn, {
      attrs: { href: '/some-path' },
    })
  }
  let wrapper: ReturnType<typeof Wrapper>

  beforeEach(() => {
    wrapper = Wrapper()
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })

  it('icon is hidden', () => {
    expect(wrapper.find('.v-icon').exists()).toBe(false)
  })

  describe('with href attribute app', () => {
    beforeEach(async () => {
      await wrapper.setProps({ href: '/app' } as Partial<object>)
    })

    it('has flat variant', () => {
      expect(wrapper.classes()).toContain('v-btn--variant-flat')
    })
  })

  describe('with same href attribute', () => {
    beforeEach(async () => {
      await wrapper.setProps({ href: '/some-url' } as Partial<object>)
    })

    it('has tonal variant', () => {
      expect(wrapper.classes()).toContain('v-btn--variant-tonal')
    })
  })

  describe('click on button', () => {
    it('calls navigate method with given href', async () => {
      await wrapper.find('.v-btn').trigger('click')
      expect(navigate).toHaveBeenCalledWith('/some-path')
    })
  })
})
