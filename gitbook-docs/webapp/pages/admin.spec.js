import { mount } from '@vue/test-utils'
import admin from './admin.vue'

const stubs = {
  'nuxt-child': true,
}

const localVue = global.localVue

describe('admin.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(admin, {
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
