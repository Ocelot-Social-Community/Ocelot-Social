import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import Vuex from 'vuex'
import Policy from './policy.vue'

const localVue = global.localVue

describe('admin/policy.vue', () => {
  let wrapper
  let mocks
  let store
  let init
  let fetchDefaults
  let setKey
  let resetKey

  const snapshot = {
    publicRegistration: false,
    inviteRegistration: true,
    categoriesActive: false,
    apiKeysEnabled: false,
  }
  // Deliberately differs from the snapshot on categoriesActive, so we can assert
  // the grey text shows the configured DEFAULT, not the current toggle value.
  const defaults = {
    publicRegistration: false,
    inviteRegistration: true,
    categoriesActive: true,
    apiKeysEnabled: false,
  }
  const lastChange = { actor: 'jenny-rostock', timestamp: '2026-01-02T03:04:05.000Z' }

  beforeEach(() => {
    init = jest.fn().mockResolvedValue()
    fetchDefaults = jest.fn().mockResolvedValue()
    setKey = jest.fn().mockResolvedValue()
    resetKey = jest.fn().mockResolvedValue()
    store = new Vuex.Store({
      modules: {
        policy: {
          namespaced: true,
          getters: {
            snapshot: () => snapshot,
            defaults: () => defaults,
            lastChange: () => lastChange,
          },
          actions: { init, fetchDefaults, setKey, resetKey },
        },
      },
    })
    mocks = {
      $t: jest.fn((key, params) => (params ? `${key} ${JSON.stringify(params)}` : key)),
      $toast: { success: jest.fn(), error: jest.fn() },
    }
  })

  const Wrapper = () => mount(Policy, { mocks, localVue, store })

  it('renders the policies grouped under category headings', () => {
    wrapper = Wrapper()
    expect(wrapper.find('[data-test="policy-group-registration"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="policy-group-features"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('admin.policy.groups.registration.title')
    expect(wrapper.text()).toContain('admin.policy.groups.features.title')
  })

  it('renders every policy with a name and a detailed description', () => {
    wrapper = Wrapper()
    for (const key of [
      'publicRegistration',
      'inviteRegistration',
      'categoriesActive',
      'apiKeysEnabled',
    ]) {
      expect(wrapper.find(`[data-test="policy-${key}"]`).exists()).toBe(true)
      expect(wrapper.text()).toContain(`admin.policy.keys.${key}`)
      expect(wrapper.text()).toContain(`admin.policy.descriptions.${key}`)
    }
  })

  it('fetches the policy on mount and reflects the snapshot in the checkboxes', async () => {
    wrapper = Wrapper()
    await flushPromises()
    expect(init).toHaveBeenCalled()
    expect(wrapper.find('#policy-inviteRegistration').element.checked).toBe(true)
    expect(wrapper.find('#policy-publicRegistration').element.checked).toBe(false)
  })

  it('fetches and shows the configured default (not the current value) per policy', async () => {
    wrapper = Wrapper()
    await flushPromises()
    expect(fetchDefaults).toHaveBeenCalled()
    // categoriesActive: current = false (checkbox), default = true (grey text)
    expect(wrapper.find('#policy-categoriesActive').element.checked).toBe(false)
    const defaultEl = wrapper.find('[data-test="policy-default-categoriesActive"]')
    expect(defaultEl.exists()).toBe(true)
    expect(defaultEl.text()).toContain('true')
  })

  it('shows who last changed the policy and when (delivered via fetchDefaults)', async () => {
    wrapper = Wrapper()
    await flushPromises()
    // last change is now bundled into the admin defaults round-trip
    expect(fetchDefaults).toHaveBeenCalled()
    const el = wrapper.find('[data-test="policy-last-changed"]')
    expect(el.exists()).toBe(true)
    expect(el.text()).toContain('jenny-rostock')
  })
})
