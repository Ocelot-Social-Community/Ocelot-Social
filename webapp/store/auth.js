import gql from 'graphql-tag'
import { VERSION } from '~/constants/terms-and-conditions-version.js'
import { currentUserQuery } from '~/graphql/User'
import Cookie from 'universal-cookie'
import metadata from '~/constants/metadata'

const cookies = new Cookie()

export const state = () => {
  return {
    user: null,
    token: null,
    pending: false,
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
  isAdmin(state) {
    return !!state.user && state.user.role === 'admin'
  },
  isModerator(state) {
    return !!state.user && (state.user.role === 'admin' || state.user.role === 'moderator')
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
        data: { currentUser },
      } = await client.query({ query: currentUserQuery })
      if (!currentUser) return dispatch('logout')
      commit('SET_USER', currentUser)
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
    await this.app.$apolloHelpers.onLogout()
    // Refetch as anonymous so authenticated-only keys (e.g. apiKeysEnabled)
    // reset to their defaults instead of lingering from the logged-in session.
    await dispatch('policy/init', null, { root: true })
    // onLogout() restarted the websocket too; re-open the subscription on the
    // now-anonymous connection so public-key changes still arrive live.
    await dispatch('policy/resubscribe', null, { root: true })
  },
}
