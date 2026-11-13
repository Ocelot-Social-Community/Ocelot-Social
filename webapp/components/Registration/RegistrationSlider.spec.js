import { shallowMount } from '@vue/test-utils'
import RegistrationSlider from './RegistrationSlider.vue'

const localVue = global.localVue

describe('RegistrationSlider', () => {
  let mocks
  let propsData

  const Wrapper = () =>
    shallowMount(RegistrationSlider, {
      mocks,
      localVue,
      propsData,
      stubs: { 'nuxt-link': true },
    })

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
      $route: { query: {} },
    }
    propsData = { registrationType: 'invite-code' }
  })

  describe('mount', () => {
    it('builds the slide set for "invite-code"', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.sliderData.sliders.map((slider) => slider.name)).toEqual([
        'enter-invite',
        'enter-email',
        'enter-nonce',
        'create-user-account',
      ])
      expect(wrapper.vm.sliderData.sliderIndex).toBe(0)
    })

    it('builds the slide set for "invite-mail"', () => {
      propsData = { registrationType: 'invite-mail' }
      const wrapper = Wrapper()
      expect(wrapper.vm.sliderData.sliders.map((slider) => slider.name)).toEqual([
        'enter-nonce',
        'create-user-account',
      ])
    })

    it('builds the slide set for "public-registration"', () => {
      propsData = { registrationType: 'public-registration' }
      const wrapper = Wrapper()
      expect(wrapper.vm.sliderData.sliders.map((slider) => slider.name)).toEqual([
        'enter-email',
        'enter-nonce',
        'create-user-account',
      ])
    })

    it('builds the slide set for "no-public-registration"', () => {
      propsData = { registrationType: 'no-public-registration' }
      const wrapper = Wrapper()
      expect(wrapper.vm.sliderData.sliders.map((slider) => slider.name)).toEqual([
        'no-public-registration',
      ])
    })
  })

  describe('setSliderValuesCallback', () => {
    it('marks the current slide validated', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.sliderData.sliders[0].validated).toBe(false)
      wrapper.vm.setSliderValuesCallback(true)
      expect(wrapper.vm.sliderData.sliders[0].validated).toBe(true)
    })

    it('marks only the current slide validated', () => {
      const wrapper = Wrapper()
      wrapper.vm.sliderSelectorCallback(1)
      wrapper.vm.setSliderValuesCallback(true)
      expect(wrapper.vm.sliderData.sliders[0].validated).toBe(false)
      expect(wrapper.vm.sliderData.sliders[1].validated).toBe(true)
    })

    it('leaves the validated state alone when called without a validity', () => {
      const wrapper = Wrapper()
      wrapper.vm.setSliderValuesCallback(null, { collectedInputData: { nonce: '64835' } })
      expect(wrapper.vm.sliderData.sliders[0].validated).toBe(false)
    })

    it('merges collected input into the collected input data', () => {
      const wrapper = Wrapper()
      wrapper.vm.setSliderValuesCallback(null, {
        collectedInputData: { email: 'user@example.org' },
      })
      expect(wrapper.vm.sliderData.collectedInputData.email).toBe('user@example.org')
      expect(wrapper.vm.sliderData.collectedInputData.inviteCode).toBeNull()
    })

    it('records request and response on the current slide', () => {
      const wrapper = Wrapper()
      const request = { variables: { email: 'user@example.org' } }
      const response = { Signup: { email: 'user@example.org' } }
      wrapper.vm.setSliderValuesCallback(null, { sliderData: { request, response } })
      expect(wrapper.vm.sliderData.sliders[0].data.request).toBe(request)
      expect(wrapper.vm.sliderData.sliders[0].data.response).toBe(response)
    })

    it('keeps the recorded request or response that is not re-patched', () => {
      const wrapper = Wrapper()
      const request = { variables: { email: 'user@example.org' } }
      wrapper.vm.setSliderValuesCallback(null, { sliderData: { request } })
      const response = { VerifyNonce: true }
      wrapper.vm.setSliderValuesCallback(null, { sliderData: { response } })
      expect(wrapper.vm.sliderData.sliders[0].data.request).toBe(request)
      expect(wrapper.vm.sliderData.sliders[0].data.response).toBe(response)
    })

    it('applies the button settings to the current slide', () => {
      const wrapper = Wrapper()
      const buttonSliderCallback = jest.fn()
      wrapper.vm.setSliderValuesCallback(null, {
        sliderSettings: {
          buttonTitleIdent: 'components.registration.email.buttonTitle.resend',
          buttonIcon: 'check',
          buttonLoading: true,
          buttonSliderCallback,
        },
      })
      const button = wrapper.vm.sliderData.sliders[0].button
      expect(button.titleIdent).toBe('components.registration.email.buttonTitle.resend')
      expect(button.icon).toBe('check')
      expect(button.loading).toBe(true)
      expect(button.sliderCallback).toBe(buttonSliderCallback)
    })

    it('leaves button settings untouched that the patch does not carry', () => {
      const wrapper = Wrapper()
      wrapper.vm.setSliderValuesCallback(null, {
        sliderSettings: { buttonTitleIdent: 'components.registration.email.buttonTitle.send' },
      })
      const button = wrapper.vm.sliderData.sliders[0].button
      expect(button.icon).toBeNull()
      expect(button.loading).toBeUndefined()
      expect(button.sliderCallback).toBeNull()
    })
  })

  describe('sliderSelectorCallback', () => {
    it('moves one slide forward', () => {
      const wrapper = Wrapper()
      wrapper.vm.sliderSelectorCallback(1)
      expect(wrapper.vm.sliderData.sliderIndex).toBe(1)
    })

    it('moves back to an earlier slide', () => {
      const wrapper = Wrapper()
      wrapper.vm.sliderSelectorCallback(1)
      wrapper.vm.sliderSelectorCallback(0)
      expect(wrapper.vm.sliderData.sliderIndex).toBe(0)
    })

    it('rejects a jump beyond the next slide', () => {
      const wrapper = Wrapper()
      wrapper.vm.sliderSelectorCallback(2)
      expect(wrapper.vm.sliderData.sliderIndex).toBe(0)
    })

    it('rejects an index past the last slide', () => {
      const wrapper = Wrapper()
      wrapper.vm.sliderSelectorCallback(1)
      wrapper.vm.sliderSelectorCallback(2)
      wrapper.vm.sliderSelectorCallback(3)
      expect(wrapper.vm.sliderData.sliderIndex).toBe(3)
      wrapper.vm.sliderSelectorCallback(4)
      expect(wrapper.vm.sliderData.sliderIndex).toBe(3)
    })

    it('resets the loading state of the slide moved to', () => {
      // only "create-user-account" carries a loading state at all
      propsData = { registrationType: 'invite-mail' }
      const wrapper = Wrapper()
      wrapper.vm.sliderData.sliders[1].button.loading = true
      wrapper.vm.sliderSelectorCallback(1)
      expect(wrapper.vm.sliderData.sliders[1].button.loading).toBe(false)
    })

    it('leaves slides without a loading state untouched', () => {
      const wrapper = Wrapper()
      wrapper.vm.sliderSelectorCallback(1)
      expect(wrapper.vm.sliderData.sliders[1].button.loading).toBeUndefined()
    })
  })

  describe('activePage', () => {
    it('opens on "create-user-account" of an invite-mail link', () => {
      propsData = { registrationType: 'invite-mail', activePage: 'create-user-account' }
      const wrapper = Wrapper()
      expect(wrapper.vm.sliderData.sliderIndex).toBe(1)
    })

    it('opens on the nonce slide of a complete invite-code mail link (#10889)', () => {
      propsData = { registrationType: 'invite-code', activePage: 'enter-nonce' }
      const wrapper = Wrapper()
      expect(wrapper.vm.sliderData.sliderIndex).toBe(2)
    })

    it('opens on the first slide without an activePage', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.sliderData.sliderIndex).toBe(0)
    })
  })
})
