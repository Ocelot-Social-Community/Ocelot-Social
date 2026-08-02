import gql from 'graphql-tag'
import { branding } from '@ocelot-social/branding'
import { currentUserQuery } from '~/graphql/User'
import PermissionsSubscription from '~/graphql/PermissionsSubscription'

// Just the viewer's effective permissions — used to refetch live (on a permissionsChanged
// event) without re-pulling the whole currentUser, and without the logout-on-error of
// fetchCurrentUser.
const myPermissionsQuery = gql`
  query {
    myPermissions {
      key
      group
    }
  }
`

const apolloClient = (ctx) => ctx.app.apolloProvider.defaultClient

// The live permissionsChanged subscription handle (one per browser tab). Module-scope
// so a forced websocket restart (login/logout) can tear it down and re-open a fresh
// one — same reasoning as the policy subscription.
let permissionsSubscription = null

const openPermissionsSubscription = (store, commit, dispatch) => {
  const observable = apolloClient(store).subscribe({ query: PermissionsSubscription() })
  permissionsSubscription = observable.subscribe({
    next() {
      // A role's permissions or some user's role assignment changed — it may affect
      // THIS viewer, so refetch their effective permissions (admin/moderation menus,
      // $can gates etc. update without a reload).
      dispatch('refreshPermissions')
    },
    error() {
      commit('SET_PERMISSIONS_SUBSCRIPTION_ACTIVE', false)
    },
  })
  commit('SET_PERMISSIONS_SUBSCRIPTION_ACTIVE', true)
}

// Permission catalog groups. The backend tags every effective permission with its
// group (myPermissions { key group }), so area gating derives from the group — a new
// admin/moderation key is picked up automatically with no list to maintain here.
const ADMINISTRATION_GROUP = 'administration'
const MODERATION_GROUP = 'moderation'

export const state = () => {
  return {
    user: null,
    token: null,
    pending: false,
    // The current user's effective permissions as { key, group } objects (from the
    // backend myPermissions query). Drives can() and group-based area gating; empty
    // while anonymous.
    permissions: [],
    permissionsSubscriptionActive: false,
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
  SET_PERMISSIONS_SUBSCRIPTION_ACTIVE(state, value) {
    state.permissionsSubscriptionActive = value
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
  // Access to the admin area: holds ANY administration-group permission. Group-driven
  // (not a key list), so a new admin permission grants the admin entry automatically.
  // Each admin page still gates on its own permission; the backend enforces actions.
  isAdmin(state) {
    return (
      Array.isArray(state.permissions) &&
      state.permissions.some((permission) => permission.group === ADMINISTRATION_GROUP)
    )
  },
  // Can moderate content (access reports/review, see disabled content). The reports
  // PAGE is specifically content.moderate — NOT any moderation-group key, so e.g. a
  // post.pin holder does not get the reports page. (Area access is canAccessModeration.)
  isModerator(state) {
    return (
      Array.isArray(state.permissions) &&
      state.permissions.some((p) => p.key === 'content.moderate')
    )
  },
  // Access to the moderation AREA: holds ANY moderation-group permission. Group-driven
  // (mirrors isAdmin), so a new moderation permission grants the area entry
  // automatically. The area is multi-page (reports = content.moderate, badges =
  // badge.manage); each page still gates on its own permission, the backend enforces
  // actions. A holder of only a content-action moderation key (post.pin/push,
  // user.delete.any) enters but sees no page entry — an accepted edge.
  canAccessModeration(state) {
    return (
      Array.isArray(state.permissions) &&
      state.permissions.some((permission) => permission.group === MODERATION_GROUP)
    )
  },
  // May open the moderation user list: holds any per-user moderation capability
  // (badge.manage OR user.disable OR user.delete.any). Drives the moderation "Users"
  // entry + the list page guard; each column/action inside gates on its own key. The
  // badge DETAIL page stays badge.manage-only (canManageBadges middleware).
  canManageUsers(state) {
    return (
      Array.isArray(state.permissions) &&
      state.permissions.some(
        (p) => p.key === 'badge.manage' || p.key === 'user.disable' || p.key === 'user.delete.any',
      )
    )
  },
  permissions(state) {
    return state.permissions
  },
  // Generic capability check — true if the current user holds the given permission
  // key. Mirrors the backend hasPermission gate; the dynamic counterpart to the
  // role-string getters above.
  can: (state) => (permission) => {
    return Array.isArray(state.permissions) && state.permissions.some((p) => p.key === permission)
  },
  user(state) {
    return state.user || {}
  },
  token(state) {
    return state.token
  },
  termsAndConditionsAgreed(state) {
    return (
      state.user &&
      state.user.termsAndConditionsAgreedVersion === branding.termsAndConditions.version
    )
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

  // Refetch only the viewer's effective permissions (live, on a permissionsChanged
  // event). Lightweight and self-contained: a transient failure keeps the current
  // permissions rather than wiping them or logging out (unlike fetchCurrentUser).
  async refreshPermissions({ commit }) {
    try {
      const {
        data: { myPermissions },
      } = await this.app.apolloProvider.defaultClient.query({
        query: myPermissionsQuery,
        fetchPolicy: 'network-only',
      })
      commit('SET_PERMISSIONS', myPermissions || [])
    } catch {
      // Keep the last-known permissions on a transient error.
    }
  },

  // Subscribe once per client to permissionsChanged; idempotent. On each event the
  // viewer's permissions are refetched so menus/$can update without a page reload.
  subscribePermissions({ commit, dispatch, state }) {
    if (state.permissionsSubscriptionActive) return
    openPermissionsSubscription(this, commit, dispatch)
  },

  // Re-open the subscription after a forced websocket restart (login / logout) — the
  // old operation's handler is dropped by restartWebsockets(), so live events stop
  // arriving until a fresh subscribe(). Mirrors policy/resubscribe.
  resubscribePermissions({ commit, dispatch }) {
    if (permissionsSubscription) {
      permissionsSubscription.unsubscribe?.()
      permissionsSubscription = null
    }
    commit('SET_PERMISSIONS_SUBSCRIPTION_ACTIVE', false)
    openPermissionsSubscription(this, commit, dispatch)
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
      // Re-open the permissionsChanged subscription on the new (authenticated) socket
      // so role/permission changes apply live without a reload.
      dispatch('resubscribePermissions')
      // Did onLogin's cookie actually stick (cookies blocked / rejected)? Asked through the SAME
      // helper that wrote it, so this can never look up a different cookie name than the one apollo
      // uses — it is the only holder of that name (see nuxt.config.js `apollo.tokenName`).
      if (!this.app.$apolloHelpers.getToken()) {
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
    dispatch('resubscribePermissions')
  },
}
