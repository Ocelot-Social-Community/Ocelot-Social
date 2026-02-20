import { mount } from '@vue/test-utils'
import request from './request.vue'

const localVue = global.localVue

const stubs = {
  'nuxt-link': true,
}

describe('request.vue', () => {
  let wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $apollo: {
        loading: false,
      },
      $router: {
        push: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(request, { mocks, localVue, stubs })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.findAll('.ds-form')).toHaveLength(1)
    })

    it('navigates to enter-nonce on handlePasswordResetRequested', () => {
      wrapper.vm.handlePasswordResetRequested({ email: 'mail@example.org' })
      expect(mocks.$router.push).toHaveBeenCalledWith({
        path: 'enter-nonce',
        query: { email: 'mail@example.org' },
      })
    })
  })
})
