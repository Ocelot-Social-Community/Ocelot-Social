import { mount } from '@vue/test-utils'
import Request from './Request'

const localVue = global.localVue

describe('Request', () => {
  let wrapper, Wrapper, mocks, stubs

  beforeEach(() => {
    mocks = {
      $toast: {
        success: jest.fn(),
        error: jest.fn(),
      },
      $t: jest.fn((t) => t),
      $apollo: {
        loading: false,
        mutate: jest.fn().mockResolvedValue({ data: { reqestPasswordReset: true } }),
      },
      $i18n: {
        locale: () => 'en',
      },
    }
    stubs = {
      LocaleSwitch: true,
      'sweetalert-icon': true,
      'client-only': true,
      'nuxt-link': true,
    }
  })

  describe('mount', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    Wrapper = () => {
      return mount(Request, {
        mocks,
        localVue,
        stubs,
      })
    }

    it('renders a password reset form', () => {
      wrapper = Wrapper()
      expect(wrapper.find('form').exists()).toBe(true)
    })

    describe('submit', () => {
      beforeEach(async () => {
        wrapper = Wrapper()
        wrapper.find('input#email').setValue('mail@example.org')
        await wrapper.find('form').trigger('submit')
      })

      it('calls requestPasswordReset graphql mutation', () => {
        expect(mocks.$apollo.mutate).toHaveBeenCalled()
      })

      it('delivers email to backend', () => {
        const expected = expect.objectContaining({ variables: { email: 'mail@example.org' } })
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
      })

      it('hides form to avoid re-submission', () => {
        expect(wrapper.find('form').exists()).not.toBeTruthy()
      })

      it('displays a message that a password email was requested', () => {
        const expected = [
          'components.password-reset.request.form.submitted',
          { email: 'mail@example.org' },
        ]
        expect(mocks.$t).toHaveBeenCalledWith(...expected)
      })

      describe('after animation', () => {
        beforeEach(jest.runAllTimers)

        it('emits `handleSubmitted`', () => {
          expect(wrapper.emitted('handleSubmitted')).toEqual([[{ email: 'mail@example.org' }]])
        })
      })
    })

    describe('capital letters in a gmail address', () => {
      beforeEach(async () => {
        wrapper = Wrapper()
        wrapper.find('input#email').setValue('mAiL@gmail.com')
        await wrapper.find('form').trigger('submit')
      })

      it('normalizes email to lower case letters', () => {
        const expected = expect.objectContaining({ variables: { email: 'mail@gmail.com' } })
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(expected)
      })
    })

    describe('backend throws an error', () => {
      beforeEach(() => {
        mocks.$apollo.mutate = jest.fn().mockRejectedValue({
          message: 'Ouch!',
        })
        wrapper = Wrapper()
        wrapper.find('input#email').setValue('mail@gmail.com')
        wrapper.find('form').trigger('submit')
      })

      it('display a toast error', () => {
        expect(mocks.$toast.error).toHaveBeenCalled()
      })
    })
  })
})
