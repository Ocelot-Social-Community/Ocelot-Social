import { shallowMount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import { getBranding, setBranding } from '@ocelot-social/branding'
import RegistrationSlideNonce from './RegistrationSlideNonce.vue'

const localVue = global.localVue

describe('RegistrationSlideNonce', () => {
  let mocks
  let propsData

  const baseSliderData = (overrides = {}) => ({
    sliderIndex: 0,
    collectedInputData: { nonce: '', email: 'user@example.org' },
    sliders: [{ data: { response: {} } }, { data: { response: {} } }],
    setSliderValuesCallback: jest.fn(),
    sliderSelectorCallback: jest.fn(),
    ...overrides,
  })

  const Wrapper = () => shallowMount(RegistrationSlideNonce, { mocks, localVue, propsData })

  // no-op mounted so the auto sendValidation() flow (which fires $apollo) doesn't race the assertions
  const mountQuiet = () =>
    shallowMount({ ...RegistrationSlideNonce, mounted() {} }, { mocks, localVue, propsData })

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
      $apollo: { query: jest.fn().mockResolvedValue({ data: { VerifyNonce: true } }) },
      $toast: { error: jest.fn() },
    }
    propsData = { sliderData: baseSliderData() }
  })

  describe('computed validInput', () => {
    it('validInput follows the branding nonceLength, not a hardcoded 5', async () => {
      // Inject a non-default length so a regression to the old hardcoded 5 is caught.
      const original = getBranding()
      setBranding({
        ...original,
        registration: { ...original.registration, nonceLength: 8 },
      })
      try {
        const wrapper = mountQuiet()
        await wrapper.setData({ formData: { nonce: '12345678' } }) // 8 chars → matches branding
        expect(wrapper.vm.validInput).toBe(true)
        await wrapper.setData({ formData: { nonce: '12345' } }) // 5 chars → too short now
        expect(wrapper.vm.validInput).toBe(false)
      } finally {
        setBranding(original)
      }
    })
  })

  describe('mounted', () => {
    it('a complete prefilled nonce is verified on mount and marks the slide validated', async () => {
      // The invite-mail flow: the nonce arrives prefilled from the link, and the
      // slide verifies it right away so the "next" button is ready to advance.
      propsData.sliderData = baseSliderData({
        collectedInputData: { nonce: '12345', email: 'user@example.org' },
        sliders: [{ data: { response: { VerifyNonce: true } } }, { data: { response: {} } }],
      })
      Wrapper()
      await flushPromises()
      expect(mocks.$apollo.query).toHaveBeenCalled()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenLastCalledWith(true)
    })
  })

  describe('sendValidation', () => {
    it('collects the nonce and skips DB verification when it is incomplete', async () => {
      const wrapper = mountQuiet()
      await wrapper.vm.sendValidation()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(null, {
        collectedInputData: { nonce: '' },
      })
      expect(mocks.$apollo.query).not.toHaveBeenCalled()
    })
  })

  describe('handleSubmitVerify', () => {
    it('queries VerifyNonce with the collected e-mail and nonce', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { nonce: '12345', email: 'user@example.org' },
      })
      const wrapper = mountQuiet()
      await wrapper.setData({ formData: { nonce: '12345' } })
      await wrapper.vm.handleSubmitVerify()
      expect(mocks.$apollo.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { email: 'user@example.org', nonce: '12345' },
        }),
      )
    })

    it('records the request and response on the slider data', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { nonce: '12345', email: 'user@example.org' },
      })
      const wrapper = mountQuiet()
      await wrapper.setData({ formData: { nonce: '12345' } })
      await wrapper.vm.handleSubmitVerify()
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(null, {
        sliderData: {
          request: { variables: { email: 'user@example.org', nonce: '12345' } },
          response: { VerifyNonce: true },
        },
      })
    })

    it('auto-advances to the next slide once the nonce is verified', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { nonce: '12345', email: 'user@example.org' },
        // The nonce slide decides on the response recorded on the slide (the
        // slider merger's job, specified in the RegistrationSlider spec), not
        // on the raw query result — so the fixture records the verified one.
        sliders: [{ data: { response: { VerifyNonce: true } } }, { data: { response: {} } }],
      })
      const wrapper = mountQuiet()
      await wrapper.setData({ formData: { nonce: '12345' } })
      await wrapper.vm.handleSubmitVerify()
      expect(propsData.sliderData.sliderSelectorCallback).toHaveBeenCalledWith(1)
    })

    it('does not advance past the last slide', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { nonce: '12345', email: 'user@example.org' },
        sliders: [{ data: { response: { VerifyNonce: true } } }],
      })
      const wrapper = mountQuiet()
      await wrapper.setData({ formData: { nonce: '12345' } })
      await wrapper.vm.handleSubmitVerify()
      expect(propsData.sliderData.sliderSelectorCallback).not.toHaveBeenCalled()
    })

    it('toasts for an unverified nonce and stays on the slide', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { VerifyNonce: false } })
      propsData.sliderData = baseSliderData({
        collectedInputData: { nonce: '12345', email: 'user@example.org' },
        sliders: [{ data: { response: { VerifyNonce: false } } }, { data: { response: {} } }],
      })
      const wrapper = mountQuiet()
      await wrapper.setData({ formData: { nonce: '12345' } })
      await wrapper.vm.handleSubmitVerify()
      expect(mocks.$t).toHaveBeenCalledWith(
        'components.registration.email-nonce.form.validations.error',
        {
          email: 'user@example.org',
          nonce: '12345',
        },
      )
      expect(mocks.$toast.error).toHaveBeenCalled()
      expect(propsData.sliderData.sliderSelectorCallback).not.toHaveBeenCalled()
    })

    it('handles a query error gracefully', async () => {
      mocks.$apollo.query.mockRejectedValue(new Error('network'))
      propsData.sliderData = baseSliderData({
        collectedInputData: { nonce: '12345', email: 'user@example.org' },
      })
      const wrapper = mountQuiet()
      await wrapper.setData({ formData: { nonce: '12345' } })
      await wrapper.vm.handleSubmitVerify()
      expect(mocks.$toast.error).toHaveBeenCalledWith('network')
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalledWith(false, {
        sliderData: { response: { VerifyNonce: false } },
      })
    })

    it('is a no-op while a request is already in flight', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { nonce: '12345', email: 'user@example.org' },
      })
      const wrapper = mountQuiet()
      await wrapper.setData({ formData: { nonce: '12345' }, dbRequestInProgress: true })
      await wrapper.vm.handleSubmitVerify()
      expect(mocks.$apollo.query).not.toHaveBeenCalled()
    })
  })
})
