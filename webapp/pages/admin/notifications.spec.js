import { mount } from '@vue/test-utils'
import Notifications from './notifications.vue'

const localVue = global.localVue

describe('notifications.vue', () => {
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
      return mount(Notifications, {
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
