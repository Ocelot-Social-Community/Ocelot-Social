import { mount } from '@vue/test-utils'
import groups from './groups.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
  'client-only': true,
}

describe('groups', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(groups, {
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
