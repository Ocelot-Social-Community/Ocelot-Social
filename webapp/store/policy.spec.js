import { state, mutations, getters, actions } from './policy'

describe('policy store', () => {
  describe('initial state', () => {
    it('starts empty (no frontend defaults), uninitialized, no subscription', () => {
      expect(state()).toEqual({
        snapshot: {},
        defaults: {},
        isInitialized: false,
        subscriptionActive: false,
      })
    })
  })

  describe('mutations', () => {
    describe('SET_SNAPSHOT', () => {
      it('keeps the values the backend returned (no frontend-side defaults added)', () => {
        const s = { snapshot: {} }
        mutations.SET_SNAPSHOT(s, { publicRegistration: true, categoriesActive: true })
        expect(s.snapshot).toEqual({ publicRegistration: true, categoriesActive: true })
      })

      it('treats a non-visible key (null) as off (false)', () => {
        const s = { snapshot: {} }
        mutations.SET_SNAPSHOT(s, { apiKeysEnabled: null })
        expect(s.snapshot.apiKeysEnabled).toBe(false)
      })

      it('strips Apollo __typename', () => {
        const s = { snapshot: {} }
        mutations.SET_SNAPSHOT(s, { publicRegistration: true, __typename: 'Policy' })
        expect(s.snapshot).not.toHaveProperty('__typename')
      })

      it('results in an empty snapshot when given null', () => {
        const s = { snapshot: { apiKeysEnabled: true } }
        mutations.SET_SNAPSHOT(s, null)
        expect(s.snapshot).toEqual({})
      })
    })

    describe('SET_DEFAULTS', () => {
      it('stores backend defaults (null → false, __typename stripped)', () => {
        const s = { defaults: {} }
        mutations.SET_DEFAULTS(s, {
          inviteRegistration: true,
          apiKeysEnabled: null,
          __typename: 'Policy',
        })
        expect(s.defaults).toEqual({ inviteRegistration: true, apiKeysEnabled: false })
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
        const policy = { publicRegistration: true, apiKeysEnabled: null }
        const query = jest.fn().mockResolvedValue({ data: { policy } })
        await bindAction(actions.init, { query })({ commit })

        expect(query).toHaveBeenCalled()
        expect(commit).toHaveBeenCalledWith('SET_SNAPSHOT', policy)
        expect(commit).toHaveBeenCalledWith('SET_INITIALIZED')
      })

      it('falls back to an empty snapshot (everything off) and stays uninitialized on failure', async () => {
        const query = jest.fn().mockRejectedValue(new Error('network'))
        await bindAction(actions.init, { query })({ commit })

        expect(commit).toHaveBeenCalledWith('SET_SNAPSHOT', {})
        expect(commit).toHaveBeenCalledWith('SET_INITIALIZED', false)
      })
    })

    describe('fetchDefaults', () => {
      it('queries the configured defaults and commits them', async () => {
        const policyDefaults = { publicRegistration: false, apiKeysEnabled: false }
        const query = jest.fn().mockResolvedValue({ data: { policyDefaults } })
        await bindAction(actions.fetchDefaults, { query })({ commit })

        expect(query).toHaveBeenCalled()
        expect(commit).toHaveBeenCalledWith('SET_DEFAULTS', policyDefaults)
      })
    })

    describe('setKey', () => {
      it('mutates and optimistically patches the JSON-parsed value', async () => {
        const mutate = jest
          .fn()
          .mockResolvedValue({ data: { setPolicy: { key: 'apiKeysEnabled', value: 'true' } } })
        await bindAction(actions.setKey, { mutate })({ commit }, { key: 'apiKeysEnabled', value: true })

        expect(commit).toHaveBeenCalledWith('PATCH_KEY', { key: 'apiKeysEnabled', value: true })
      })
    })

    describe('resetKey', () => {
      it('mutates and patches the reset value', async () => {
        const mutate = jest
          .fn()
          .mockResolvedValue({ data: { resetPolicy: { key: 'categoriesActive', value: 'false' } } })
        await bindAction(actions.resetKey, { mutate })({ commit }, { key: 'categoriesActive' })

        expect(commit).toHaveBeenCalledWith('PATCH_KEY', { key: 'categoriesActive', value: false })
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

      it('opens the subscription and patches the snapshot on each event', () => {
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

        observer.next({ data: { policyChanged: { key: 'apiKeysEnabled', value: 'true' } } })
        expect(commit).toHaveBeenCalledWith('PATCH_KEY', { key: 'apiKeysEnabled', value: true })

        observer.error(new Error('socket dropped'))
        expect(commit).toHaveBeenCalledWith('SET_SUBSCRIPTION_ACTIVE', false)
      })
    })
  })
})
