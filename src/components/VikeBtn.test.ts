import { mount } from '@vue/test-utils'
import { navigate } from 'vike/client/router'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import VikeBtn from './VikeBtn.vue'

vi.mock('vike/client/router')
vi.mocked(navigate).mockResolvedValue()
describe.skip('VikeBtn', () => {
  const Wrapper = () => {
    return mount(VikeBtn, {
      global: { provide: { [Symbol('pageContext')]: { urlPathname: 'some-url' } } },
      attrs: { href: '/some-path' },
    })
  }
  let wrapper: ReturnType<typeof Wrapper>

  beforeEach(() => {
    wrapper = Wrapper()
  })

  it('renders', () => {
    expect(wrapper.find('.v-btn').exists()).toBeTruthy()
  })

  it('icon is hidden', () => {
    expect(wrapper.find('.v-icon').exists()).toBe(false)
  })

  describe('click on button', () => {
    it('calls navigate method with given href', async () => {
      await wrapper.find('.v-btn').trigger('click')
      expect(navigate).toHaveBeenCalledWith('/some-path')
    })
  })
})
