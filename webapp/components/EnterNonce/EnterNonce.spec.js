import { mount } from '@vue/test-utils'
import { branding } from '@ocelot-social/branding'
import EnterNonce from './EnterNonce.vue'

// Mock the branding config with a NON-default nonce length so the tests prove the validation length is
// derived from branding (not hardcoded to 5). jest.mock is hoisted above the imports.
jest.mock('@ocelot-social/branding', () => ({
  branding: { registration: { nonceLength: 8 } },
}))

const localVue = global.localVue

describe('EnterNonce', () => {
  let wrapper
  let Wrapper
  let mocks
  let propsData

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    propsData = {
      email: 'mail@example.org',
    }
  })

  describe('mount', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    Wrapper = () => {
      return mount(EnterNonce, {
        mocks,
        localVue,
        propsData,
      })
    }

    it('renders an enter nonce form', () => {
      wrapper = Wrapper()
      expect(wrapper.find('form').exists()).toBe(true)
    })

    it('derives the nonce length validation from the branding config', () => {
      wrapper = Wrapper()
      const { min, max } = wrapper.vm.formSchema.nonce
      expect(min).toBe(branding.registration.nonceLength) // 8, not a hardcoded 5
      expect(max).toBe(branding.registration.nonceLength)
    })

    describe('after nonce entered', () => {
      beforeEach(() => {
        wrapper = Wrapper()
        wrapper.find('input#nonce').setValue('12345678') // matches branding nonceLength (8)
        wrapper.find('form').trigger('submit')
      })

      it('emits `nonceEntered`', () => {
        const expected = [[{ nonce: '12345678', email: 'mail@example.org' }]]
        expect(wrapper.emitted('nonceEntered')).toEqual(expected)
      })
    })
  })
})
