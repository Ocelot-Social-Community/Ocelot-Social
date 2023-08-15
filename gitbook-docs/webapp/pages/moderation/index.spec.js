import { mount } from '@vue/test-utils'
import Moderation from './index.vue'

const localVue = global.localVue

const stubs = {
  'client-only': true,
}

describe('moderation/index.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Moderation, { mocks, localVue, stubs })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.classes('base-card')).toBe(true)
    })
  })
})
