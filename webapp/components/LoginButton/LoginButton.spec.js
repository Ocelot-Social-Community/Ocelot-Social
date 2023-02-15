import { mount } from '@vue/test-utils'
import LoginButton from './LoginButton.vue'

const stubs = {
  'v-popover': true,
}

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
      return mount(LoginButton, { mocks, propsData, stubs })
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
