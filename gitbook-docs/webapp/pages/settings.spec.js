import { mount } from '@vue/test-utils'
import settings from './settings.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-child': true,
}

describe('settings.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(settings, {
        mocks,
        localVue,
        stubs,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.element.tagName).toBe('DIV')
    })
  })
})
