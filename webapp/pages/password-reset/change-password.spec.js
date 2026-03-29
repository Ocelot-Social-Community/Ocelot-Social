import { mount } from '@vue/test-utils'
import changePassword from './change-password'

const localVue = global.localVue

const stubs = {
  'sweetalert-icon': true,
  'nuxt-link': true,
}

describe('change-password', () => {
  let wrapper
  let Wrapper
  let mocks

  beforeEach(() => {
    mocks = {
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $t: jest.fn((key) => key),
      $route: {
        query: { email: 'mail@example.org', nonce: '12345' },
      },
      $router: {
        push: jest.fn(),
      },
      $apollo: {
        loading: false,
        mutate: jest.fn().mockResolvedValue({ data: { resetPassword: true } }),
      },
    }
  })

  describe('mount', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    Wrapper = () => {
      return mount(changePassword, {
        mocks,
        localVue,
        stubs,
      })
    }

    it('renders', () => {
      wrapper = Wrapper()
      expect(wrapper.findAll('form')).toHaveLength(1)
    })

    describe('submitting new password', () => {
      beforeEach(() => {
        wrapper = Wrapper()
        wrapper.find('input#password').setValue('supersecret')
        wrapper.find('input#passwordConfirmation').setValue('supersecret')
        wrapper.find('form').trigger('submit')
      })

      it('calls resetPassword graphql mutation', () => {
        expect(mocks.$apollo.mutate).toHaveBeenCalled()
      })

      it('delivers new password to backend', () => {
        const expected = expect.objectContaining({
          variables: { nonce: '12345', email: 'mail@example.org', password: 'supersecret' },
        })
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
      })

      describe('password reset successful', () => {
        it('displays success message', () => {
          const expected = 'components.password-reset.change-password.success'
          expect(mocks.$t).toHaveBeenCalledWith(expected)
        })

        describe('after animation', () => {
          beforeEach(jest.runAllTimers)

          it('redirects to login', () => {
            expect(mocks.$router.push).toHaveBeenCalledWith('/login')
          })
        })
      })

      describe('password reset not successful', () => {
        beforeEach(() => {
          mocks.$apollo.mutate = jest.fn().mockRejectedValue({
            message: 'Ouch!',
          })
          wrapper = Wrapper()
          wrapper.find('input#password').setValue('supersecret')
          wrapper.find('input#passwordConfirmation').setValue('supersecret')
          wrapper.find('form').trigger('submit')
        })

        it('display a toast error', () => {
          expect(mocks.$toast.error).toHaveBeenCalled()
        })
      })
    })
  })
})
