import { state as createState, mutations, getters, actions } from './auth.js'
import { VERSION } from '~/constants/terms-and-conditions-version.js'

// auth.js instantiates `new Cookie()` at module load and reads the auth cookie
// inside login(). Mock universal-cookie so we can drive that branch (cookie
// present → success, cookie missing → 'no-cookie' throw). `get` reads the value
// lazily so the mock survives the construction that happens during import.
let mockCookieValue
jest.mock('universal-cookie', () =>
  jest.fn().mockImplementation(() => ({ get: () => mockCookieValue })),
)

const noop = () => {}

describe('auth store', () => {
  // Reset the shared cookie-mock state so each test starts deterministically
  // (login tests set it explicitly; everything else gets a clean "no cookie").
  beforeEach(() => {
    mockCookieValue = undefined
  })

  describe('initial state', () => {
    it('starts logged out', () => {
      expect(createState()).toEqual({ user: null, token: null, pending: false })
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

    it('isAdmin requires role === admin', () => {
      expect(getters.isAdmin({ user: null })).toBe(false)
      expect(getters.isAdmin({ user: { role: 'usual' } })).toBe(false)
      expect(getters.isAdmin({ user: { role: 'admin' } })).toBe(true)
    })

    it('isModerator accepts admin OR moderator role', () => {
      expect(getters.isModerator({ user: null })).toBe(false)
      expect(getters.isModerator({ user: { role: 'usual' } })).toBe(false)
      expect(getters.isModerator({ user: { role: 'moderator' } })).toBe(true)
      expect(getters.isModerator({ user: { role: 'admin' } })).toBe(true)
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
      expect(getters.termsAndConditionsAgreed({ user: null })).toBeFalsy()
      expect(
        getters.termsAndConditionsAgreed({ user: { termsAndConditionsAgreedVersion: '0.0.0' } }),
      ).toBe(false)
      expect(
        getters.termsAndConditionsAgreed({
          user: { termsAndConditionsAgreedVersion: VERSION },
        }),
      ).toBe(true)
    })
  })

  describe('actions', () => {
    const apolloHelpers = (token = null) => ({
      getToken: jest.fn(() => token),
      onLogin: jest.fn().mockResolvedValue(),
      onLogout: jest.fn().mockResolvedValue('logged-out'),
    })

    describe('init', () => {
      it('returns early when not running on the server', async () => {
        const commit = jest.fn()
        const dispatch = jest.fn()
        const previousServer = process.server
        process.server = false
        try {
          await actions.init.call(
            { app: { $apolloHelpers: apolloHelpers('jwt') } },
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
            { app: { $apolloHelpers: apolloHelpers(null) } },
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
            { app: { $apolloHelpers: apolloHelpers('jwt') } },
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
        const result = await actions.check.call(
          { app: { $apolloHelpers: apolloHelpers(null) } },
          ctx,
        )
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
        const result = await actions.check.call(
          { app: { $apolloHelpers: apolloHelpers('jwt') } },
          ctx,
        )
        expect(dispatch).not.toHaveBeenCalled()
        expect(result).toBe(true)
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
    })

    describe('login', () => {
      const makeLoginThis = (mutate, helpers) => ({
        app: {
          apolloProvider: { defaultClient: { mutate } },
          $apolloHelpers: helpers,
        },
      })

      it('runs the full happy path: mutate, onLogin, token, user, categories/policy, pending toggle', async () => {
        mockCookieValue = 'cookie-present'
        const mutate = jest.fn().mockResolvedValue({ data: { login: 'jwt' } })
        const helpers = apolloHelpers()
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        await actions.login.call(
          makeLoginThis(mutate, helpers),
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
        expect(helpers.onLogin).toHaveBeenCalledWith('jwt')
        expect(commit).toHaveBeenCalledWith('SET_TOKEN', 'jwt')
        expect(dispatch).toHaveBeenCalledWith('fetchCurrentUser')
        expect(dispatch).toHaveBeenCalledWith('categories/init', null, { root: true })
        expect(dispatch).toHaveBeenCalledWith('policy/init', null, { root: true })
        expect(dispatch).toHaveBeenCalledWith('policy/resubscribe', null, { root: true })
        // finally{} always clears pending
        expect(commit).toHaveBeenLastCalledWith('SET_PENDING', false)
      })

      it('throws (and still clears pending) when the auth cookie is missing afterwards', async () => {
        mockCookieValue = undefined
        const mutate = jest.fn().mockResolvedValue({ data: { login: 'jwt' } })
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        await expect(
          actions.login.call(
            makeLoginThis(mutate, apolloHelpers()),
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
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        await expect(
          actions.login.call(
            makeLoginThis(mutate, apolloHelpers()),
            { commit, dispatch },
            {
              email: 'a@b.c',
              password: 'wrong',
            },
          ),
        ).rejects.toThrow('bad-credentials')
        // bailed out before persisting the session
        expect(commit).not.toHaveBeenCalledWith('SET_TOKEN', expect.anything())
        expect(dispatch).not.toHaveBeenCalledWith('fetchCurrentUser')
        expect(commit).toHaveBeenLastCalledWith('SET_PENDING', false)
      })
    })

    describe('logout', () => {
      it('resets user/token, calls onLogout and re-inits the anonymous policy', async () => {
        const commit = jest.fn()
        const dispatch = jest.fn().mockResolvedValue()
        const helpers = apolloHelpers('jwt')
        await actions.logout.call({ app: { $apolloHelpers: helpers } }, { commit, dispatch })
        expect(commit).toHaveBeenCalledWith('SET_USER', null)
        expect(commit).toHaveBeenCalledWith('SET_TOKEN', null)
        expect(helpers.onLogout).toHaveBeenCalled()
        expect(dispatch).toHaveBeenCalledWith('policy/init', null, { root: true })
        expect(dispatch).toHaveBeenCalledWith('policy/resubscribe', null, { root: true })
      })
    })
  })
})
