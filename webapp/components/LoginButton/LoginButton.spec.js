import { config, mount } from '@vue/test-utils'
import LoginButton from './LoginButton.vue'

config.stubs['v-popover'] = '<span><slot /></span>'

describe('LoginButton.vue', () => {
  let wrapper
  let mocks
  let propsData

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      navigator: {
        clipboard: {
          writeText: jest.fn(),
        },
      },
    }
    propsData = {}
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(LoginButton, { mocks, propsData })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.contains('.login-button')).toBe(true)
    })

    it('open popup', () => {
      wrapper.find('.base-button').trigger('click')
      expect(wrapper.contains('.login-button')).toBe(true)
    })
  })
})
