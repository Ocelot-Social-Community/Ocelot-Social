import { mount } from '@vue/test-utils'
import ChangePassword from './Change.vue'

const localVue = global.localVue

describe('ChangePassword.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
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
      beforeEach(() => {
        // $t must return strings so async-validator produces proper error messages
        // (jest.fn() returns undefined which causes Error(undefined) → DsInputError type warning)
        mocks.$t = jest.fn((key) => key)
        wrapper = Wrapper()
      })

      describe('new password and confirmation', () => {
        describe('mismatch', () => {
          beforeEach(async () => {
            await wrapper.find('input#oldPassword').setValue('oldsecret')
            await wrapper.find('input#password').setValue('superdupersecret')
            await wrapper.find('input#passwordConfirmation').setValue('different')
          })

          it('does not submit the form', async () => {
            mocks.$apollo.mutate.mockReset()
            await wrapper.find('form').trigger('submit')
            await wrapper.vm.$nextTick()
            expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
          })

          it('displays a validation error', async () => {
            await wrapper.find('form').trigger('submit')
            await wrapper.vm.$nextTick()
            const dsForm = wrapper.findComponent({ name: 'DsForm' })
            expect(dsForm.vm.errors).toHaveProperty('passwordConfirmation')
          })
        })

        describe('match', () => {
          beforeEach(async () => {
            await wrapper.find('input#oldPassword').setValue('oldsecret')
            await wrapper.find('input#password').setValue('superdupersecret')
            await wrapper.find('input#passwordConfirmation').setValue('superdupersecret')
          })

          it('passes validation and submits', async () => {
            mocks.$apollo.mutate.mockReset()
            mocks.$apollo.mutate.mockResolvedValue({ data: { changePassword: 'TOKEN' } })
            await wrapper.find('form').trigger('submit')
            expect(mocks.$apollo.mutate).toHaveBeenCalled()
          })

          describe('while mutation is pending', () => {
            it('sets loading while mutation is pending', async () => {
              mocks.$apollo.mutate.mockReset()
              let resolvePromise
              mocks.$apollo.mutate.mockReturnValue(
                new Promise((resolve) => {
                  resolvePromise = resolve
                }),
              )

              const promise = wrapper.vm.handleSubmit()
              expect(wrapper.vm.loading).toBe(true)

              resolvePromise({ data: { changePassword: 'TOKEN' } })
              await promise
              expect(wrapper.vm.loading).toBe(false)
            })
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
