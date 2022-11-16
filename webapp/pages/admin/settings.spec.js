import { mount } from '@vue/test-utils'
import Settings from './settings.vue'

const localVue = global.localVue

describe('settings.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $apollo: {
        loading: false,
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Settings, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.base-card')).toBe(true)
    })
  })
})
