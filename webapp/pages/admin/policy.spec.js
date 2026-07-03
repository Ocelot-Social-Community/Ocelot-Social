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
    askForRealName: false,
    requireLocation: false,
    inviteLinkLimit: 7,
    inviteCodesPersonalPerUser: 7,
    inviteCodesGroupPerUser: 7,
    categoriesActive: false,
    badgesEnabled: false,
    apiKeysEnabled: false,
    apiKeysMaxPerUser: 5,
    videoConference: true,
    maxPinnedPosts: 1,
    maxGroupPinnedPosts: 1,
    showContentFilterHeaderMenu: true,
    showContentFilterMasonryGrid: false,
    showGroupButtonInHeader: true,
  }
  // Deliberately differs from the snapshot on categoriesActive, so we can assert
  // the grey text shows the configured DEFAULT, not the current toggle value.
  const defaults = {
    publicRegistration: false,
    inviteRegistration: true,
    askForRealName: false,
    requireLocation: false,
    inviteLinkLimit: 7,
    inviteCodesPersonalPerUser: 7,
    inviteCodesGroupPerUser: 7,
    categoriesActive: true,
    badgesEnabled: false,
    apiKeysEnabled: false,
    apiKeysMaxPerUser: 5,
    videoConference: true,
    maxPinnedPosts: 1,
    maxGroupPinnedPosts: 1,
    showContentFilterHeaderMenu: true,
    showContentFilterMasonryGrid: false,
    showGroupButtonInHeader: true,
  }
  const ALL_KEYS = [
    'publicRegistration',
    'inviteRegistration',
    'askForRealName',
    'requireLocation',
    'inviteLinkLimit',
    'inviteCodesPersonalPerUser',
    'inviteCodesGroupPerUser',
    'categoriesActive',
    'badgesEnabled',
    'apiKeysEnabled',
    'apiKeysMaxPerUser',
    'videoConference',
    'maxPinnedPosts',
    'maxGroupPinnedPosts',
    'showContentFilterHeaderMenu',
    'showContentFilterMasonryGrid',
    'showGroupButtonInHeader',
  ]
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
    expect(wrapper.find('[data-test="policy-group-layout"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('admin.policy.groups.registration.title')
    expect(wrapper.text()).toContain('admin.policy.groups.features.title')
    expect(wrapper.text()).toContain('admin.policy.groups.layout.title')
  })

  it('renders every policy with a name and a detailed description', () => {
    wrapper = Wrapper()
    for (const key of ALL_KEYS) {
      expect(wrapper.find(`[data-test="policy-${key}"]`).exists()).toBe(true)
      expect(wrapper.text()).toContain(`admin.policy.keys.${key}`)
      expect(wrapper.text()).toContain(`admin.policy.descriptions.${key}`)
    }
  })

  it('renders integer policies as number inputs reflecting the snapshot value', async () => {
    wrapper = Wrapper()
    await flushPromises()
    const numberInput = wrapper.find('#policy-apiKeysMaxPerUser')
    expect(numberInput.element.type).toBe('number')
    expect(numberInput.element.value).toBe('5')
    // Booleans stay checkboxes.
    expect(wrapper.find('#policy-publicRegistration').element.type).toBe('checkbox')
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

  describe('concurrent-edit conflicts', () => {
    // Drive the page into a conflict on inviteLinkLimit: local edit 7 → 10, then a remote
    // admin moves the server value to 99 under it. Mirrors roles.spec.js intoConflict().
    const intoConflict = async () => {
      wrapper = Wrapper()
      await flushPromises()
      await wrapper.find('#policy-inviteLinkLimit').setValue('10')
      store.commit('policy/SET_SNAP', { ...snapshot, inviteLinkLimit: 99 })
      await flushPromises()
      return wrapper
    }

    it('an untouched field follows a remote change live, with no conflict', async () => {
      wrapper = Wrapper()
      await flushPromises()
      // No local edits; a remote admin turns publicRegistration on.
      store.commit('policy/SET_SNAP', { ...snapshot, publicRegistration: true })
      await flushPromises()
      expect(wrapper.find('#policy-publicRegistration').element.checked).toBe(true)
      expect(wrapper.vm.hasConflict).toBe(false)
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(false)
    })

    it('flags a conflict on a locally-edited field the server also moved, keeping my value', async () => {
      wrapper = Wrapper()
      await flushPromises()
      // Local edit: inviteLinkLimit 7 → 10 (unsaved).
      await wrapper.find('#policy-inviteLinkLimit').setValue('10')
      // Remote: another admin sets it to 99 AND (untouched here) turns publicRegistration on.
      store.commit('policy/SET_SNAP', {
        ...snapshot,
        inviteLinkLimit: 99,
        publicRegistration: true,
      })
      await flushPromises()
      // My unsaved value is kept, not clobbered; the field is flagged + highlighted.
      expect(wrapper.vm.conflict.inviteLinkLimit).toBe(true)
      expect(wrapper.vm.hasConflict).toBe(true)
      expect(wrapper.find('#policy-inviteLinkLimit').element.value).toBe('10')
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(true)
      // The incoming server value (99) is surfaced on the row.
      const note = wrapper.find('[data-test="policy-conflict-inviteLinkLimit"]')
      expect(note.exists()).toBe(true)
      expect(note.text()).toContain('99')
      // The untouched field still followed the server live (no conflict on it).
      expect(wrapper.find('#policy-publicRegistration').element.checked).toBe(true)
      expect(wrapper.vm.conflict.publicRegistration).toBeFalsy()
    })

    it('does not flag a phantom conflict when a checkbox edit converges with the server’s new value', async () => {
      wrapper = Wrapper()
      await flushPromises()
      // Local edit: turn publicRegistration on (baseline false → form true).
      await wrapper.find('#policy-publicRegistration').setChecked(true)
      // A remote admin independently turns the SAME flag on. For a boolean, a server "move"
      // from the baseline can only land on the value the local edit already chose, so this
      // must reconcile silently — not raise a conflict on values that actually agree.
      store.commit('policy/SET_SNAP', { ...snapshot, publicRegistration: true })
      await flushPromises()
      expect(wrapper.vm.conflict.publicRegistration).toBeFalsy()
      expect(wrapper.vm.hasConflict).toBe(false)
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(false)
      expect(wrapper.find('#policy-publicRegistration').element.checked).toBe(true)
      // Fully settled: the agreed value became the baseline, so nothing is left to save.
      expect(wrapper.vm.isDirty).toBe(false)
    })

    it('loadServerVersion discards local edits and adopts the server value, clearing the banner', async () => {
      await intoConflict()
      expect(wrapper.vm.hasConflict).toBe(true)
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(true)

      await wrapper.find('[data-test="policy-conflict-load"]').trigger('click')
      expect(wrapper.vm.hasConflict).toBe(false)
      // The banner is gone from the DOM (not just the computed), and the per-row note too.
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="policy-conflict-inviteLinkLimit"]').exists()).toBe(false)
      expect(wrapper.find('#policy-inviteLinkLimit').element.value).toBe('99')
    })

    it('dismissConflict hides the banner but keeps my edits (keep editing)', async () => {
      await intoConflict()
      expect(wrapper.vm.hasConflict).toBe(true)
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(true)

      await wrapper.find('[data-test="policy-conflict-keep"]').trigger('click')
      expect(wrapper.vm.hasConflict).toBe(false)
      // The banner is gone from the DOM (not just the computed), but the edit is kept.
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(false)
      expect(wrapper.find('#policy-inviteLinkLimit').element.value).toBe('10')
    })

    it('does not re-raise a dismissed conflict when an unrelated field later changes', async () => {
      await intoConflict()
      expect(wrapper.vm.hasConflict).toBe(true)

      await wrapper.find('[data-test="policy-conflict-keep"]').trigger('click')
      expect(wrapper.vm.hasConflict).toBe(false)

      // A later UNRELATED remote change (different key) reconciles again; the acknowledged
      // conflict on inviteLinkLimit must not re-pop, and its draft value stays.
      store.commit('policy/SET_SNAP', {
        ...snapshot,
        inviteLinkLimit: 99,
        publicRegistration: true,
      })
      await flushPromises()
      expect(wrapper.vm.conflict.inviteLinkLimit).toBeFalsy()
      expect(wrapper.find('#policy-inviteLinkLimit').element.value).toBe('10')
      // The unrelated field still followed the server live.
      expect(wrapper.find('#policy-publicRegistration').element.checked).toBe(true)
    })

    it('re-raises the conflict when the server moves the same key again after a dismiss', async () => {
      await intoConflict()
      await wrapper.find('[data-test="policy-conflict-keep"]').trigger('click')
      expect(wrapper.vm.hasConflict).toBe(false)

      // A genuinely NEW remote move on the SAME key (99 → 42) raises the conflict anew.
      store.commit('policy/SET_SNAP', { ...snapshot, inviteLinkLimit: 42 })
      await flushPromises()
      expect(wrapper.vm.conflict.inviteLinkLimit).toBe(true)
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(true)
      // My unsaved value is still kept, and the note surfaces the NEW server value.
      expect(wrapper.find('#policy-inviteLinkLimit').element.value).toBe('10')
      expect(wrapper.find('[data-test="policy-conflict-inviteLinkLimit"]').text()).toContain('42')
    })

    it('clears the conflict when the server reverts to the baseline (change undone), without a click', async () => {
      await intoConflict()
      expect(wrapper.vm.hasConflict).toBe(true)

      // The other admin's change is undone: the server bounces back to the original baseline
      // value (7). No divergence from the baseline remains, so the banner must clear on its
      // own — it is now just an ordinary unsaved edit (10 vs 7), not a conflict.
      store.commit('policy/SET_SNAP', { ...snapshot, inviteLinkLimit: 7 })
      await flushPromises()
      expect(wrapper.vm.conflict.inviteLinkLimit).toBeFalsy()
      expect(wrapper.vm.hasConflict).toBe(false)
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(false)
      // My unsaved edit survives, and it is still dirty (10 ≠ server 7) so Save stays enabled.
      expect(wrapper.find('#policy-inviteLinkLimit').element.value).toBe('10')
      expect(wrapper.vm.isDirty).toBe(true)
    })

    it('rolls back the baseline when a save fails, so a later snapshot update cannot clobber the unsaved input', async () => {
      wrapper = Wrapper()
      await flushPromises()
      // Local edit on a number field (7 → 10, unsaved).
      await wrapper.find('#policy-inviteLinkLimit').setValue('10')
      // The write fails.
      setKey.mockRejectedValueOnce(new Error('network'))
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(mocks.$toast.error).toHaveBeenCalled()

      // A later UNRELATED remote change reconciles the form. Because the failed key's baseline
      // was rolled back, the field is still treated as locally edited — its value survives
      // instead of being silently reset to the (still 7) server value.
      store.commit('policy/SET_SNAP', { ...snapshot, publicRegistration: true })
      await flushPromises()
      expect(wrapper.find('#policy-inviteLinkLimit').element.value).toBe('10')
      expect(wrapper.find('#policy-publicRegistration').element.checked).toBe(true) // unrelated followed
    })

    it('does not raise a false conflict when the server echo lands while the own save is still in flight', async () => {
      wrapper = Wrapper()
      await flushPromises()

      // Hold the write open so the snapshot echo can arrive WHILE the save is still pending
      // — the real race. (If the baseline were advanced only AFTER the await, the reconcile
      // during this window would see form≠baseline & snapshot≠baseline and cry conflict.)
      let resolveSetKey
      setKey.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSetKey = resolve
          }),
      )

      await wrapper.find('#policy-publicRegistration').setChecked(true)
      wrapper.find('form').trigger('submit') // do NOT await — the save is now in flight
      await wrapper.vm.$nextTick()

      // The backend broadcasts our own write back before setKey resolves.
      store.commit('policy/SET_SNAP', { ...snapshot, publicRegistration: true })
      await flushPromises()

      // No false conflict during the in-flight window (baseline advanced before the await).
      expect(wrapper.vm.hasConflict).toBe(false)
      expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(false)

      // And still consistent once the write completes.
      resolveSetKey()
      await flushPromises()
      expect(wrapper.vm.hasConflict).toBe(false)
      expect(wrapper.find('#policy-publicRegistration').element.checked).toBe(true)
    })
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

    it('saves an integer policy as a number via setKey', async () => {
      wrapper = Wrapper()
      await flushPromises()

      // apiKeysMaxPerUser is 5 in the snapshot → change it to 10 (dirties the form).
      await wrapper.find('#policy-apiKeysMaxPerUser').setValue('10')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(setKey).toHaveBeenCalledTimes(1)
      expect(setKey).toHaveBeenCalledWith(expect.anything(), {
        key: 'apiKeysMaxPerUser',
        value: 10, // v-model.number → a real number, not the string "10"
      })
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

      expect(resetKey).toHaveBeenCalledTimes(ALL_KEYS.length) // one per policy key
      for (const key of ALL_KEYS) {
        expect(resetKey).toHaveBeenCalledWith(expect.anything(), { key })
      }
      expect(mocks.$toast.success).toHaveBeenCalled()
    })
  })

  describe('env-gated availability (policyConfig)', () => {
    const stubs = { 'nuxt-link': { template: '<a :href="to"><slot /></a>', props: ['to'] } }
    const ENTRY = {
      key: 'videoConference',
      type: 'boolean',
      effective: 'false',
      softwareDefault: 'true',
      configuredDefault: 'true',
      envSeed: null,
      envSeedState: null,
      requiresEnv: [{ name: 'LIVEKIT_URL', state: 'missing' }],
      available: false,
    }
    const mountWithConfig = (policyConfig) => {
      const w = mount(Policy, { mocks, localVue, store, stubs })
      w.setData({ policyConfig })
      return w
    }

    it('greys out and disables an env-unavailable key, linking to the config tab', async () => {
      const w = mountWithConfig([ENTRY])
      await w.vm.$nextTick()
      expect(w.vm.isUnavailable('videoConference')).toBe(true)
      expect(w.find('[data-test="policy-videoConference"]').attributes('disabled')).toBeTruthy()
      expect(w.find('[data-test="policy-env-videoConference"]').exists()).toBe(true)
      expect(w.find('.policy-row__env-link').attributes('href')).toBe(
        '/admin/config#videoConference',
      )
    })

    it('renders the software-default layer for a configured key', async () => {
      const w = mountWithConfig([ENTRY])
      await w.vm.$nextTick()
      expect(w.vm.softwareDefaultOf('videoConference')).toBe('true')
      expect(w.find('[data-test="policy-software-videoConference"]').exists()).toBe(true)
    })

    it('softwareDefaultOf returns null for unknown keys and the raw string on bad JSON', () => {
      const w = mountWithConfig([{ ...ENTRY, softwareDefault: 'not json' }])
      expect(w.vm.softwareDefaultOf('apiKeysEnabled')).toBeNull()
      expect(w.vm.softwareDefaultOf('videoConference')).toBe('not json')
    })

    it('treats keys without a config entry as available', () => {
      const w = mountWithConfig([])
      expect(w.vm.isUnavailable('videoConference')).toBe(false)
    })
  })

  describe('deep-link highlight from the config tab', () => {
    // The app runs vue-router in history mode, so an in-app navigation is a pushState
    // that browsers don't re-evaluate :target for — the row is highlighted from the
    // route hash instead. A reactive $route lets us exercise the hash watcher too; jsdom
    // has no scrollIntoView, so stub it.
    let attached
    // Attach to the real document so getElementById (used by the scroll) resolves.
    const mountWithRoute = (hash) => {
      const $route = localVue.observable({ hash })
      attached = mount(Policy, {
        mocks: { ...mocks, $route },
        localVue,
        store,
        attachTo: document.body,
      })
      return { w: attached, $route }
    }

    beforeEach(() => {
      window.HTMLElement.prototype.scrollIntoView = jest.fn()
    })
    afterEach(() => {
      attached?.destroy()
      attached = undefined
    })

    it('highlights and scrolls to the row matching the route hash', async () => {
      const { w } = mountWithRoute('#apiKeysEnabled')
      await flushPromises()
      expect(w.vm.highlightedKey).toBe('apiKeysEnabled')
      expect(w.find('#apiKeysEnabled').classes()).toContain('policy-row--highlight')
      expect(w.find('#publicRegistration').classes()).not.toContain('policy-row--highlight')
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    })

    it('highlights nothing for an unknown or empty hash', async () => {
      const { w } = mountWithRoute('#nonsense')
      await flushPromises()
      expect(w.vm.highlightedKey).toBeNull()
      expect(w.find('.policy-row--highlight').exists()).toBe(false)
      expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled()
    })

    it('re-evaluates the highlight when the hash changes without a remount', async () => {
      const { w, $route } = mountWithRoute('')
      await flushPromises()
      expect(w.vm.highlightedKey).toBeNull()
      $route.hash = '#videoConference'
      await w.vm.$nextTick()
      expect(w.vm.highlightedKey).toBe('videoConference')
    })

    it('fades the highlight out after a delay (clears the key so the class drops)', async () => {
      // Fake only the timers; keep setImmediate real so flushPromises still settles.
      jest.useFakeTimers({ doNotFake: ['setImmediate'] })
      const { w } = mountWithRoute('#apiKeysEnabled')
      await flushPromises()
      expect(w.vm.highlightedKey).toBe('apiKeysEnabled')
      jest.advanceTimersByTime(2500)
      expect(w.vm.highlightedKey).toBeNull()
      await w.vm.$nextTick()
      expect(w.find('#apiKeysEnabled').classes()).not.toContain('policy-row--highlight')
      jest.useRealTimers()
    })
  })
})
