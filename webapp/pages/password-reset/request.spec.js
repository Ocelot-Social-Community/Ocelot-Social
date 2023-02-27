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
      /* $toast: {
        success: jest.fn(),
        error: jest.fn(),
      }, */
      $t: jest.fn(),
      $apollo: {
        loading: false,
        // mutate: jest.fn().mockResolvedValue({ data: { reqestPasswordReset: true } }),
      },
      /* $router: {
        push: jest.fn()
      } */
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

    it.skip('calls "handlePasswordResetRequested" on submit', async () => {
      await jest.useFakeTimers()
      await wrapper.find('input#email').setValue('mail@example.org')
      await wrapper.findAll('.ds-form').trigger('submit')
      await jest.runAllTimers()
      expect(wrapper.emitted('handleSubmitted')).toEqual([[{ email: 'mail@example.org' }]])
      expect(mocks.$router.push).toHaveBeenCalledWith({
        path: 'enter-nonce',
        query: { email: 'mail@example.org' },
      })
    })
  })
})
