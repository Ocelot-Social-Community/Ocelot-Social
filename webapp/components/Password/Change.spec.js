import { mount } from '@vue/test-utils'
import ChangePassword from './Change.vue'

const localVue = global.localVue

describe('ChangePassword.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      validate: jest.fn(),
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
      $t: jest.fn(),
      $store: {
        commit: jest.fn(),
      },
      $apollo: {
        mutate: jest
          .fn()
          .mockRejectedValue({ message: 'Ouch!' })
          .mockResolvedValueOnce({ data: { changePassword: 'NEWTOKEN' } }),
      },
    }
  })

  describe('mount', () => {
    let wrapper
    const Wrapper = () => {
      return mount(ChangePassword, { mocks, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders three input fields', () => {
      expect(wrapper.findAll('input')).toHaveLength(3)
    })

    describe('validations', () => {
      it('invalid', () => {
        expect(wrapper.vm.disabled).toBe(true)
      })

      describe('old password and new password', () => {
        describe('match', () => {
          beforeEach(() => {
            wrapper.find('input#oldPassword').setValue('some secret')
            wrapper.find('input#password').setValue('some secret')
          })

          it('invalid', () => {
            expect(wrapper.vm.disabled).toBe(true)
          })

          it.skip('displays a warning', () => {
            const calls = mocks.validate.mock.calls
            const expected = [['change-password.validations.old-and-new-password-match']]
            expect(calls).toEqual(expect.arrayContaining(expected))
          })
        })
      })

      describe('new password and confirmation', () => {
        describe('mismatch', () => {
          it.todo('invalid')
          it.todo('displays a warning')
        })

        describe('match', () => {
          describe('and old password mismatch', () => {
            it.todo('valid')
          })

          describe('clicked', () => {
            it.todo('sets loading')
          })
        })
      })
    })

    describe('given valid input', () => {
      beforeEach(() => {
        wrapper.find('input#oldPassword').setValue('supersecret')
        wrapper.find('input#password').setValue('superdupersecret')
        wrapper.find('input#passwordConfirmation').setValue('superdupersecret')
      })

      describe('submit form', () => {
        beforeEach(async () => {
          await wrapper.find('form').trigger('submit')
        })

        it('calls changePassword mutation', () => {
          expect(mocks.$apollo.mutate).toHaveBeenCalled()
        })

        it('passes form data as variables', () => {
          expect(mocks.$apollo.mutate.mock.calls[0][0]).toEqual(
            expect.objectContaining({
              variables: {
                oldPassword: 'supersecret',
                password: 'superdupersecret',
                passwordConfirmation: 'superdupersecret',
              },
            }),
          )
        })

        describe('mutation resolves', () => {
          beforeEach(() => {
            wrapper.find('form').trigger('submit')
          })

          it('calls auth/SET_TOKEN with response', () => {
            expect(mocks.$store.commit).toHaveBeenCalledWith('auth/SET_TOKEN', 'NEWTOKEN')
          })

          it('displays success message', () => {
            expect(mocks.$t).toHaveBeenCalledWith('settings.security.change-password.success')
            expect(mocks.$toast.success).toHaveBeenCalled()
          })
        })

        describe('mutation rejects', () => {
          beforeEach(async () => {
            await wrapper.find('input#oldPassword').setValue('supersecret')
            await wrapper.find('input#password').setValue('supersecret')
            await wrapper.find('input#passwordConfirmation').setValue('supersecret')
            await wrapper.find('form').trigger('submit')
          })

          it('displays error message', async () => {
            expect(mocks.$toast.error).toHaveBeenCalledWith('Ouch!')
          })
        })
      })
    })
  })
})
