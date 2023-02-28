import { mount } from '@vue/test-utils'
import Signup, { SignupMutation } from './Signup'

const localVue = global.localVue

const stubs = {
  'sweetalert-icon': true,
  'nuxt-link': true,
}

describe('Signup', () => {
  let wrapper
  let Wrapper
  let mocks
  let propsData

  beforeEach(() => {
    mocks = {
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $t: jest.fn(),
      $apollo: {
        loading: false,
        mutate: jest.fn().mockResolvedValue({ data: { Signup: { email: 'mail@example.org' } } }),
      },
    }
    propsData = {}
  })

  describe('mount', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    Wrapper = () => {
      return mount(Signup, {
        mocks,
        propsData,
        localVue,
        stubs,
      })
    }

    describe('without invitation code', () => {
      it('renders signup form', () => {
        wrapper = Wrapper()
        expect(wrapper.find('form').exists()).toBe(true)
      })

      describe('submit', () => {
        beforeEach(async () => {
          wrapper = Wrapper()
          wrapper.find('input#email').setValue('mAIL@exAMPLE.org')
          await wrapper.find('form').trigger('submit')
        })

        it('calls Signup graphql mutation', () => {
          const expected = expect.objectContaining({ mutation: SignupMutation })
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
        })

        it('delivers email to backend', () => {
          const expected = expect.objectContaining({
            mutation: SignupMutation,
            variables: { email: 'mAIL@exAMPLE.org', inviteCode: null },
          })
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
        })

        it('hides form to avoid re-submission', () => {
          expect(wrapper.find('form').exists()).not.toBeTruthy()
        })

        it('displays a message that a mail for email verification was sent', () => {
          const expected = [
            'components.registration.signup.form.success',
            { email: 'mail@example.org' },
          ]
          expect(mocks.$t).toHaveBeenCalledWith(...expected)
        })

        describe('mutation is rejected', () => {
          beforeEach(async () => {
            mocks.$apollo.mutate = jest.fn().mockRejectedValue({
              message: 'Ouch!',
            })
            wrapper = Wrapper()
            wrapper.find('input#email').setValue('mail@example.org')
            await wrapper.find('form').trigger('submit')
          })

          it('displays error message', async () => {
            expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch!')
          })
        })

        describe('after animation', () => {
          beforeEach(jest.runAllTimers)

          it('emits `submit`', () => {
            expect(wrapper.emitted('submit')).toEqual([[{ email: 'mail@example.org' }]])
          })
        })
      })
    })
  })
})
