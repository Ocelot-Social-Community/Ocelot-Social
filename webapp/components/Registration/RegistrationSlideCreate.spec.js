import { shallowMount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import RegistrationSlideCreate from './RegistrationSlideCreate.vue'

const localVue = global.localVue

describe('RegistrationSlideCreate', () => {
  let mocks
  let propsData
  let policyValues

  const baseCollected = () => ({
    email: 'test@example.org',
    name: '',
    password: '',
    passwordConfirmation: '',
    termsAndConditionsConfirmed: false,
    receiveCommunicationAsEmailsEtcConfirmed: false,
    locationName: '',
    inviteCode: 'INVITE',
    nonce: '1234',
  })

  const stubs = { 'nuxt-link': true }
  const Wrapper = () => shallowMount(RegistrationSlideCreate, { mocks, localVue, propsData, stubs })

  beforeEach(() => {
    policyValues = { askForRealName: false, requireLocation: false }
    mocks = {
      $t: jest.fn((key) => key),
      $policy: { get: (key) => policyValues[key] },
      $i18n: { locale: () => 'en' },
      $apollo: { mutate: jest.fn().mockResolvedValue({}) },
      $store: { dispatch: jest.fn().mockResolvedValue() },
      $toast: { success: jest.fn() },
      $router: { push: jest.fn() },
    }
    propsData = {
      sliderData: {
        collectedInputData: baseCollected(),
        setSliderValuesCallback: jest.fn(),
        sliders: [{ data: { response: {} } }],
      },
    }
  })

  describe('render states', () => {
    it('renders the form by default', () => {
      const wrapper = Wrapper()
      expect(wrapper.find('.create-account-card').exists()).toBe(true)
    })

    it('renders the success state', async () => {
      const wrapper = Wrapper()
      wrapper.setData({ response: 'success' })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.ds-text-success').exists()).toBe(true)
    })

    it('renders the error state', async () => {
      const wrapper = Wrapper()
      wrapper.setData({ response: 'error' })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.ds-text-danger').exists()).toBe(true)
    })
  })

  describe('mounted: hydrating from collected input', () => {
    it('fills the single name field when real names are not asked for', () => {
      propsData.sliderData.collectedInputData.name = 'Peter'
      const wrapper = Wrapper()
      expect(wrapper.vm.formData.name).toBe('Peter')
    })

    it('splits given/sur name when real names are asked for', () => {
      policyValues.askForRealName = true
      propsData.sliderData.collectedInputData.name = 'Peter\u2004Lustig'
      const wrapper = Wrapper()
      expect(wrapper.vm.formData.givenName).toBe('Peter')
      expect(wrapper.vm.formData.surName).toBe('Lustig')
    })

    it('falls back to an empty surname when the collected name has no second part', () => {
      policyValues.askForRealName = true
      propsData.sliderData.collectedInputData.name = 'Solo'
      const wrapper = Wrapper()
      expect(wrapper.vm.formData.givenName).toBe('Solo')
      expect(wrapper.vm.formData.surName).toBe('')
    })

    it('leaves the name parts empty when real names are asked for but no name was collected', () => {
      policyValues.askForRealName = true
      propsData.sliderData.collectedInputData.name = ''
      const wrapper = Wrapper()
      expect(wrapper.vm.formData.givenName).toBe('')
      expect(wrapper.vm.formData.surName).toBe('')
    })

    it('registers the slider value callback', () => {
      Wrapper()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalled()
    })
  })

  describe('computed', () => {
    it('formLocationName resolves an object value', () => {
      const wrapper = Wrapper()
      wrapper.setData({ locationName: { value: 'Berlin' } })
      expect(wrapper.vm.formLocationName).toBe('Berlin')
    })

    it('formLocationName resolves a direct string', () => {
      const wrapper = Wrapper()
      wrapper.setData({ locationName: 'Hamburg' })
      expect(wrapper.vm.formLocationName).toBe('Hamburg')
    })

    it('formLocationName falls back to empty string', () => {
      const wrapper = Wrapper()
      wrapper.setData({ locationName: 42 })
      expect(wrapper.vm.formLocationName).toBe('')
    })

    it('validInput is false when requirements are unmet', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.validInput).toBe(false)
    })

    it('validInput is true once all requirements (incl. required location) are met', () => {
      policyValues.requireLocation = true
      const wrapper = Wrapper()
      wrapper.setData({
        formData: {
          ...wrapper.vm.formData,
          name: 'Peter',
          password: 'pw',
          passwordConfirmation: 'pw',
        },
        termsAndConditionsConfirmed: true,
        receiveCommunicationAsEmailsEtcConfirmed: true,
        locationName: 'Berlin',
      })
      expect(wrapper.vm.validInput).toBeTruthy()
    })

    it('validInput checks given/sur name length when real names are required', () => {
      policyValues.askForRealName = true
      const wrapper = Wrapper()
      wrapper.setData({
        formData: {
          ...wrapper.vm.formData,
          givenName: 'Pe',
          surName: 'Lu',
          password: 'pw',
          passwordConfirmation: 'pw',
        },
        termsAndConditionsConfirmed: true,
        receiveCommunicationAsEmailsEtcConfirmed: true,
      })
      expect(wrapper.vm.validInput).toBeTruthy()
    })

    it('toggles the password reveal icons', () => {
      const wrapper = Wrapper()
      const closed = wrapper.vm.passwordIcon
      wrapper.setData({ showPassword: true, showPasswordConfirm: true })
      expect(wrapper.vm.passwordIcon).not.toBe(closed)
      expect(wrapper.vm.passwordConfirmIcon).toBe(wrapper.vm.icons.eyeSlash)
    })
  })

  describe('watchers trigger validation', () => {
    it('re-validates on terms / communication / location changes', () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'sendValidation')
      const { watch } = wrapper.vm.$options
      // Watchers may be merged into arrays by Vue's option merge; normalise to a fn.
      const invoke = (key) => [].concat(watch[key]).forEach((h) => h.call(wrapper.vm))
      invoke('termsAndConditionsConfirmed')
      invoke('receiveCommunicationAsEmailsEtcConfirmed')
      invoke('locationName')
      expect(spy).toHaveBeenCalledTimes(3)
    })
  })

  describe('methods', () => {
    it('buildName joins given/sur name with the em-space when real names are asked for', () => {
      policyValues.askForRealName = true
      const wrapper = Wrapper()
      expect(wrapper.vm.buildName({ givenName: 'Peter', surName: 'Lustig' })).toBe(
        'Peter\u2004Lustig',
      )
    })

    it('buildName returns the plain name otherwise', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.buildName({ name: 'Peter' })).toBe('Peter')
    })

    it('sendValidation forwards the collected data to the slider callback', () => {
      const wrapper = Wrapper()
      propsData.sliderData.setSliderValuesCallback.mockClear()
      wrapper.vm.sendValidation()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(
        wrapper.vm.validInput,
        expect.objectContaining({ collectedInputData: expect.any(Object) }),
      )
    })

    it('handleInput and handleInputValid both re-validate', async () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'sendValidation')
      await wrapper.vm.handleInput()
      await wrapper.vm.handleInputValid()
      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('onNextClick submits and returns true', () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'submit').mockImplementation(() => {})
      expect(wrapper.vm.onNextClick()).toBe(true)
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('submit', () => {
    beforeEach(() => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn()
        return 0
      })
    })

    afterEach(() => {
      global.setTimeout.mockRestore()
    })

    it('on success: mutates, logs in and redirects to the home page', async () => {
      const wrapper = Wrapper()
      await wrapper.vm.submit()
      await flushPromises()
      expect(mocks.$apollo.mutate).toHaveBeenCalled()
      expect(wrapper.vm.response).toBe('success')
      expect(mocks.$store.dispatch).toHaveBeenCalledWith('auth/login', {
        email: 'test@example.org',
        password: '',
      })
      expect(mocks.$router.push).toHaveBeenCalledWith('/')
    })

    it('on success with a public-group invite: redirects to the group', async () => {
      propsData.sliderData.sliders[0].data.response = {
        validateInviteCode: { invitedTo: { groupType: 'public', slug: 'my-group' } },
      }
      const wrapper = Wrapper()
      await wrapper.vm.submit()
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith('/groups/my-group')
    })

    it('on failure: sets the error response and stops loading', async () => {
      mocks.$apollo.mutate.mockRejectedValueOnce(new Error('boom'))
      const wrapper = Wrapper()
      await wrapper.vm.submit()
      await flushPromises()
      expect(wrapper.vm.response).toBe('error')
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(null, {
        sliderSettings: { buttonLoading: false },
      })
    })
  })

  describe('toggleShowPassword', () => {
    it('toggles the password field and focuses it', async () => {
      const wrapper = Wrapper()
      const focus = jest.fn()
      wrapper.vm.$refs.password = { $el: { children: [null, { children: [{ focus }] }] } }
      wrapper.vm.toggleShowPassword('password')
      expect(wrapper.vm.showPassword).toBe(true)
      await wrapper.vm.$nextTick()
      expect(focus).toHaveBeenCalled()
      expect(wrapper.emitted('focus')).toBeTruthy()
    })

    it('toggles the confirm-password field and focuses it', async () => {
      const wrapper = Wrapper()
      const focus = jest.fn()
      wrapper.vm.$refs.confirmPassword = { $el: { children: [null, { children: [{ focus }] }] } }
      wrapper.vm.toggleShowPassword('confirmPassword')
      expect(wrapper.vm.showPasswordConfirm).toBe(true)
      await wrapper.vm.$nextTick()
      expect(focus).toHaveBeenCalled()
      expect(wrapper.emitted('focus')).toBeTruthy()
    })
  })
})
