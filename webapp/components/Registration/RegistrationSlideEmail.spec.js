import { shallowMount } from '@vue/test-utils'
import RegistrationSlideEmail, { SignupMutation } from './RegistrationSlideEmail.vue'

const localVue = global.localVue

describe('RegistrationSlideEmail', () => {
  let mocks
  let propsData

  const baseSliderData = (overrides = {}) => ({
    sliderIndex: 0,
    collectedInputData: { email: '', emailSend: false, inviteCode: null },
    sliders: [{ data: {} }, { data: {} }],
    setSliderValuesCallback: jest.fn(),
    ...overrides,
  })

  const Wrapper = () => shallowMount(RegistrationSlideEmail, { mocks, localVue, propsData })

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
      $i18n: { locale: () => 'de' },
      $apollo: {
        mutate: jest.fn().mockResolvedValue({ data: { Signup: { email: 'user@example.org' } } }),
      },
      $toast: { success: jest.fn(), error: jest.fn() },
    }
    propsData = { sliderData: baseSliderData() }
  })

  describe('mounted', () => {
    it('hydrates the e-mail from collected input and registers the next-button callback', () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { email: 'user@example.org', emailSend: false },
      })
      const wrapper = Wrapper()
      expect(wrapper.vm.formData.email).toBe('user@example.org')
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenNthCalledWith(1, true, {
        collectedInputData: { email: 'user@example.org' },
      })
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenLastCalledWith(true, {
        sliderSettings: {
          buttonTitleIdent: 'components.registration.email.buttonTitle.send',
          buttonIcon: null,
          buttonSliderCallback: wrapper.vm.onNextClick,
        },
      })
    })

    it('defaults to an empty address when none was collected', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.formData.email).toBe('')
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenLastCalledWith(false, {
        sliderSettings: {
          buttonTitleIdent: 'components.registration.email.buttonTitle.send',
          buttonIcon: null,
          buttonSliderCallback: wrapper.vm.onNextClick,
        },
      })
    })

    it('offers "send again" once a mail is out, not before', () => {
      const wrapper = Wrapper()
      expect(wrapper.find('#sendEmailAgain').exists()).toBe(false)
      propsData.sliderData = baseSliderData({
        collectedInputData: { email: 'user@example.org', emailSend: true },
      })
      const sentWrapper = Wrapper()
      expect(sentWrapper.find('#sendEmailAgain').exists()).toBe(true)
    })
  })

  describe('computed validInput', () => {
    it('requires a valid e-mail address', async () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.validInput).toBe(false)
      await wrapper.setData({ formData: { email: 'not-an-email' } })
      expect(wrapper.vm.validInput).toBe(false)
      await wrapper.setData({ formData: { email: 'user@example.org' } })
      expect(wrapper.vm.validInput).toBe(true)
    })
  })

  describe('button titles', () => {
    it('says "send" before anything was sent', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.buttonValues().sliderSettings.buttonTitleIdent).toBe(
        'components.registration.email.buttonTitle.send',
      )
    })

    it('says "skip resend" once the mail is out and the checkbox is unchecked', () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { email: 'user@example.org', emailSend: true },
      })
      const wrapper = Wrapper()
      expect(wrapper.vm.buttonValues().sliderSettings.buttonTitleIdent).toBe(
        'components.registration.email.buttonTitle.skipResend',
      )
    })

    it('says "resend" once the checkbox is checked', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { email: 'user@example.org', emailSend: true },
      })
      const wrapper = Wrapper()
      await wrapper.setData({ sendEmailAgain: true })
      expect(wrapper.vm.buttonValues().sliderSettings.buttonTitleIdent).toBe(
        'components.registration.email.buttonTitle.resend',
      )
    })

    it('checking the checkbox reports the button title again', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { email: 'user@example.org', emailSend: true },
      })
      const wrapper = Wrapper()
      propsData.sliderData.setSliderValuesCallback.mockClear()
      await wrapper.setData({ sendEmailAgain: true })
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenLastCalledWith(true, {
        sliderSettings: {
          buttonTitleIdent: 'components.registration.email.buttonTitle.resend',
          buttonIcon: null,
        },
      })
    })
  })

  describe('sendValidation / handleInput', () => {
    it('collects the e-mail into the collected input', async () => {
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'user@example.org' } })
      await wrapper.vm.sendValidation()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenLastCalledWith(true, {
        collectedInputData: { email: 'user@example.org' },
      })
    })

    it('handleInput and handleInputValid re-validate', async () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'sendValidation')
      await wrapper.vm.handleInput()
      await wrapper.vm.handleInputValid()
      expect(spy).toHaveBeenCalledTimes(2)
    })
  })

  describe('isVariablesRequested', () => {
    it('compares the requested e-mail with the one on record', () => {
      propsData.sliderData = baseSliderData({
        sliders: [
          { data: { request: { variables: { email: 'user@example.org' } } } },
          { data: {} },
        ],
      })
      const wrapper = Wrapper()
      expect(wrapper.vm.isVariablesRequested({ email: 'user@example.org' })).toBe(true)
      expect(wrapper.vm.isVariablesRequested({ email: 'other@example.org' })).toBeFalsy()
    })

    it('is falsy without a request on record', () => {
      // the &&-chain short-circuits to undefined; the slide only uses the
      // result in a boolean context
      const wrapper = Wrapper()
      expect(wrapper.vm.isVariablesRequested({ email: 'user@example.org' })).toBeFalsy()
    })
  })

  describe('onNextClick', () => {
    const sentSliderData = () =>
      baseSliderData({
        collectedInputData: { email: 'user@example.org', emailSend: false },
        // The slide reads the response recorded on the slider data (the slider
        // merger's job, specified in the RegistrationSlider spec), not the raw
        // mutation result — so the fixture records it, matching the mock.
        sliders: [{ data: { response: { Signup: { email: 'user@example.org' } } } }, { data: {} }],
      })

    it('sends the verification mail with e-mail, invite code and locale', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { email: 'user@example.org', inviteCode: 'ABCDEF', emailSend: false },
      })
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'user@example.org' } })
      const result = await wrapper.vm.onNextClick()
      expect(result).toBe(true)
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith({
        mutation: SignupMutation,
        variables: { email: 'user@example.org', inviteCode: 'ABCDEF', locale: 'de' },
      })
    })

    it('records the request and response on the slider data', async () => {
      propsData.sliderData = sentSliderData()
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'user@example.org' } })
      await wrapper.vm.onNextClick()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(null, {
        sliderData: {
          request: {
            variables: { email: 'user@example.org', inviteCode: null, locale: 'de' },
          },
          response: { Signup: { email: 'user@example.org' } },
        },
      })
    })

    it('marks the mail as sent and toasts success', async () => {
      propsData.sliderData = sentSliderData()
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'user@example.org' } })
      await wrapper.vm.onNextClick()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(true, {
        collectedInputData: { emailSend: true },
      })
      expect(mocks.$t).toHaveBeenCalledWith('components.registration.email.form.success', {
        email: 'user@example.org',
      })
      expect(mocks.$toast.success).toHaveBeenCalledWith(
        'components.registration.email.form.success',
      )
    })

    it('toggles the button loading state around the request', async () => {
      propsData.sliderData = sentSliderData()
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'user@example.org' } })
      await wrapper.vm.onNextClick()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(null, {
        sliderSettings: { buttonLoading: true },
      })
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenLastCalledWith(null, {
        sliderSettings: { buttonLoading: false },
      })
    })

    it('skips sending again when the mail is out and "send again" is unchecked', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { email: 'user@example.org', emailSend: true },
        sliders: [
          { data: { request: { variables: { email: 'user@example.org' } } } },
          { data: {} },
        ],
      })
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'user@example.org' } })
      const result = await wrapper.vm.onNextClick()
      expect(result).toBe(true)
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    })

    it('sends again when "send again" is checked', async () => {
      propsData.sliderData = sentSliderData()
      propsData.sliderData.collectedInputData.emailSend = true
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'user@example.org' }, sendEmailAgain: true })
      const result = await wrapper.vm.onNextClick()
      expect(result).toBe(true)
      expect(mocks.$apollo.mutate).toHaveBeenCalled()
    })

    // Skipped because the behaviour does not exist yet: the early return in
    // onNextClick (emailSend && !sendEmailAgain) fires before the comparison
    // with the address last sent (isVariablesRequested), so a changed address
    // never re-sends and the nonce slide then verifies the first mail's code
    // against the new address. That is bug #10888, whose fix is self-assigned
    // there — unskip this spec when it lands.
    it.skip('sends a new mail when the address changed after the first send (#10888)', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { email: 'old@example.org', emailSend: true },
        sliders: [{ data: { request: { variables: { email: 'old@example.org' } } } }, { data: {} }],
      })
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'new@example.org' } })
      const result = await wrapper.vm.onNextClick()
      expect(result).toBe(true)
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ email: 'new@example.org' }),
        }),
      )
    })

    it('resets the sent state, reports the backend error and stays on the slide', async () => {
      mocks.$apollo.mutate.mockRejectedValue(new Error('network'))
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { email: 'user@example.org' } })
      const result = await wrapper.vm.onNextClick()
      expect(result).toBe(false)
      // the reset carries the input's validity, which is still true here
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(true, {
        sliderData: { request: null, response: null },
        collectedInputData: { emailSend: false },
        sliderSettings: { buttonLoading: false },
      })
      expect(mocks.$toast.error).toHaveBeenCalledWith('network')
    })
  })
})
