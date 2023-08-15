import { mount } from '@vue/test-utils'
import moderation from './moderation.vue'

const stubs = {
  'nuxt-child': true,
}

const localVue = global.localVue

describe('moderation.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(moderation, {
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
