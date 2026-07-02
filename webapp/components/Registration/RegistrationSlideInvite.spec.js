import { shallowMount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import RegistrationSlideInvite from './RegistrationSlideInvite.vue'

const localVue = global.localVue

describe('RegistrationSlideInvite', () => {
  let mocks
  let propsData

  const baseSliderData = (overrides = {}) => ({
    sliderIndex: 0,
    collectedInputData: { inviteCode: '' },
    sliders: [{ data: { response: {} } }, { data: { response: {} } }],
    setSliderValuesCallback: jest.fn(),
    sliderSelectorCallback: jest.fn(),
    ...overrides,
  })

  const Wrapper = () => shallowMount(RegistrationSlideInvite, { mocks, localVue, propsData })
  // Mount with a no-op mounted hook so the mounted auto-validation flow doesn't race
  // method-level assertions (it would flip dbRequestInProgress for a complete code).
  const mountQuiet = () =>
    shallowMount({ ...RegistrationSlideInvite, mounted() {} }, { mocks, localVue, propsData })

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
      $apollo: {
        query: jest.fn().mockResolvedValue({ data: { validateInviteCode: { isValid: true } } }),
      },
      $toast: { error: jest.fn() },
    }
    propsData = { sliderData: baseSliderData() }
  })

  describe('mounted', () => {
    it('hydrates the invite code from collected input and registers the callback', () => {
      propsData.sliderData.collectedInputData.inviteCode = 'ABC123'
      const wrapper = Wrapper()
      expect(wrapper.vm.formData.inviteCode).toBe('ABC123')
      expect(propsData.sliderData.setSliderValuesCallback).toHaveBeenCalled()
    })

    it('defaults to an empty code when none was collected', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.formData.inviteCode).toBe('')
    })
  })

  describe('computed', () => {
    it('validInput requires a 6-character code', async () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.validInput).toBe(false)
      await wrapper.setData({ formData: { inviteCode: 'ABCDEF' } })
      expect(wrapper.vm.validInput).toBe(true)
    })

    it('invitedBy / invitedTo are null without a valid code', () => {
      const wrapper = Wrapper()
      expect(wrapper.vm.invitedBy).toBeNull()
      expect(wrapper.vm.invitedTo).toBeNull()
    })

    it('invitedBy / invitedTo resolve from the validated response', async () => {
      propsData.sliderData = baseSliderData({
        sliders: [
          {
            data: {
              response: {
                validateInviteCode: {
                  generatedBy: { name: 'Host' },
                  invitedTo: { name: 'Group', groupType: 'public' },
                },
              },
            },
          },
        ],
      })
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { inviteCode: 'ABCDEF' } })
      expect(wrapper.vm.invitedBy).toEqual({ name: 'Host' })
      expect(wrapper.vm.invitedTo).toEqual({ name: 'Group', groupType: 'public' })
    })
  })

  describe('invitation-info rendering', () => {
    const mountWithInvite = (invitedTo) => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { inviteCode: 'ABCDEF' },
        sliders: [
          {
            data: {
              response: {
                validateInviteCode: { generatedBy: { name: 'Host' }, invitedTo },
              },
            },
          },
        ],
      })
      return Wrapper()
    }

    it('shows the hidden-group message for a hidden group invite', async () => {
      const wrapper = mountWithInvite({ name: 'Secret', groupType: 'hidden' })
      await flushPromises()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('invited-to-hidden-group')
    })

    it('shows the invited-by-and-to message for a normal group invite', async () => {
      const wrapper = mountWithInvite({ name: 'Group', groupType: 'public' })
      await flushPromises()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('invited-by-and-to')
    })

    it('shows the invited-by message when there is no target group', async () => {
      const wrapper = mountWithInvite(null)
      await flushPromises()
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('invited-by')
    })
  })

  describe('sendValidation', () => {
    it('skips DB verification when the code is incomplete', async () => {
      const wrapper = Wrapper()
      propsData.sliderData.setSliderValuesCallback.mockClear()
      await wrapper.vm.sendValidation()
      expect(mocks.$apollo.query).not.toHaveBeenCalled()
    })

    it('runs DB verification once the code is complete', async () => {
      const wrapper = Wrapper()
      await wrapper.setData({ formData: { inviteCode: 'ABCDEF' } })
      mocks.$apollo.query.mockClear()
      await wrapper.vm.sendValidation()
      expect(mocks.$apollo.query).toHaveBeenCalled()
    })
  })

  describe('handleInput / handleInputValid', () => {
    it('both re-validate', async () => {
      const wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'sendValidation')
      await wrapper.vm.handleInput()
      await wrapper.vm.handleInputValid()
      expect(spy).toHaveBeenCalledTimes(2)
    })
  })

  describe('handleSubmitVerify', () => {
    it('auto-advances to the next slide on a valid code', async () => {
      propsData.sliderData = baseSliderData({ collectedInputData: { inviteCode: 'ABCDEF' } })
      const wrapper = mountQuiet()
      const result = await wrapper.vm.handleSubmitVerify()
      expect(result).toBe(true)
      expect(propsData.sliderData.sliderSelectorCallback).toHaveBeenCalledWith(1)
    })

    it('does not advance past the last slide', async () => {
      propsData.sliderData = baseSliderData({
        collectedInputData: { inviteCode: 'ABCDEF' },
        sliders: [{ data: { response: {} } }],
      })
      const wrapper = mountQuiet()
      const result = await wrapper.vm.handleSubmitVerify()
      expect(result).toBe(true)
      expect(propsData.sliderData.sliderSelectorCallback).not.toHaveBeenCalled()
    })

    it('toasts and returns false on an invalid code', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { validateInviteCode: { isValid: false } } })
      propsData.sliderData = baseSliderData({ collectedInputData: { inviteCode: 'ABCDEF' } })
      const wrapper = mountQuiet()
      const result = await wrapper.vm.handleSubmitVerify()
      expect(result).toBe(false)
      expect(mocks.$toast.error).toHaveBeenCalled()
    })

    it('handles a query error gracefully', async () => {
      mocks.$apollo.query.mockRejectedValue(new Error('network'))
      propsData.sliderData = baseSliderData({ collectedInputData: { inviteCode: 'ABCDEF' } })
      const wrapper = mountQuiet()
      const result = await wrapper.vm.handleSubmitVerify()
      expect(result).toBe(false)
      expect(mocks.$toast.error).toHaveBeenCalledWith('network')
    })

    it('is a no-op while a request is already in flight', async () => {
      const wrapper = Wrapper()
      await wrapper.setData({ dbRequestInProgress: true })
      mocks.$apollo.query.mockClear()
      const result = await wrapper.vm.handleSubmitVerify()
      expect(result).toBeUndefined()
      expect(mocks.$apollo.query).not.toHaveBeenCalled()
    })
  })

  describe('onNextClick', () => {
    it('returns true', () => {
      expect(Wrapper().vm.onNextClick()).toBe(true)
    })
  })
})
