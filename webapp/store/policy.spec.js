import { state, mutations, getters, actions } from './policy'

describe('policy store', () => {
  describe('initial state', () => {
    it('starts empty (no frontend defaults), uninitialized, no subscription', () => {
      expect(state()).toEqual({
        snapshot: {},
        defaults: {},
        lastChange: null,
        isInitialized: false,
        subscriptionActive: false,
      })
    })
  })

  describe('mutations', () => {
    // The backend returns a key/value list ({ key, value }, value JSON-encoded); the
    // mutation folds it into a key→value map, parsing each value.
    describe('SET_SNAPSHOT', () => {
      it('parses the JSON values the backend returned into a key→value map', () => {
        const s = { snapshot: {} }
        mutations.SET_SNAPSHOT(s, [
          { key: 'publicRegistration', value: 'true' },
          { key: 'categoriesActive', value: 'true' },
        ])
        expect(s.snapshot).toEqual({ publicRegistration: true, categoriesActive: true })
      })

      it('passes a non-visible key (null value) through as null (no frontend default injected)', () => {
        const s = { snapshot: {} }
        mutations.SET_SNAPSHOT(s, [
          { key: 'apiKeysEnabled', value: null },
          { key: 'apiKeysMaxPerUser', value: null },
        ])
        expect(s.snapshot.apiKeysEnabled).toBeNull()
        expect(s.snapshot.apiKeysMaxPerUser).toBeNull()
      })

      it('treats a missing (undefined) value as null (snapshot never holds undefined)', () => {
        const s = { snapshot: {} }
        mutations.SET_SNAPSHOT(s, [{ key: 'apiKeysEnabled', value: undefined }])
        expect(s.snapshot.apiKeysEnabled).toBeNull()
      })

      it('keeps a visible integer value, including 0', () => {
        const s = { snapshot: {} }
        mutations.SET_SNAPSHOT(s, [
          { key: 'maxGroupPinnedPosts', value: '0' },
          { key: 'apiKeysMaxPerUser', value: '3' },
        ])
        expect(s.snapshot.maxGroupPinnedPosts).toBe(0)
        expect(s.snapshot.apiKeysMaxPerUser).toBe(3)
      })

      it('ignores a per-entry Apollo __typename', () => {
        const s = { snapshot: {} }
        mutations.SET_SNAPSHOT(s, [
          { key: 'publicRegistration', value: 'true', __typename: 'PolicyEntry' },
        ])
        expect(s.snapshot).toEqual({ publicRegistration: true })
        expect(s.snapshot).not.toHaveProperty('__typename')
      })

      it('results in an empty snapshot when given null', () => {
        const s = { snapshot: { apiKeysEnabled: true } }
        mutations.SET_SNAPSHOT(s, null)
        expect(s.snapshot).toEqual({})
      })
    })

    describe('SET_DEFAULTS', () => {
      it('parses the defaults list into a map (null passed through)', () => {
        const s = { defaults: {} }
        mutations.SET_DEFAULTS(s, [
          { key: 'inviteRegistration', value: 'true' },
          { key: 'apiKeysEnabled', value: null },
          { key: 'apiKeysMaxPerUser', value: '5' },
        ])
        expect(s.defaults).toEqual({
          inviteRegistration: true,
          apiKeysEnabled: null,
          apiKeysMaxPerUser: 5,
        })
      })
    })

    describe('SET_LAST_CHANGE', () => {
      it('stores the actor/timestamp, or null when cleared', () => {
        const s = { lastChange: null }
        mutations.SET_LAST_CHANGE(s, { actor: 'admin-1', timestamp: 'ts' })
        expect(s.lastChange).toEqual({ actor: 'admin-1', timestamp: 'ts' })
        mutations.SET_LAST_CHANGE(s, null)
        expect(s.lastChange).toBeNull()
      })
    })

    describe('PATCH_KEY', () => {
      it('updates a single key without touching the others', () => {
        const s = { snapshot: { apiKeysEnabled: false, categoriesActive: true } }
        mutations.PATCH_KEY(s, { key: 'apiKeysEnabled', value: true })
        expect(s.snapshot).toEqual({ apiKeysEnabled: true, categoriesActive: true })
      })
    })

    describe('SET_INITIALIZED', () => {
      it('defaults to true and can be set false', () => {
        const s = {}
        mutations.SET_INITIALIZED(s)
        expect(s.isInitialized).toBe(true)
        mutations.SET_INITIALIZED(s, false)
        expect(s.isInitialized).toBe(false)
      })
    })

    describe('SET_SUBSCRIPTION_ACTIVE', () => {
      it('sets the flag', () => {
        const s = {}
        mutations.SET_SUBSCRIPTION_ACTIVE(s, true)
        expect(s.subscriptionActive).toBe(true)
      })
    })
  })

  describe('getters', () => {
    const snapshot = { apiKeysEnabled: true, categoriesActive: false }

    it('get(key) reads from the snapshot', () => {
      expect(getters.get({ snapshot })('apiKeysEnabled')).toBe(true)
      expect(getters.get({ snapshot })('categoriesActive')).toBe(false)
    })

    it('snapshot returns the whole snapshot', () => {
      expect(getters.snapshot({ snapshot })).toBe(snapshot)
    })

    it('isInitialized reflects state', () => {
      expect(getters.isInitialized({ isInitialized: true })).toBe(true)
      expect(getters.isInitialized({ isInitialized: false })).toBe(false)
    })

    it('getDefault(key) and defaults read from the defaults map', () => {
      const defaults = { apiKeysEnabled: false, inviteRegistration: true }
      expect(getters.getDefault({ defaults })('apiKeysEnabled')).toBe(false)
      expect(getters.defaults({ defaults })).toBe(defaults)
    })

    it('lastChange returns the stored last change', () => {
      const lastChange = { actor: 'admin-1', timestamp: 'ts' }
      expect(getters.lastChange({ lastChange })).toBe(lastChange)
    })
  })

  describe('actions', () => {
    let commit

    const bindAction = (action, defaultClient) =>
      action.bind({ app: { apolloProvider: { defaultClient } } })

    beforeEach(() => {
      commit = jest.fn()
    })

    describe('init', () => {
      it('fetches the viewer-scoped policy and commits snapshot + initialized', async () => {
        // key/value list from the backend, passed straight to SET_SNAPSHOT (which parses it).
        const policy = [
          { key: 'publicRegistration', value: 'true' },
          { key: 'apiKeysEnabled', value: null },
        ]
        const query = jest.fn().mockResolvedValue({ data: { policy } })
        await bindAction(actions.init, { query })({ commit, state: { isInitialized: false } })

        expect(query).toHaveBeenCalled()
        expect(commit).toHaveBeenCalledWith('SET_SNAPSHOT', policy)
        expect(commit).toHaveBeenCalledWith('SET_INITIALIZED')
      })

      it('falls back to an empty snapshot on the first load (never initialized) when the query fails', async () => {
        const query = jest.fn().mockRejectedValue(new Error('network'))
        await bindAction(actions.init, { query })({ commit, state: { isInitialized: false } })

        expect(commit).toHaveBeenCalledWith('SET_SNAPSHOT', [])
      })

      it('keeps the known-good snapshot when a refetch fails after a prior init (no wipe)', async () => {
        // Around login the websocket reconnect fires a second init() whose query
        // is aborted by Apollo's resetStore. That failure must not blank public
        // keys (e.g. inviteRegistration) the first init already loaded.
        const query = jest
          .fn()
          .mockRejectedValue(new Error('Store reset while query was in flight'))
        await bindAction(actions.init, { query })({ commit, state: { isInitialized: true } })

        expect(commit).not.toHaveBeenCalledWith('SET_SNAPSHOT', [])
      })
    })

    describe('fetchDefaults', () => {
      it('queries the admin bundle and commits both defaults and last change', async () => {
        const policyDefaults = {
          defaults: [
            { key: 'publicRegistration', value: 'false' },
            { key: 'apiKeysEnabled', value: 'false' },
          ],
          lastChange: { actor: 'admin-1', timestamp: 'ts' },
        }
        const query = jest.fn().mockResolvedValue({ data: { policyDefaults } })
        await bindAction(actions.fetchDefaults, { query })({ commit })

        expect(query).toHaveBeenCalled()
        expect(commit).toHaveBeenCalledWith('SET_DEFAULTS', policyDefaults.defaults)
        expect(commit).toHaveBeenCalledWith('SET_LAST_CHANGE', {
          actor: 'admin-1',
          timestamp: 'ts',
        })
      })

      it('commits a null last change when nothing has changed yet', async () => {
        const policyDefaults = {
          defaults: [{ key: 'publicRegistration', value: 'false' }],
          lastChange: null,
        }
        const query = jest.fn().mockResolvedValue({ data: { policyDefaults } })
        await bindAction(actions.fetchDefaults, { query })({ commit })

        expect(commit).toHaveBeenCalledWith('SET_LAST_CHANGE', null)
      })
    })

    describe('setKey', () => {
      it('mutates, patches the value, and records the last change', async () => {
        const setPolicy = {
          key: 'apiKeysEnabled',
          value: 'true',
          actor: 'admin-1',
          timestamp: 'ts',
        }
        const mutate = jest.fn().mockResolvedValue({ data: { setPolicy } })
        await bindAction(actions.setKey, { mutate })(
          { commit },
          { key: 'apiKeysEnabled', value: true },
        )

        expect(commit).toHaveBeenCalledWith('PATCH_KEY', { key: 'apiKeysEnabled', value: true })
        expect(commit).toHaveBeenCalledWith('SET_LAST_CHANGE', {
          actor: 'admin-1',
          timestamp: 'ts',
        })
      })

      it('does not crash on an unparseable value; skips the patch, still records the change', async () => {
        const setPolicy = {
          key: 'apiKeysEnabled',
          value: 'not-json',
          actor: 'admin-1',
          timestamp: 'ts',
        }
        const mutate = jest.fn().mockResolvedValue({ data: { setPolicy } })

        await expect(
          bindAction(actions.setKey, { mutate })(
            { commit },
            { key: 'apiKeysEnabled', value: true },
          ),
        ).resolves.toBeDefined()

        expect(commit).not.toHaveBeenCalledWith('PATCH_KEY', expect.anything())
        expect(commit).toHaveBeenCalledWith('SET_LAST_CHANGE', {
          actor: 'admin-1',
          timestamp: 'ts',
        })
      })
    })

    describe('resetKey', () => {
      it('mutates, patches the reset value, and records the last change', async () => {
        const resetPolicy = {
          key: 'categoriesActive',
          value: 'false',
          actor: 'admin-1',
          timestamp: 'ts',
        }
        const mutate = jest.fn().mockResolvedValue({ data: { resetPolicy } })
        await bindAction(actions.resetKey, { mutate })({ commit }, { key: 'categoriesActive' })

        expect(commit).toHaveBeenCalledWith('PATCH_KEY', { key: 'categoriesActive', value: false })
        expect(commit).toHaveBeenCalledWith('SET_LAST_CHANGE', {
          actor: 'admin-1',
          timestamp: 'ts',
        })
      })

      it('does not crash on an unparseable value; skips the patch, still records the change', async () => {
        const resetPolicy = {
          key: 'categoriesActive',
          value: '{bad',
          actor: 'admin-1',
          timestamp: 'ts',
        }
        const mutate = jest.fn().mockResolvedValue({ data: { resetPolicy } })

        await expect(
          bindAction(actions.resetKey, { mutate })({ commit }, { key: 'categoriesActive' }),
        ).resolves.toBeDefined()

        expect(commit).not.toHaveBeenCalledWith('PATCH_KEY', expect.anything())
        expect(commit).toHaveBeenCalledWith('SET_LAST_CHANGE', {
          actor: 'admin-1',
          timestamp: 'ts',
        })
      })
    })

    describe('resetKeys (bulk)', () => {
      it('patches each returned event and records the last change once', async () => {
        const resetPolicies = [
          { key: 'categoriesActive', value: 'false', actor: 'admin-1', timestamp: 't1' },
          { key: 'apiKeysMaxPerUser', value: '5', actor: 'admin-1', timestamp: 't2' },
        ]
        const mutate = jest.fn().mockResolvedValue({ data: { resetPolicies } })
        await bindAction(actions.resetKeys, { mutate })(
          { commit },
          { keys: ['categoriesActive', 'apiKeysMaxPerUser'] },
        )

        expect(mutate).toHaveBeenCalledTimes(1)
        expect(commit).toHaveBeenCalledWith('PATCH_KEY', { key: 'categoriesActive', value: false })
        expect(commit).toHaveBeenCalledWith('PATCH_KEY', { key: 'apiKeysMaxPerUser', value: 5 })
        // Last change recorded once, from the last event of the batch.
        expect(commit).toHaveBeenCalledWith('SET_LAST_CHANGE', {
          actor: 'admin-1',
          timestamp: 't2',
        })
      })

      it('records no change when nothing diverged (empty result)', async () => {
        const mutate = jest.fn().mockResolvedValue({ data: { resetPolicies: [] } })
        await bindAction(actions.resetKeys, { mutate })({ commit }, { keys: ['categoriesActive'] })

        expect(commit).not.toHaveBeenCalledWith('PATCH_KEY', expect.anything())
        expect(commit).not.toHaveBeenCalledWith('SET_LAST_CHANGE', expect.anything())
      })

      it('skips an unparseable value but still records the last change', async () => {
        const resetPolicies = [
          { key: 'categoriesActive', value: '{bad', actor: 'admin-1', timestamp: 't1' },
        ]
        const mutate = jest.fn().mockResolvedValue({ data: { resetPolicies } })
        await bindAction(actions.resetKeys, { mutate })({ commit }, { keys: ['categoriesActive'] })

        expect(commit).not.toHaveBeenCalledWith('PATCH_KEY', expect.anything())
        expect(commit).toHaveBeenCalledWith('SET_LAST_CHANGE', {
          actor: 'admin-1',
          timestamp: 't1',
        })
      })
    })

    describe('subscribe', () => {
      it('is a no-op when already subscribed', () => {
        const clientSubscribe = jest.fn()
        bindAction(actions.subscribe, { subscribe: clientSubscribe })({
          commit,
          state: { subscriptionActive: true },
        })
        expect(clientSubscribe).not.toHaveBeenCalled()
      })

      it('opens the subscription and patches the snapshot live on each event', () => {
        let observer
        const clientSubscribe = jest.fn(() => ({
          subscribe: (obs) => {
            observer = obs
          },
        }))
        bindAction(actions.subscribe, { subscribe: clientSubscribe })({
          commit,
          state: { subscriptionActive: false },
        })

        expect(commit).toHaveBeenCalledWith('SET_SUBSCRIPTION_ACTIVE', true)

        // Lean value-change event: key + value only (no actor/timestamp).
        observer.next({
          data: {
            policyChanged: { key: 'apiKeysEnabled', value: 'true' },
          },
        })
        expect(commit).toHaveBeenCalledWith('PATCH_KEY', { key: 'apiKeysEnabled', value: true })
        // The broadcast carries no last-change metadata, so none is committed.
        expect(commit).not.toHaveBeenCalledWith('SET_LAST_CHANGE', expect.anything())

        observer.error(new Error('socket dropped'))
        expect(commit).toHaveBeenCalledWith('SET_SUBSCRIPTION_ACTIVE', false)
      })

      it('ignores a malformed event payload without committing PATCH_KEY or crashing', () => {
        let observer
        const clientSubscribe = jest.fn(() => ({
          subscribe: (obs) => {
            observer = obs
          },
        }))
        bindAction(actions.subscribe, { subscribe: clientSubscribe })({
          commit,
          state: { subscriptionActive: false },
        })

        // value is not valid JSON ⇒ JSON.parse throws; the handler must swallow it.
        expect(() => {
          observer.next({
            data: { policyChanged: { key: 'publicRegistration', value: 'not-json' } },
          })
        }).not.toThrow()

        expect(commit).not.toHaveBeenCalledWith('PATCH_KEY', expect.anything())
      })
    })

    describe('resubscribe', () => {
      it('tears down the stale subscription and opens a fresh one on the new socket', () => {
        // restartWebsockets() on login/logout drops the operation handler, so the
        // old observable goes silent — resubscribe must unsubscribe it and open a
        // brand-new subscription that re-registers a live handler.
        const unsubscribe = jest.fn()
        const innerSubscribe = jest.fn(() => ({ unsubscribe }))
        const clientSubscribe = jest.fn(() => ({ subscribe: innerSubscribe }))

        // Open one first so there is a handle to tear down.
        bindAction(actions.subscribe, { subscribe: clientSubscribe })({
          commit,
          state: { subscriptionActive: false },
        })
        expect(innerSubscribe).toHaveBeenCalledTimes(1)

        bindAction(actions.resubscribe, { subscribe: clientSubscribe })({ commit })

        expect(unsubscribe).toHaveBeenCalledTimes(1)
        expect(commit).toHaveBeenCalledWith('SET_SUBSCRIPTION_ACTIVE', false)
        expect(innerSubscribe).toHaveBeenCalledTimes(2)
        expect(commit).toHaveBeenCalledWith('SET_SUBSCRIPTION_ACTIVE', true)
      })

      it('opens a fresh subscription without crashing when there is no prior handle', () => {
        // Recover flow: resubscribe may run before any subscribe (e.g. login on a
        // client whose initial subscribe never fired). A fresh module instance
        // guarantees the module-level handle starts null, so this exercises the
        // "no handle to tear down" branch in isolation.
        jest.isolateModules(() => {
          const { actions: freshActions } = require('./policy')
          const innerSubscribe = jest.fn(() => ({ unsubscribe: jest.fn() }))
          const clientSubscribe = jest.fn(() => ({ subscribe: innerSubscribe }))

          expect(() =>
            freshActions.resubscribe.bind({
              app: { apolloProvider: { defaultClient: { subscribe: clientSubscribe } } },
            })({ commit }),
          ).not.toThrow()

          expect(innerSubscribe).toHaveBeenCalledTimes(1)
          expect(commit).toHaveBeenCalledWith('SET_SUBSCRIPTION_ACTIVE', false)
          expect(commit).toHaveBeenCalledWith('SET_SUBSCRIPTION_ACTIVE', true)
        })
      })
    })
  })
})
