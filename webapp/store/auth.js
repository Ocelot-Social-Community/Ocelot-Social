import gql from 'graphql-tag'
import { VERSION } from '~/constants/terms-and-conditions-version.js'
import { currentUserQuery } from '~/graphql/User'
import Cookie from 'universal-cookie'
import metadata from '~/constants/metadata'

const cookies = new Cookie()

// Permissions that grant access to (some part of) the admin area. A user holding any
// of them sees the admin entry and may enter; each admin page still gates on its own
// permission, and the backend enforces every action.
const ADMIN_AREA_PERMISSIONS = [
  'network.statistics.read',
  'role.manage',
  'policy.manage',
  'donation.manage',
  'apiKey.administer',
  'user.email.readAny',
]

export const state = () => {
  return {
    user: null,
    token: null,
    pending: false,
    // The current user's effective permission keys (from the backend myPermissions
    // query). Drives can(); empty while anonymous.
    permissions: [],
  }
}

export const mutations = {
  SET_USER(state, user) {
    state.user = user || null
  },
  SET_USER_PARTIAL(state, user) {
    state.user = { ...state.user, ...user }
  },
  SET_TOKEN(state, token) {
    state.token = token || null
  },
  SET_PENDING(state, pending) {
    state.pending = pending
  },
  SET_PERMISSIONS(state, permissions) {
    state.permissions = Array.isArray(permissions) ? permissions : []
  },
}

export const getters = {
  isAuthenticated(state) {
    return !!state.token
  },
  isLoggedIn(state) {
    return !!(state.user && state.token)
  },
  pending(state) {
    return !!state.pending
  },
  // Access to the admin area: holds any administration-area permission. Replaces the
  // former role==='admin' tier check so custom roles with admin capabilities qualify.
  isAdmin(state) {
    return (
      Array.isArray(state.permissions) &&
      ADMIN_AREA_PERMISSIONS.some((permission) => state.permissions.includes(permission))
    )
  },
  // Can moderate content (access reports/review, see disabled content). Replaces the
  // former admin/moderator tier check.
  isModerator(state) {
    return Array.isArray(state.permissions) && state.permissions.includes('content.moderate')
  },
  permissions(state) {
    return state.permissions
  },
  // Generic capability check — true if the current user holds the given permission
  // key. Mirrors the backend hasPermission gate; the dynamic counterpart to the
  // role-string getters above.
  can: (state) => (permission) => {
    return Array.isArray(state.permissions) && state.permissions.includes(permission)
  },
  user(state) {
    return state.user || {}
  },
  token(state) {
    return state.token
  },
  termsAndConditionsAgreed(state) {
    return state.user && state.user.termsAndConditionsAgreedVersion === VERSION
  },
}

export const actions = {
  async init({ commit, dispatch }) {
    if (!process.server) {
      return
    }
    const token = this.app.$apolloHelpers.getToken()
    if (!token) {
      return
    }
    commit('SET_TOKEN', token)
    await dispatch('fetchCurrentUser')
  },

  async check({ commit, dispatch, getters }) {
    if (!this.app.$apolloHelpers.getToken()) {
      await dispatch('logout')
    }
    return getters.isLoggedIn
  },

  async fetchCurrentUser({ commit, dispatch }) {
    const client = this.app.apolloProvider.defaultClient
    try {
      const {
        data: { currentUser, myPermissions },
      } = await client.query({ query: currentUserQuery })
      if (!currentUser) return dispatch('logout')
      commit('SET_USER', currentUser)
      commit('SET_PERMISSIONS', myPermissions || [])
      return currentUser
    } catch {
      return dispatch('logout')
    }
  },

  async login({ commit, dispatch }, { email, password }) {
    commit('SET_PENDING', true)
    try {
      const client = this.app.apolloProvider.defaultClient
      const {
        data: { login },
      } = await client.mutate({
        mutation: gql(`
            mutation($email: String!, $password: String!) {
              login(email: $email, password: $password)
            }
          `),
        variables: {
          email,
          password,
        },
      })
      await this.app.$apolloHelpers.onLogin(login)
      commit('SET_TOKEN', login)
      await dispatch('fetchCurrentUser')
      await dispatch('categories/init', null, { root: true })
      // Refetch the policy now that we're authenticated: the same query now
      // returns the viewer-scoped keys (e.g. apiKeysEnabled) that were null
      // while anonymous — no full page reload needed.
      await dispatch('policy/init', null, { root: true })
      // onLogin() restarted the websocket (restartWebsockets), which drops the
      // policyChanged subscription's handler. Re-open it so live updates keep
      // arriving without a full page reload.
      await dispatch('policy/resubscribe', null, { root: true })
      if (cookies.get(metadata.COOKIE_NAME) === undefined) {
        throw new Error('no-cookie')
      }
    } catch (err) {
      throw new Error(err)
    } finally {
      commit('SET_PENDING', false)
    }
  },

  async logout({ commit, dispatch }) {
    commit('SET_USER', null)
    commit('SET_TOKEN', null)
    commit('SET_PERMISSIONS', [])
    await this.app.$apolloHelpers.onLogout()
    // Refetch as anonymous so authenticated-only keys (e.g. apiKeysEnabled)
    // reset to their defaults instead of lingering from the logged-in session.
    await dispatch('policy/init', null, { root: true })
    // onLogout() restarted the websocket too; re-open the subscription on the
    // now-anonymous connection so public-key changes still arrive live.
    await dispatch('policy/resubscribe', null, { root: true })
  },
}
