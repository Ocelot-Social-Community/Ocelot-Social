import { mount } from '@vue/test-utils'
import Invite from './invite.vue'

const localVue = global.localVue

describe('invite.vue', () => {
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
      return mount(Invite, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('.ds-section')).toBe(true)
    })
  })
})
