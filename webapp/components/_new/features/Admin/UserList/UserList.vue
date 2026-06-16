<template>
  <div class="admin-users">
    <os-card>
      <h2 class="title">{{ $t('admin.users.name') }}</h2>
      <form @submit.prevent="onSubmit" novalidate>
        <div class="ds-flex ds-flex-gap-small">
          <!-- Input grows to fill so the search button sits flush right, aligning with
               the badge edit-button column in the results table below. -->
          <div style="flex: 1 1 auto; min-width: 0">
            <ocelot-input
              model="query"
              :placeholder="$t('admin.users.form.placeholder')"
              icon="search"
            />
          </div>
          <div style="flex: 0 0 30px; width: 30px">
            <os-button
              variant="primary"
              appearance="filled"
              circle
              type="submit"
              :loading="$apollo.loading"
              :aria-label="$t('actions.search')"
            >
              <template #icon><os-icon :icon="icons.search" /></template>
            </os-button>
          </div>
        </div>
      </form>
    </os-card>
    <os-card v-if="User && User.length">
      <div class="ds-table-wrap">
        <table class="ds-table ds-table-condensed ds-table-bordered">
          <thead>
            <tr>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.users.table.columns.number') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.users.table.columns.name') }}
              </th>
              <th v-if="canSeeEmail" scope="col" class="ds-table-head-col">
                {{ $t('admin.users.table.columns.email') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.users.table.columns.slug') }}
              </th>
              <th scope="col" class="ds-table-head-col">
                {{ $t('admin.users.table.columns.createdAt') }}
              </th>
              <th
                scope="col"
                class="ds-table-head-col ds-table-head-col-right"
                :aria-label="$t('admin.users.table.columns.contributions')"
              >
                🖉
              </th>
              <th
                scope="col"
                class="ds-table-head-col ds-table-head-col-right"
                :aria-label="$t('admin.users.table.columns.comments')"
              >
                🗨
              </th>
              <th
                scope="col"
                class="ds-table-head-col ds-table-head-col-right"
                :aria-label="$t('admin.users.table.columns.shouted')"
              >
                ❤
              </th>
              <th
                v-if="canManageRoles"
                scope="col"
                class="ds-table-head-col ds-table-head-col-right"
              >
                {{ $t('admin.users.table.columns.role') }}
              </th>
              <th
                v-if="$policy.get('badgesEnabled') && canManageBadges"
                scope="col"
                class="ds-table-head-col ds-table-head-col-right"
              >
                {{ $t('admin.users.table.columns.badges') }}
              </th>
              <th
                v-if="canDeleteUsers"
                scope="col"
                class="ds-table-head-col ds-table-head-col-right"
              >
                {{ $t('admin.users.table.columns.delete') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in User" :key="user.id">
              <td class="ds-table-col">{{ user.index + 1 }}.</td>
              <td class="ds-table-col">
                <nuxt-link
                  :to="{
                    name: 'profile-id-slug',
                    params: { id: user.id, slug: user.slug },
                  }"
                >
                  <b>{{ user.name | truncate(20) }}</b>
                </nuxt-link>
              </td>
              <td v-if="canSeeEmail" class="ds-table-col">
                <a :href="`mailto:${user.email}`">
                  <b>{{ user.email }}</b>
                </a>
              </td>
              <td class="ds-table-col">
                <nuxt-link
                  :to="{
                    name: 'profile-id-slug',
                    params: { id: user.id, slug: user.slug },
                  }"
                >
                  <b>{{ user.slug | truncate(20) }}</b>
                </nuxt-link>
              </td>
              <td class="ds-table-col">
                {{ user.createdAt | dateTime }}
              </td>
              <td class="ds-table-col ds-table-col-right">{{ user.contributionsCount }}</td>
              <td class="ds-table-col ds-table-col-right">{{ user.commentedCount }}</td>
              <td class="ds-table-col ds-table-col-right">{{ user.shoutedCount }}</td>
              <td v-if="canManageRoles" class="ds-table-col ds-table-col-right">
                <select
                  v-if="canEditRole(user)"
                  class="user-role-select"
                  :value="user.roleName"
                  :data-test="`user-role-select-${user.id}`"
                  @change="setRole(user, $event)"
                >
                  <option v-for="rn in assignableRoleNames" :key="rn" :value="rn">{{ rn }}</option>
                </select>
                <span v-else class="ds-text">{{ user.roleName }}</span>
              </td>
              <td
                v-if="$policy.get('badgesEnabled') && canManageBadges"
                class="ds-table-col ds-table-col-right"
              >
                <os-button
                  as="nuxt-link"
                  :to="{
                    name: badgeRouteName,
                    params: { id: user.id },
                  }"
                  variant="primary"
                  appearance="filled"
                  circle
                  :aria-label="$t('actions.edit')"
                >
                  <template #icon><os-icon :icon="icons.pencil" /></template>
                </os-button>
              </td>
              <td v-if="canDeleteUsers" class="ds-table-col ds-table-col-right">
                <os-button
                  v-if="user.id !== currentUser.id"
                  variant="danger"
                  appearance="ghost"
                  circle
                  :data-test="`user-delete-${user.id}`"
                  :aria-label="$t('admin.users.delete.title')"
                  @click="confirmDeleteUser(user)"
                >
                  <template #icon><os-icon :icon="icons.trash" /></template>
                </os-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <pagination-buttons :hasNext="hasNext" :hasPrevious="hasPrevious" @next="next" @back="back" />
    </os-card>
    <os-card v-else>
      <div class="ds-placeholder">{{ $t('admin.users.empty') }}</div>
    </os-card>

    <confirm-modal
      v-if="showConfirmModal"
      :modalData="confirmModalData"
      @close="showConfirmModal = false"
    />
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters } from 'vuex'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'
import { adminUserQuery, deleteUserMutation } from '~/graphql/User'
import { rolesQuery, setUserRoleMutation } from '~/graphql/admin/Roles'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

// Shared user-administration list, used by both the admin area (/admin/users) and the
// moderation area (/moderation/users). The badge button links to `badgeRouteName` so
// each area routes to its own badge-detail page. Columns gate per permission:
// - email   → user.email.readAny  (field-gated server-side; query omits it without the right)
// - role    → role.manage         (field-gated; query omits roleName, rolesQuery skipped)
// A moderator typically holds neither, so they see only the badge action.
export default {
  mixins: [formValidation],
  components: {
    ConfirmModal,
    OsButton,
    OsCard,
    OsIcon,
    PaginationButtons,
    OcelotInput,
  },
  props: {
    // Route name of the badge-detail page the per-user badge button links to.
    badgeRouteName: {
      type: String,
      default: 'admin-users-id',
    },
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    const pageSize = 15
    // Initialize the filter from the URL here (not in created), so the first apollo
    // fetch already carries it — otherwise the list loads unfiltered and then
    // re-fetches filtered (a flash of all users). Reads the ?q=<search> param; the
    // roles page "x members" link points here as ?q=role:<name>.
    //
    // NB: parse inline — `this.parseSearch` reads `allRoleNames`, a vue-apollo
    // property that is not available yet during data() initialization.
    const routeQuery = (this.$route && this.$route.query) || {}
    // A repeated param (?q=a&q=b) arrives as an array; take the last value so
    // query parsing always operates on a string (and never crashes on .trim()).
    const coerceToString = (value) => (Array.isArray(value) ? value[value.length - 1] : value) || ''
    const query = routeQuery.q ? coerceToString(routeQuery.q) : ''
    const tokens = query.trim().split(/\s+/).filter(Boolean)
    let roleName = null
    const terms = []
    for (const token of tokens) {
      const match = /^role:(.+)$/i.exec(token)
      if (match) roleName = match[1]
      else terms.push(token)
    }
    const term = terms.join(' ')
    return {
      offset: 0,
      pageSize,
      first: pageSize,
      User: [],
      hasNext: false,
      searchText: term || null,
      roleFilter: roleName,
      allRoleNames: [],
      formData: {
        query,
      },
      // Confirm-modal state for the delete-user action.
      showConfirmModal: false,
      confirmModalData: null,
    }
  },
  computed: {
    hasPrevious() {
      return this.offset > 0
    },
    // The viewer may read other users' email / change roles only with the matching
    // permission; both columns AND their query fields are gated on these (see below).
    canSeeEmail() {
      return this.$can('user.email.readAny')
    },
    canManageRoles() {
      return this.$can('role.manage')
    },
    // Badge column is shown only to badge.manage holders — the list is now also
    // reachable by delete-only moderators, who must not see the badge action.
    canManageBadges() {
      return this.$can('badge.manage')
    },
    // Delete column is shown to user.delete.any holders; the per-row button is hidden
    // for one's own account (self-deletion lives in settings, and the backend blocks
    // it here anyway via the same gate).
    canDeleteUsers() {
      return this.$can('user.delete.any')
    },
    // Only an owner may grant the owner role (mirrors the backend rule).
    isOwner() {
      return !!this.currentUser && this.currentUser.roleName === 'owner'
    },
    // Role options offered in the dropdown — owner only for owners.
    assignableRoleNames() {
      return this.isOwner
        ? this.allRoleNames
        : this.allRoleNames.filter((roleName) => roleName !== 'owner')
    },
    ...mapGetters({
      currentUser: 'auth/user',
    }),
  },
  watch: {
    // A deep-linked role token (?q=role:Owner) is parsed in data() before the known
    // role names have loaded, so its casing can't be
    // resolved yet. Once allRoleNames arrives, snap roleFilter to the canonical
    // casing — the backend matches role names exactly, so without this a wrong-case
    // deep link would return nothing until the form is re-submitted.
    allRoleNames(names) {
      if (!this.roleFilter) return
      const canonical = (names || []).find((r) => r.toLowerCase() === this.roleFilter.toLowerCase())
      if (canonical && canonical !== this.roleFilter) this.roleFilter = canonical
    },
  },
  apollo: {
    User: {
      query() {
        // Omit email/roleName the viewer can't read — a denied field would abort the
        // whole response (apollo default errorPolicy), breaking the list.
        return adminUserQuery({ withEmail: this.canSeeEmail, withRole: this.canManageRoles })
      },
      variables() {
        const { offset, first, roleFilter, searchText } = this
        const variables = { first, offset }
        // Role + free text combine; the free text is a substring match across
        // name/slug/about/email (partial e-mail included) — no exact-e-mail case.
        if (roleFilter) variables.roleName = roleFilter
        if (searchText) variables.search = searchText
        return variables
      },
      update({ User }) {
        if (!User) return []
        this.hasNext = User.length >= this.pageSize
        if (User.length <= 0 && this.offset > 0) return this.User // edge case, avoid a blank page
        return User.map((u, i) => Object.assign({}, u, { index: this.offset + i }))
      },
    },
    allRoleNames: {
      query: rolesQuery,
      // The roles query itself is role.manage-gated; skip it for viewers without the
      // right (the role column is hidden for them anyway).
      skip() {
        return !this.canManageRoles
      },
      update({ roles }) {
        return (roles || []).map((role) => role.name)
      },
    },
  },
  methods: {
    back() {
      this.offset = Math.max(this.offset - this.pageSize, 0)
    },
    next() {
      this.offset += this.pageSize
    },
    // The search box is the single source of truth: a `role:<name>` token filters by
    // role, the rest is free text (substring match, partial e-mail included). Both combine.
    onSubmit() {
      this.offset = 0
      this.applyQuery()
      this.syncRoute()
    },
    // Resolve the current search box into role / free-text query state.
    applyQuery() {
      const { roleName, term } = this.parseSearch(this.formData.query)
      this.roleFilter = roleName
      this.searchText = term || null
    },
    // Split the query into an optional `role:<name>` token (resolved against the known
    // role names, case-insensitively) and the remaining free-text term.
    parseSearch(raw) {
      const tokens = (raw || '').trim().split(/\s+/).filter(Boolean)
      let roleName = null
      const terms = []
      for (const token of tokens) {
        const match = /^role:(.+)$/i.exec(token)
        if (match) {
          const known = (this.allRoleNames || []).find(
            (r) => r.toLowerCase() === match[1].toLowerCase(),
          )
          roleName = known || match[1]
        } else {
          terms.push(token)
        }
      }
      return { roleName, term: terms.join(' ') }
    },
    // Persist the search string to the URL (?q=…) so it is shareable and survives
    // reloads; the path stays on the list route, keeping the menu highlight.
    syncRoute() {
      if (!this.$router) return
      const query = { ...this.$route.query }
      const q = (this.formData.query || '').trim()
      if (q) query.q = q
      else delete query.q
      this.$router.replace({ query }).catch(() => {})
    },
    // Whether the current user may change this user's role: not your own role, and
    // only an owner may change an owner (mirrors the backend rule).
    canEditRole(user) {
      if (!this.currentUser || user.id === this.currentUser.id) return false
      if (user.roleName === 'owner' && !this.isOwner) return false
      return true
    },
    // Open a confirmation dialog before deleting a user (reuses the shared ConfirmModal,
    // whose confirm button runs the callback). Danger-styled.
    confirmDeleteUser(user) {
      this.confirmModalData = {
        titleIdent: 'admin.users.delete.title',
        messageIdent: 'admin.users.delete.message',
        messageParams: { name: user.name },
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.trash,
            textIdent: 'admin.users.delete.submit',
            callback: () => this.deleteUser(user),
          },
          cancel: {
            icon: this.icons.close,
            textIdent: 'actions.cancel',
            callback: () => {},
          },
        },
      }
      this.showConfirmModal = true
    },
    // Delete the account only (empty `resource` — keeps the user's posts/comments).
    async deleteUser(user) {
      try {
        await this.$apollo.mutate({
          mutation: deleteUserMutation(),
          variables: { id: user.id, resource: [] },
        })
        await this.$apollo.queries.User.refetch()
        this.$toast.success(this.$t('admin.users.delete.success'))
      } catch (error) {
        this.$toast.error(this.$t('admin.users.delete.error', { message: error.message }))
        throw error
      }
    },
    // Set a user's single role (replaces their current one). Owner assignment is
    // enforced owner-only by the backend; a forbidden choice surfaces as a toast.
    setRole(user, event) {
      const roleName = event.target.value
      return this.$apollo
        .mutate({ mutation: setUserRoleMutation, variables: { userId: user.id, roleName } })
        .then(() => this.$apollo.queries.User.refetch())
        .then(() => this.$toast.success(this.$t('admin.users.roleChanged')))
        .catch((error) => {
          // The select is one-way bound to user.roleName; a failed mutation leaves the
          // DOM showing the rejected choice. Reset it to the real role so the UI stays
          // truthful even when no refetch runs (e.g. a network error).
          event.target.value = user.roleName
          this.$toast.error(error.message)
        })
    },
  },
}
</script>

<style lang="scss">
.admin-users > .os-card:first-child {
  margin-bottom: $space-small;
}
.user-role-select {
  font-size: 0.85em;
}
</style>
