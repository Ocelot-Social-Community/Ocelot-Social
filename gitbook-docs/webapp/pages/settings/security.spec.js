import { mount } from '@vue/test-utils'
import Security from './security.vue'

const localVue = global.localVue

describe('security.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Security, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.classes('base-card')).toBe(true)
    })
  })
})
