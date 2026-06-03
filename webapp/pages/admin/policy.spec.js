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
          // snapshot lives in state so a test can mutate it and trigger the
          // component's reactive snapshot watcher (remote-change simulation).
          state: () => ({ snap: { ...snapshot } }),
          getters: {
            snapshot: (state) => state.snap,
            defaults: () => defaults,
            lastChange: () => lastChange,
          },
          mutations: {
            SET_SNAP: (state, value) => {
              state.snap = value
            },
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

  it('refetches the defaults bundle when the snapshot changes after load (remote change)', async () => {
    wrapper = Wrapper()
    await flushPromises()
    // One fetch from mount; the subscription broadcast carries no actor/timestamp,
    // so a remote-change snapshot update must refresh the last-change line.
    expect(fetchDefaults).toHaveBeenCalledTimes(1)

    store.commit('policy/SET_SNAP', { ...snapshot, publicRegistration: true })
    await flushPromises()

    expect(fetchDefaults).toHaveBeenCalledTimes(2)
  })

  it('does not double-fetch the defaults during the initial mount sync', async () => {
    wrapper = Wrapper()
    await flushPromises()
    // The mount-time snapshot sync must not trigger an extra watcher refetch
    // (loaded is still false during the initial load) — exactly one fetch.
    expect(fetchDefaults).toHaveBeenCalledTimes(1)
  })

  it('still initializes the page when fetchDefaults fails (optional metadata)', async () => {
    fetchDefaults.mockRejectedValueOnce(new Error('network'))
    wrapper = Wrapper()
    await flushPromises()

    // Required snapshot still drives the form despite the optional-metadata failure.
    expect(wrapper.find('#policy-inviteRegistration').element.checked).toBe(true)

    // And `loaded` is still armed, so a later remote change refreshes the bundle.
    store.commit('policy/SET_SNAP', { ...snapshot, publicRegistration: true })
    await flushPromises()
    expect(fetchDefaults).toHaveBeenCalledTimes(2) // failed mount fetch + watcher refetch
  })

  // Vuex calls an action as (context, payload), so the asserted call has the
  // store context as the first arg and the component's payload as the second.
  describe('write path', () => {
    it('saves only the changed keys via setKey on submit', async () => {
      wrapper = Wrapper()
      await flushPromises()

      // publicRegistration is false in the snapshot → toggle it on (dirties the form).
      await wrapper.find('#policy-publicRegistration').setChecked(true)
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(setKey).toHaveBeenCalledTimes(1) // only the changed key is written
      expect(setKey).toHaveBeenCalledWith(expect.anything(), {
        key: 'publicRegistration',
        value: true,
      })
      expect(mocks.$toast.success).toHaveBeenCalled()
    })

    it('does not call setKey when nothing changed', async () => {
      wrapper = Wrapper()
      await flushPromises()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(setKey).not.toHaveBeenCalled()
    })

    it('resets every key to its default via resetKey', async () => {
      wrapper = Wrapper()
      await flushPromises()

      await wrapper.find('[data-test="policy-reset"]').trigger('click')
      await flushPromises()

      expect(resetKey).toHaveBeenCalledTimes(4) // one per policy key
      for (const key of [
        'publicRegistration',
        'inviteRegistration',
        'categoriesActive',
        'apiKeysEnabled',
      ]) {
        expect(resetKey).toHaveBeenCalledWith(expect.anything(), { key })
      }
      expect(mocks.$toast.success).toHaveBeenCalled()
    })
  })
})
