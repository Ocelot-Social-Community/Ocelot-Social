import { mount } from '@vue/test-utils'
import PasswordForm from './PasswordForm.vue'

const localVue = global.localVue

describe('PasswordForm.vue', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
    }
  })

  const Wrapper = (props = {}) => {
    return mount(PasswordForm, { mocks, localVue, propsData: props })
  }

  describe('without requireOldPassword', () => {
    let wrapper

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders two input fields (new password, confirm)', () => {
      expect(wrapper.findAll('input')).toHaveLength(2)
    })

    it('does not render old password field', () => {
      expect(wrapper.find('input#oldPassword').exists()).toBe(false)
    })

    it('renders new password field', () => {
      expect(wrapper.find('input#password').exists()).toBe(true)
    })

    it('renders password confirmation field', () => {
      expect(wrapper.find('input#passwordConfirmation').exists()).toBe(true)
    })

    it('renders submit button', () => {
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })

    it('renders password strength indicator', () => {
      expect(wrapper.findComponent({ name: 'PasswordMeter' }).exists()).toBe(true)
    })

    describe('submit with empty fields', () => {
      it('does not emit submit', async () => {
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('submit')).toBeFalsy()
      })
    })

    describe('submit with mismatched passwords', () => {
      beforeEach(async () => {
        await wrapper.find('input#password').setValue('supersecret')
        await wrapper.find('input#passwordConfirmation').setValue('different')
      })

      it('does not emit submit', async () => {
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('submit')).toBeFalsy()
      })
    })

    describe('submit with valid input', () => {
      beforeEach(async () => {
        await wrapper.find('input#password').setValue('supersecret')
        await wrapper.find('input#passwordConfirmation').setValue('supersecret')
      })

      it('emits submit with form data', async () => {
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('submit')).toBeTruthy()
        expect(wrapper.emitted('submit')[0][0]).toEqual({
          password: 'supersecret',
          passwordConfirmation: 'supersecret',
        })
      })

      it('sets loading state on submit', async () => {
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.loading).toBe(true)
      })
    })

    describe('done()', () => {
      it('resets loading and form fields', async () => {
        await wrapper.find('input#password').setValue('supersecret')
        await wrapper.find('input#passwordConfirmation').setValue('supersecret')
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()

        wrapper.vm.done()
        expect(wrapper.vm.loading).toBe(false)
        expect(wrapper.vm.formData.password).toBe('')
        expect(wrapper.vm.formData.passwordConfirmation).toBe('')
      })
    })

    describe('fail()', () => {
      it('resets loading but keeps form data', async () => {
        await wrapper.find('input#password').setValue('supersecret')
        await wrapper.find('input#passwordConfirmation').setValue('supersecret')
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()

        wrapper.vm.fail()
        expect(wrapper.vm.loading).toBe(false)
        expect(wrapper.vm.formData.password).toBe('supersecret')
      })
    })
  })

  describe('with requireOldPassword', () => {
    let wrapper

    beforeEach(() => {
      wrapper = Wrapper({ requireOldPassword: true })
    })

    it('renders three input fields', () => {
      expect(wrapper.findAll('input')).toHaveLength(3)
    })

    it('renders old password field', () => {
      expect(wrapper.find('input#oldPassword').exists()).toBe(true)
    })

    describe('submit without old password', () => {
      beforeEach(async () => {
        await wrapper.find('input#password').setValue('supersecret')
        await wrapper.find('input#passwordConfirmation').setValue('supersecret')
      })

      it('does not emit submit', async () => {
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('submit')).toBeFalsy()
      })
    })

    describe('submit with all fields valid', () => {
      beforeEach(async () => {
        await wrapper.find('input#oldPassword').setValue('oldsecret')
        await wrapper.find('input#password').setValue('supersecret')
        await wrapper.find('input#passwordConfirmation').setValue('supersecret')
      })

      it('emits submit with all form data including oldPassword', async () => {
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('submit')[0][0]).toEqual({
          oldPassword: 'oldsecret',
          password: 'supersecret',
          passwordConfirmation: 'supersecret',
        })
      })
    })

    describe('done()', () => {
      it('also resets oldPassword field', async () => {
        await wrapper.find('input#oldPassword').setValue('oldsecret')
        await wrapper.find('input#password').setValue('supersecret')
        await wrapper.find('input#passwordConfirmation').setValue('supersecret')
        await wrapper.find('form').trigger('submit')
        await wrapper.vm.$nextTick()

        wrapper.vm.done()
        expect(wrapper.vm.formData.oldPassword).toBe('')
        expect(wrapper.vm.formData.password).toBe('')
        expect(wrapper.vm.formData.passwordConfirmation).toBe('')
      })
    })
  })
})
