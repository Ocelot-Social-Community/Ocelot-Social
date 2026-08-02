import { state as createState, mutations, getters, actions } from './auth.js'
import { getBranding, setBranding } from '@ocelot-social/branding'
import { restartWebsockets } from 'vue-cli-plugin-apollo/graphql-client'

// login/logout switch identity themselves now (the auth cookie is ours — see utils/authCookie.js):
// the websocket has to reconnect so its connectionParams carry the new token. Mocked to observe it.
jest.mock('vue-cli-plugin-apollo/graphql-client', () => ({ restartWebsockets: jest.fn() }))

const noop = () => {}

describe('auth store', () => {
  describe('initial state', () => {
    it('starts logged out', () => {
      expect(createState()).toEqual({
        user: null,
        token: null,
        pending: false,
        permissions: [],
        permissionsSubscriptionActive: false,
      })
    })
  })

  describe('mutations', () => {
    it('SET_USER stores a user or falls back to null', () => {
      const state = createState()
      mutations.SET_USER(state, { id: 'u1' })
      expect(state.user).toEqual({ id: 'u1' })
      mutations.SET_USER(state, null)
      expect(state.user).toBeNull()
    })

    it('SET_USER_PARTIAL merges fields into the existing user', () => {
      const state = { user: { id: 'u1', name: 'Old' } }
      mutations.SET_USER_PARTIAL(state, { name: 'New', avatar: 'a' })
      expect(state.user).toEqual({ id: 'u1', name: 'New', avatar: 'a' })
    })

    it('SET_TOKEN stores a token or falls back to null', () => {
      const state = createState()
      mutations.SET_TOKEN(state, 'jwt')
      expect(state.token).toBe('jwt')
      mutations.SET_TOKEN(state, '')
      expect(state.token).toBeNull()
    })

    it('SET_PENDING toggles the pending flag', () => {
      const state = createState()
      mutations.SET_PENDING(state, true)
      expect(state.pending).toBe(true)
      mutations.SET_PENDING(state, false)
      expect(state.pending).toBe(false)
    })

    it('SET_PERMISSIONS stores an array, coercing non-arrays to empty', () => {
      const state = createState()
      const perms = [
        { key: 'post.create', group: 'content' },
        { key: 'badge.manage', group: 'moderation' },
      ]
      mutations.SET_PERMISSIONS(state, perms)
      expect(state.permissions).toEqual(perms)
      mutations.SET_PERMISSIONS(state, null)
      expect(state.permissions).toEqual([])
    })

    it('SET_PERMISSIONS_SUBSCRIPTION_ACTIVE toggles the flag', () => {
      const state = createState()
      mutations.SET_PERMISSIONS_SUBSCRIPTION_ACTIVE(state, true)
      expect(state.permissionsSubscriptionActive).toBe(true)
      mutations.SET_PERMISSIONS_SUBSCRIPTION_ACTIVE(state, false)
      expect(state.permissionsSubscriptionActive).toBe(false)
    })
  })

  describe('getters', () => {
    it('isAuthenticated reflects whether a token is set', () => {
      expect(getters.isAuthenticated({ token: null })).toBe(false)
      expect(getters.isAuthenticated({ token: 'jwt' })).toBe(true)
    })

    it('isLoggedIn requires both user and token', () => {
      expect(getters.isLoggedIn({ user: null, token: 'jwt' })).toBe(false)
      expect(getters.isLoggedIn({ user: { id: 'u1' }, token: null })).toBe(false)
      expect(getters.isLoggedIn({ user: { id: 'u1' }, token: 'jwt' })).toBe(true)
    })

    it('pending coerces to boolean', () => {
      expect(getters.pending({ pending: true })).toBe(true)
      expect(getters.pending({ pending: undefined })).toBe(false)
    })

    it('isAdmin holds for ANY administration-group permission (group-driven, not a key list)', () => {
      expect(getters.isAdmin({ permissions: [] })).toBe(false)
      expect(getters.isAdmin({ permissions: [{ key: 'post.create', group: 'content' }] })).toBe(
        false,
      )
      expect(
        getters.isAdmin({ permissions: [{ key: 'role.manage', group: 'administration' }] }),
      ).toBe(true)
      // A different administration-group key qualifies too — no per-key list to maintain.
      expect(
        getters.isAdmin({ permissions: [{ key: 'policy.manage', group: 'administration' }] }),
      ).toBe(true)
    })

    it('isModerator requires content.moderate specifically (not any moderation-group key)', () => {
      expect(getters.isModerator({ permissions: [] })).toBe(false)
      expect(getters.isModerator({ permissions: [{ key: 'post.create', group: 'content' }] })).toBe(
        false,
      )
      // post.pin is moderation-group but must NOT grant the moderation page.
      expect(getters.isModerator({ permissions: [{ key: 'post.pin', group: 'moderation' }] })).toBe(
        false,
      )
      expect(
        getters.isModerator({ permissions: [{ key: 'content.moderate', group: 'moderation' }] }),
      ).toBe(true)
    })

    it('canAccessModeration holds for ANY moderation-group permission (group-driven, like isAdmin)', () => {
      expect(getters.canAccessModeration({ permissions: [] })).toBe(false)
      expect(
        getters.canAccessModeration({ permissions: [{ key: 'post.create', group: 'content' }] }),
      ).toBe(false)
      // badge.manage alone (no content.moderate) grants area access.
      expect(
        getters.canAccessModeration({
          permissions: [{ key: 'badge.manage', group: 'moderation' }],
        }),
      ).toBe(true)
      // content.moderate qualifies too — any moderation-group key does.
      expect(
        getters.canAccessModeration({
          permissions: [{ key: 'content.moderate', group: 'moderation' }],
        }),
      ).toBe(true)
    })

    it('canManageUsers holds for badge.manage OR user.disable OR user.delete.any', () => {
      expect(getters.canManageUsers({ permissions: [] })).toBe(false)
      expect(
        getters.canManageUsers({ permissions: [{ key: 'content.moderate', group: 'moderation' }] }),
      ).toBe(false)
      expect(
        getters.canManageUsers({ permissions: [{ key: 'badge.manage', group: 'moderation' }] }),
      ).toBe(true)
      expect(
        getters.canManageUsers({ permissions: [{ key: 'user.disable', group: 'moderation' }] }),
      ).toBe(true)
      expect(
        getters.canManageUsers({
          permissions: [{ key: 'user.delete.any', group: 'administration' }],
        }),
      ).toBe(true)
    })

    it('permissions returns the stored permission array', () => {
      const perms = [{ key: 'post.create', group: 'content' }]
      expect(getters.permissions({ permissions: perms })).toEqual(perms)
    })

    it('can() is true only for held permission keys', () => {
      const can = getters.can({
        permissions: [
          { key: 'post.create', group: 'content' },
          { key: 'role.manage', group: 'administration' },
        ],
      })
      expect(can('role.manage')).toBe(true)
      expect(can('badge.manage')).toBe(false)
      // tolerates a missing/non-array permissions state (e.g. anonymous)
      expect(getters.can({ permissions: undefined })('post.create')).toBe(false)
    })

    it('user returns the stored user or an empty object', () => {
      expect(getters.user({ user: { id: 'u1' } })).toEqual({ id: 'u1' })
      expect(getters.user({ user: null })).toEqual({})
    })

    it('token returns the stored token', () => {
      expect(getters.token({ token: 'jwt' })).toBe('jwt')
      expect(getters.token({ token: null })).toBeNull()
    })

    it('termsAndConditionsAgreed compares against the current VERSION', () => {
      // Inject a fixed T&C version so the assertion is independent of the real branding default
      // (auth.js compares against branding.termsAndConditions.version). setBranding is the runtime
      // injection API — cleaner than mocking the whole module, which auth.js also uses transitively
      // (constants/metadata → branding.metadata) in the login tests.
      const original = getBranding()
      setBranding({
        ...original,
        termsAndConditions: { ...original.termsAndConditions, version: 'test-tac-version' },
      })
      try {
        expect(getters.termsAndConditionsAgreed({ user: null })).toBeFalsy()
        expect(
          getters.termsAndConditionsAgreed({ user: { termsAndConditionsAgreedVersion: '0.0.0' } }),
        ).toBe(false)
        expect(
          getters.termsAndConditionsAgreed({
            user: { termsAndConditionsAgreedVersion: 'test-tac-version' },
          }),
        ).toBe(true)
      } finally {
        setBranding(original)
      }
    })
  })

  describe('actions', () => {
    // The token handed in doubles as "the cookie the browser kept" — that is what init/check read
    // and what login()'s no-cookie guard checks after writing it.
    const authCookie = (token = null) => ({
      get: jest.fn(() => token),
      set: jest.fn(),
      remove: jest.fn(),
    })

    // A defaultClient carrying just what the session switch touches.
    const apolloProvider = (defaultClient = {}) => ({
      defaultClient: {
        resetStore: jest.fn().mockResolvedValue(),
        wsClient: { id: 'ws' },
        ...defaultClient,
      },
    })

    describe('init', () => {
      it('returns early when not running on the server', async () => {
        const commit = jest.fn()
        const dispatch = jest.fn()
        const previousServer = process.server
        process.server = false
        try {
          await actions.init.call(
            { app: { $authCookie: authCookie('jwt') } },
            {
              commit,
              dispatch,
            },
          )
        } finally {
          process.server = previousServer
        }
        expect(commit).not.toHaveBeenCalled()
        expect(dispatch).not.toHaveBeenCalled()
      })

      it('returns early when no token cookie is set', async () => {
        const commit = jest.fn()
        const dispatch = jest.fn()
        const previousServer = process.server
        process.server = true
        try {
          await actions.init.call(
            { app: { $authCookie: authCookie(null) } },
            {
              commit,
              dispatch,
            },
          )
        } finally {
          process.server = previousServer
        }
        expect(commit).not.toHaveBeenCalled()
      })

      it('writes the token and fetches the user when a token is present', async () => {
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        const previousServer = process.server
        process.server = true
        try {
          await actions.init.call(
            { app: { $authCookie: authCookie('jwt') } },
            {
              commit,
              dispatch,
            },
          )
        } finally {
          process.server = previousServer
        }
        expect(commit).toHaveBeenCalledWith('SET_TOKEN', 'jwt')
        expect(dispatch).toHaveBeenCalledWith('fetchCurrentUser')
      })
    })

    describe('check', () => {
      it('logs out and returns isLoggedIn when no token is set', async () => {
        const dispatch = jest.fn().mockResolvedValue()
        const ctx = {
          commit: noop,
          dispatch,
          getters: { isLoggedIn: false },
        }
        const result = await actions.check.call({ app: { $authCookie: authCookie(null) } }, ctx)
        expect(dispatch).toHaveBeenCalledWith('logout')
        expect(result).toBe(false)
      })

      it('skips logout and returns isLoggedIn when token is present', async () => {
        const dispatch = jest.fn()
        const ctx = {
          commit: noop,
          dispatch,
          getters: { isLoggedIn: true },
        }
        const result = await actions.check.call({ app: { $authCookie: authCookie('jwt') } }, ctx)
        expect(dispatch).not.toHaveBeenCalled()
        expect(result).toBe(true)
      })
    })

    describe('refreshPermissions', () => {
      const callWith = (query, commit) =>
        actions.refreshPermissions.call(
          { app: { apolloProvider: { defaultClient: { query } } } },
          { commit },
        )

      it('commits the freshly fetched permissions', async () => {
        const myPermissions = [{ key: 'network.statistics.read', group: 'administration' }]
        const query = jest.fn().mockResolvedValue({ data: { myPermissions } })
        const commit = jest.fn()
        await callWith(query, commit)
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS', myPermissions)
      })

      it('falls back to [] when myPermissions is absent', async () => {
        const query = jest.fn().mockResolvedValue({ data: {} })
        const commit = jest.fn()
        await callWith(query, commit)
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS', [])
      })

      it('keeps existing permissions on a transient error (no commit, no throw)', async () => {
        const query = jest.fn().mockRejectedValue(new Error('boom'))
        const commit = jest.fn()
        await callWith(query, commit)
        expect(commit).not.toHaveBeenCalled()
      })
    })

    describe('permissions subscription', () => {
      // A fake apollo client whose subscribe() exposes the registered handler so the
      // next/error callbacks can be driven directly.
      const makeStore = (permissionsSubscriptionActive = false) => {
        let handler
        const innerSubscribe = jest.fn((h) => {
          handler = h
          return { unsubscribe: jest.fn() }
        })
        const subscribe = jest.fn(() => ({ subscribe: innerSubscribe }))
        const commit = jest.fn()
        const dispatch = jest.fn()
        const store = {
          app: { apolloProvider: { defaultClient: { subscribe } } },
          commit,
          dispatch,
          state: { permissionsSubscriptionActive },
        }
        return { store, subscribe, commit, dispatch, getHandler: () => handler }
      }

      it('opens the subscription and marks it active when inactive', () => {
        const { store, subscribe, commit } = makeStore(false)
        actions.subscribePermissions.call(store, store)
        expect(subscribe).toHaveBeenCalled()
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS_SUBSCRIPTION_ACTIVE', true)
      })

      it('is a no-op when already active', () => {
        const { store, subscribe } = makeStore(true)
        actions.subscribePermissions.call(store, store)
        expect(subscribe).not.toHaveBeenCalled()
      })

      it('refetches permissions when an event arrives', () => {
        const { store, dispatch, getHandler } = makeStore(false)
        actions.subscribePermissions.call(store, store)
        getHandler().next()
        expect(dispatch).toHaveBeenCalledWith('refreshPermissions')
      })

      it('marks the subscription inactive on error', () => {
        const { store, commit, getHandler } = makeStore(false)
        actions.subscribePermissions.call(store, store)
        getHandler().error()
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS_SUBSCRIPTION_ACTIVE', false)
      })

      it('resubscribePermissions tears down and re-opens', () => {
        const { store, subscribe, commit } = makeStore(true)
        actions.resubscribePermissions.call(store, store)
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS_SUBSCRIPTION_ACTIVE', false)
        expect(subscribe).toHaveBeenCalled()
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS_SUBSCRIPTION_ACTIVE', true)
      })
    })

    describe('fetchCurrentUser', () => {
      it('commits SET_USER and returns the user when the query succeeds', async () => {
        const query = jest.fn().mockResolvedValue({ data: { currentUser: { id: 'u1' } } })
        const commit = jest.fn()
        const dispatch = jest.fn()
        const ctx = { commit, dispatch }
        const result = await actions.fetchCurrentUser.call(
          { app: { apolloProvider: { defaultClient: { query } } } },
          ctx,
        )
        expect(commit).toHaveBeenCalledWith('SET_USER', { id: 'u1' })
        expect(result).toEqual({ id: 'u1' })
      })

      it('commits the effective permissions (with their groups) from myPermissions', async () => {
        const myPermissions = [{ key: 'role.manage', group: 'administration' }]
        const query = jest.fn().mockResolvedValue({
          data: { currentUser: { id: 'u1' }, myPermissions },
        })
        const commit = jest.fn()
        const ctx = { commit, dispatch: jest.fn() }
        await actions.fetchCurrentUser.call(
          { app: { apolloProvider: { defaultClient: { query } } } },
          ctx,
        )
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS', myPermissions)
      })

      it('falls back to [] when myPermissions is absent (clears any stale permissions)', async () => {
        const query = jest.fn().mockResolvedValue({
          data: { currentUser: { id: 'u1' } }, // no myPermissions in the response
        })
        const commit = jest.fn()
        const ctx = { commit, dispatch: jest.fn() }
        await actions.fetchCurrentUser.call(
          { app: { apolloProvider: { defaultClient: { query } } } },
          ctx,
        )
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS', [])
      })

      it('dispatches logout when currentUser is null', async () => {
        const query = jest.fn().mockResolvedValue({ data: { currentUser: null } })
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue('logged-out')
        const ctx = { commit, dispatch }
        const result = await actions.fetchCurrentUser.call(
          { app: { apolloProvider: { defaultClient: { query } } } },
          ctx,
        )
        expect(dispatch).toHaveBeenCalledWith('logout')
        expect(result).toBe('logged-out')
        expect(commit).not.toHaveBeenCalled()
      })

      it('logs out when the query itself fails — an unusable session must not linger', async () => {
        // e.g. the token was revoked server-side: the query rejects, and staying "logged in" with a
        // dead token would leave the UI in a state where every action fails.
        const query = jest.fn().mockRejectedValue(new Error('unauthenticated'))
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue('logged-out')
        const result = await actions.fetchCurrentUser.call(
          { app: { apolloProvider: { defaultClient: { query } } } },
          { commit, dispatch },
        )
        expect(dispatch).toHaveBeenCalledWith('logout')
        expect(result).toBe('logged-out')
      })
    })

    describe('login', () => {
      const makeLoginThis = (mutate, cookie) => ({
        app: {
          apolloProvider: apolloProvider({ mutate }),
          $authCookie: cookie,
        },
      })

      it('runs the full happy path: mutate, cookie, token, user, categories/policy, pending toggle', async () => {
        restartWebsockets.mockClear()
        const mutate = jest.fn().mockResolvedValue({ data: { login: 'jwt' } })
        const cookie = authCookie('jwt') // the cookie just written reads back
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        const context = makeLoginThis(mutate, cookie)
        await actions.login.call(
          context,
          { commit, dispatch },
          {
            email: 'a@b.c',
            password: 'pw',
          },
        )

        expect(commit).toHaveBeenNthCalledWith(1, 'SET_PENDING', true)
        expect(mutate).toHaveBeenCalledWith(
          expect.objectContaining({ variables: { email: 'a@b.c', password: 'pw' } }),
        )
        expect(cookie.set).toHaveBeenCalledWith('jwt')
        // the session switch @nuxtjs/apollo's onLogin used to perform: authenticated socket, no
        // cache left over from the anonymous session
        expect(restartWebsockets).toHaveBeenCalledWith(
          context.app.apolloProvider.defaultClient.wsClient,
        )
        expect(context.app.apolloProvider.defaultClient.resetStore).toHaveBeenCalled()
        expect(commit).toHaveBeenCalledWith('SET_TOKEN', 'jwt')
        // Exact and ORDERED: the two resubscribes re-open the subscriptions the session switch
        // above just dropped, and they have to run after the authenticated policy/init has replaced
        // the anonymous snapshot. A swap would leave stale data with a live handler on top.
        expect(dispatch.mock.calls).toEqual([
          ['fetchCurrentUser'],
          ['categories/init', null, { root: true }],
          ['policy/init', null, { root: true }],
          ['policy/resubscribe', null, { root: true }],
          ['resubscribePermissions'],
        ])
        // finally{} always clears pending
        expect(commit).toHaveBeenLastCalledWith('SET_PENDING', false)
      })

      it('survives a resetStore that rejects — the session switch already happened', async () => {
        const mutate = jest.fn().mockResolvedValue({ data: { login: 'jwt' } })
        const context = makeLoginThis(mutate, authCookie('jwt'))
        context.app.apolloProvider.defaultClient.resetStore = jest
          .fn()
          .mockRejectedValue(new Error('refetch failed'))
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        await actions.login.call(context, { commit, dispatch }, { email: 'a@b.c', password: 'pw' })
        expect(commit).toHaveBeenCalledWith('SET_TOKEN', 'jwt')
      })

      it('does not touch the websocket when there is none (SSR / not connected)', async () => {
        restartWebsockets.mockClear()
        const mutate = jest.fn().mockResolvedValue({ data: { login: 'jwt' } })
        const context = makeLoginThis(mutate, authCookie('jwt'))
        context.app.apolloProvider.defaultClient.wsClient = undefined
        await actions.login.call(
          context,
          { commit: jest.fn(), dispatch: jest.fn().mockResolvedValue() },
          { email: 'a@b.c', password: 'pw' },
        )
        expect(restartWebsockets).not.toHaveBeenCalled()
      })

      it('throws (and still clears pending) when the auth cookie is missing afterwards', async () => {
        // authCookie() → get returns null: the browser did not keep the cookie login just wrote.
        const mutate = jest.fn().mockResolvedValue({ data: { login: 'jwt' } })
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        await expect(
          actions.login.call(
            makeLoginThis(mutate, authCookie()),
            { commit, dispatch },
            {
              email: 'a@b.c',
              password: 'pw',
            },
          ),
        ).rejects.toThrow('no-cookie')
        expect(commit).toHaveBeenLastCalledWith('SET_PENDING', false)
      })

      it('throws (and still clears pending) when the login mutation fails', async () => {
        const mutate = jest.fn().mockRejectedValue(new Error('bad-credentials'))
        const cookie = authCookie()
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        await expect(
          actions.login.call(
            makeLoginThis(mutate, cookie),
            { commit, dispatch },
            {
              email: 'a@b.c',
              password: 'wrong',
            },
          ),
        ).rejects.toThrow('bad-credentials')
        // bailed out before persisting the session
        expect(cookie.set).not.toHaveBeenCalled()
        expect(commit).not.toHaveBeenCalledWith('SET_TOKEN', expect.anything())
        expect(dispatch).not.toHaveBeenCalledWith('fetchCurrentUser')
        expect(commit).toHaveBeenLastCalledWith('SET_PENDING', false)
      })
    })

    describe('logout', () => {
      it('resets user/token, clears the cookie, restarts the session and re-inits the anonymous policy', async () => {
        restartWebsockets.mockClear()
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        const cookie = authCookie('jwt')
        const context = { app: { apolloProvider: apolloProvider(), $authCookie: cookie } }
        await actions.logout.call(context, { commit, dispatch })
        expect(commit).toHaveBeenCalledWith('SET_USER', null)
        expect(commit).toHaveBeenCalledWith('SET_TOKEN', null)
        expect(commit).toHaveBeenCalledWith('SET_PERMISSIONS', [])
        expect(cookie.remove).toHaveBeenCalled()
        expect(restartWebsockets).toHaveBeenCalled()
        expect(context.app.apolloProvider.defaultClient.resetStore).toHaveBeenCalled()
        // Same ordering guard as in login: resubscribe re-opens the subscription the session
        // restart dropped, and must run after the anonymous policy/init reset the snapshot.
        expect(dispatch.mock.calls).toEqual([
          ['policy/init', null, { root: true }],
          ['policy/resubscribe', null, { root: true }],
          ['resubscribePermissions'],
        ])
      })
    })
  })
})
