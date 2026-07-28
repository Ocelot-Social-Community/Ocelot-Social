import { shallowMount } from '@vue/test-utils'
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
    ...overrides,
  })

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
})
