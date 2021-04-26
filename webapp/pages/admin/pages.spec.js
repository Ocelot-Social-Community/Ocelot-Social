import { mount } from '@vue/test-utils'
import Pages from './pages.vue'

const localVue = global.localVue

describe('pages.vue', () => {
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
      return mount(Pages, {
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
