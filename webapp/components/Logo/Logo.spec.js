import { mount } from '@vue/test-utils'
import Logo from './Logo.vue'

const localVue = global.localVue

describe('Logo.vue', () => {
  let mocks, propsData, wrapper

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    propsData = {
      logoType: 'header',
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Logo, { mocks, localVue, propsData })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.ds-logo')).toHaveLength(1)
    })
  })

  describe('non-header logo type without tablet/mobile width defaults', () => {
    // welcome/signup/logout/passwordReset only define widthDefault; tablet + mobile must fall back to
    // it instead of emitting an invalid `width: undefined;`.
    const Wrapper = () => mount(Logo, { mocks, localVue, propsData: { logoType: 'welcome' } })

    it('falls back to widthDefault for tablet and mobile widths', () => {
      wrapper = Wrapper()
      for (const selector of ['.ds-logo-desktop', '.ds-logo-tablet', '.ds-logo-mobile']) {
        const style = wrapper.find(selector).attributes('style')
        expect(style).toContain('200px') // welcome widthDefault
        expect(style).not.toContain('undefined')
      }
    })
  })
})
