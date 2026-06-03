import { mount } from '@vue/test-utils'
import admin from './admin.vue'

const stubs = {
  'nuxt-child': true,
}

const localVue = global.localVue

describe('admin.vue', () => {
  let wrapper
  let mocks
  let policyValues

  beforeEach(() => {
    // Key-specific policy mock so the api-keys menu gating can be toggled per
    // scenario and a wrong/typo'd policy key resolves to false (off) — a blanket
    // mock would mask that. Defaults to everything off.
    policyValues = {}
    mocks = {
      $t: jest.fn((key) => key),
      $policy: { get: (key) => policyValues[key] ?? false },
    }
  })

  const Wrapper = () => mount(admin, { mocks, localVue, stubs })

  describe('mount', () => {
    it('renders', () => {
      wrapper = Wrapper()
      expect(wrapper.element.tagName).toBe('DIV')
    })
  })

  describe('the API-keys admin menu item', () => {
    it('is hidden when the apiKeysEnabled policy is off', () => {
      wrapper = Wrapper() // policyValues empty ⇒ off
      expect(wrapper.text()).not.toContain('admin.api-keys.name')
    })

    it('is shown when the apiKeysEnabled policy is on', () => {
      policyValues = { apiKeysEnabled: true }
      wrapper = Wrapper()
      expect(wrapper.text()).toContain('admin.api-keys.name')
    })
  })
})
