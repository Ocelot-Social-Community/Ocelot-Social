import { mount } from '@vue/test-utils'
import Logout from './logout.vue'

const localVue = global.localVue

describe('logout.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $store: {
        dispatch: jest.fn(),
      },
      $router: {
        replace: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(Logout, {
        mocks,
        localVue,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('div')).toBe(true)
    })

    it('logs out and redirects to login', () => {
      expect(mocks.$store.dispatch).toBeCalledWith('auth/logout')
      expect(mocks.$router.replace).toBeCalledWith('/login')
    })
  })
})
