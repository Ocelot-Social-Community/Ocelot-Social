import { getters, actions } from './auth.js'

let state
let commit
let dispatch

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InUzIiwic2x1ZyI6Implbm55LXJvc3RvY2siLCJuYW1lIjoiSmVubnkgUm9zdG9jayIsImF2YXRhciI6Imh0dHBzOi8vczMuYW1hem9uYXdzLmNvbS91aWZhY2VzL2ZhY2VzL3R3aXR0ZXIvbXV0dV9rcmlzaC8xMjguanBnIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUub3JnIiwicm9sZSI6InVzZXIiLCJpYXQiOjE1NDUxNDQ2ODgsImV4cCI6MTYzMTU0NDY4OCwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo0MDAwIiwic3ViIjoidTMifQ.s5_JeQN9TaUPfymAXPOpbMAwhmTIg9cnOvNEcj4z75k'
const currentUser = {
  id: 'u3',
  name: 'Jenny Rostock',
  slug: 'jenny-rostock',
  email: 'user@example.org',
  avatar: {
    url: 'https://s3.amazonaws.com/uifaces/faces/twitter/mutu_krish/128.jpg',
  },
  role: 'user',
  locale: 'de',
}
const successfulLoginResponse = { data: { login: token } }
const successfulCurrentUserResponse = { data: { currentUser } }

/*
const incorrectPasswordResponse = {
  data: {
    login: null,
  },
  errors: [
    {
      message: 'Incorrect password.',
      locations: [
        {
          line: 2,
          column: 3,
        },
      ],
      path: ['login'],
    },
  ],
}
*/

beforeEach(() => {
  commit = jest.fn()
  dispatch = jest.fn(() => Promise.resolve())
})

describe('getters', () => {
  describe('isAuthenticated', () => {
    describe('given JWT Bearer token', () => {
      test('true', () => {
        state = { token }
        expect(getters.isAuthenticated(state)).toBe(true)
      })
    })
  })
})

describe('actions', () => {
  let action

  describe('init', () => {
    const theAction = () => {
      const module = {
        app: {
          $apolloHelpers: {
            getToken: () => token,
          },
        },
      }
      action = actions.init.bind(module)
      return action({ commit, dispatch })
    }

    describe('client-side', () => {
      beforeEach(() => {
        process.server = false
      })

      it('returns', async () => {
        await theAction()
        expect(dispatch.mock.calls).toEqual([])
        expect(commit.mock.calls).toEqual([])
      })
    })

    describe('server-side', () => {
      beforeEach(() => {
        process.server = true
      })

      it('fetches the current user', async () => {
        await theAction()
        expect(dispatch.mock.calls).toEqual([['fetchCurrentUser']])
      })

      it('saves the JWT Bearer token', async () => {
        await theAction()
        expect(commit.mock.calls).toEqual(expect.arrayContaining([['SET_TOKEN', token]]))
      })
    })
  })

  describe('fetchCurrentUser', () => {
    describe('given a successful response', () => {
      beforeEach(async () => {
        const module = {
          app: {
            apolloProvider: {
              defaultClient: {
                query: jest.fn(() => Promise.resolve(successfulCurrentUserResponse)),
              },
            },
          },
        }
        action = actions.fetchCurrentUser.bind(module)
        await action({ commit })
      })

      it('saves user data without token', () => {
        expect(commit.mock.calls).toEqual(
          expect.arrayContaining([
            [
              'SET_USER',
              {
                id: 'u3',
                name: 'Jenny Rostock',
                slug: 'jenny-rostock',
                email: 'user@example.org',
                avatar: {
                  url: 'https://s3.amazonaws.com/uifaces/faces/twitter/mutu_krish/128.jpg',
                },
                role: 'user',
                locale: 'de',
              },
            ],
          ]),
        )
      })
    })
  })

  describe('login', () => {
    describe('given valid credentials and a successful response', () => {
      beforeEach(async () => {
        const module = {
          app: {
            apolloProvider: {
              defaultClient: {
                mutate: jest.fn(() => Promise.resolve(successfulLoginResponse)),
              },
            },
            $apolloHelpers: {
              onLogin: jest.fn(() => Promise.resolve()),
              getToken: jest.fn(() => token),
            },
          },
        }
        action = actions.login.bind(module)
        await action({ commit, dispatch }, { email: 'user@example.org', password: '1234' })
      })

      afterEach(() => {
        action = null
      })

      it('saves the JWT Bearer token', () => {
        expect(commit.mock.calls).toEqual(expect.arrayContaining([['SET_TOKEN', token]]))
      })

      it('fetches the user, initializes categories, refetches and re-subscribes the policy + permissions', () => {
        expect(dispatch.mock.calls).toEqual([
          ['fetchCurrentUser'],
          ['categories/init', null, { root: true }],
          ['policy/init', null, { root: true }],
          ['policy/resubscribe', null, { root: true }],
          ['resubscribePermissions'],
        ])
      })

      it('saves pending flags in order', () => {
        expect(commit.mock.calls).toEqual(
          expect.arrayContaining([
            ['SET_PENDING', true],
            ['SET_PENDING', false],
          ]),
        )
      })
    })

    describe('given the auth cookie did not stick', () => {
      // The browser rejected the cookie onLogin tried to write (blocked / third-party settings), so
      // the very next read comes back empty. Reading it back through $apolloHelpers.getToken() — the
      // same helper that wrote it — is what keeps this from mistaking a NAME mismatch for a blocked
      // cookie: that is exactly what a branded `metadata.cookieName` used to do, failing every login
      // on a branded instance while the session was in fact established.
      it('rejects with no-cookie so the login form can ask the user to accept cookies', async () => {
        const module = {
          app: {
            apolloProvider: {
              defaultClient: {
                mutate: jest.fn(() => Promise.resolve(successfulLoginResponse)),
              },
            },
            $apolloHelpers: {
              onLogin: jest.fn(() => Promise.resolve()),
              getToken: jest.fn(() => undefined),
            },
          },
        }
        action = actions.login.bind(module)
        await expect(
          action({ commit, dispatch }, { email: 'user@example.org', password: '1234' }),
        ).rejects.toThrow('no-cookie')
        expect(commit.mock.calls).toEqual(
          expect.arrayContaining([
            ['SET_PENDING', true],
            ['SET_PENDING', false],
          ]),
        )
      })
    })

    describe('given invalid credentials and incorrect password response', () => {
      let onLogin
      let mutate

      beforeEach(() => {
        mutate = jest.fn(() => Promise.reject('This error is expected.')) // eslint-disable-line prefer-promise-reject-errors
        onLogin = jest.fn(() => Promise.resolve())
        const module = {
          app: {
            apolloProvider: { defaultClient: { mutate } },
            $apolloHelpers: { onLogin },
          },
        }
        action = actions.login.bind(module)
      })

      afterEach(() => {
        action = null
      })

      it('populates error messages', async () => {
        expect(
          action({ commit }, { email: 'user@example.org', password: 'wrong' }),
        ).rejects.toThrowError('This error is expected.')
        expect(mutate).toHaveBeenCalled()
        expect(onLogin).not.toHaveBeenCalled()
      })

      it('saves pending flags in order', async () => {
        try {
          await action({ commit }, { email: 'user@example.org', password: 'wrong' })
        } catch (err) {} // ignore
        expect(commit.mock.calls).toEqual(
          expect.arrayContaining([
            ['SET_PENDING', true],
            ['SET_PENDING', false],
          ]),
        )
      })
    })
  })

  describe('logout', () => {
    let onLogout

    beforeEach(async () => {
      onLogout = jest.fn(() => Promise.resolve())
      const module = { app: { $apolloHelpers: { onLogout } } }
      const action = actions.logout.bind(module)
      await action({ commit, dispatch })
    })

    it('clears the user and token', () => {
      expect(commit.mock.calls).toEqual(
        expect.arrayContaining([
          ['SET_USER', null],
          ['SET_TOKEN', null],
        ]),
      )
    })

    it('calls onLogout', () => {
      expect(onLogout).toHaveBeenCalled()
    })

    it('refetches the policy as anonymous, then re-subscribes — in that order', () => {
      // Order matters: resubscribe re-opens the websocket subscription the
      // logout restarted, and it must run after the anonymous policy/init has
      // reset the snapshot. An exact ordered match guards against a regression
      // that swaps the two.
      expect(dispatch.mock.calls).toEqual([
        ['policy/init', null, { root: true }],
        ['policy/resubscribe', null, { root: true }],
        ['resubscribePermissions'],
      ])
    })
  })
})
