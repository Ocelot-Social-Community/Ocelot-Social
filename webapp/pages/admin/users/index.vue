<template>
  <div class="admin-users">
    <os-card>
      <h2 class="title">{{ $t('admin.users.name') }}</h2>
      <form @submit.prevent="onSubmit" novalidate>
        <div class="ds-flex ds-flex-gap-small">
          <div style="flex: 0 0 90%; width: 90%">
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
              <th scope="col" class="ds-table-head-col">
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
              <th scope="col" class="ds-table-head-col ds-table-head-col-right">
                {{ $t('admin.users.table.columns.role') }}
              </th>
              <th
                v-if="$policy.get('badgesEnabled')"
                scope="col"
                class="ds-table-head-col ds-table-head-col-right"
              >
                {{ $t('admin.users.table.columns.badges') }}
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
              <td class="ds-table-col">
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
              <td class="ds-table-col ds-table-col-right">
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
              <td v-if="$policy.get('badgesEnabled')" class="ds-table-col ds-table-col-right">
                <os-button
                  as="nuxt-link"
                  :to="{
                    name: 'admin-users-id',
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
            </tr>
          </tbody>
        </table>
      </div>
      <pagination-buttons :hasNext="hasNext" :hasPrevious="hasPrevious" @next="next" @back="back" />
    </os-card>
    <os-card v-else>
      <div class="ds-placeholder">{{ $t('admin.users.empty') }}</div>
    </os-card>
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters } from 'vuex'
import { isEmail } from 'validator'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'
import { adminUserQuery } from '~/graphql/User'
import { rolesQuery, setUserRoleMutation } from '~/graphql/admin/Roles'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  mixins: [formValidation],
  components: {
    OsButton,
    OsCard,
    OsIcon,
    PaginationButtons,
    OcelotInput,
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    const pageSize = 15
    // Initialize the filter from the URL here (not in created), so the first apollo
    // fetch already carries it — otherwise the list loads unfiltered and then
    // re-fetches filtered (a flash of all users). Reads ?q=<search>, or the legacy
    // ?role=<name> deep-link from the roles page "x members" link.
    //
    // NB: parse inline — `this.parseSearch` reads `allRoleNames`, a vue-apollo
    // property that is not available yet during data() initialization.
    const routeQuery = (this.$route && this.$route.query) || {}
    let query = ''
    if (routeQuery.q) query = routeQuery.q
    else if (routeQuery.role) query = `role:${routeQuery.role}`
    const tokens = query.trim().split(/\s+/).filter(Boolean)
    let roleName = null
    const terms = []
    for (const token of tokens) {
      const match = /^role:(.+)$/i.exec(token)
      if (match) roleName = match[1]
      else terms.push(token)
    }
    const term = terms.join(' ')
    const mail = term && isEmail(term) ? term : null
    return {
      offset: 0,
      pageSize,
      first: pageSize,
      User: [],
      hasNext: false,
      email: mail,
      searchText: mail ? null : term || null,
      roleFilter: roleName,
      allRoleNames: [],
      formData: {
        query,
      },
    }
  },
  computed: {
    hasPrevious() {
      return this.offset > 0
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
  apollo: {
    User: {
      query() {
        return adminUserQuery()
      },
      variables() {
        const { offset, first, email, roleFilter, searchText } = this
        const variables = { first, offset }
        // An e-mail is a precise standalone lookup; otherwise role + text combine.
        if (email) {
          variables.email = email
          return variables
        }
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
    // role, the rest is free text (or a standalone exact e-mail lookup). Both combine.
    onSubmit() {
      this.offset = 0
      this.applyQuery()
      this.syncRoute()
    },
    // Resolve the current search box into role / text / e-mail query state.
    applyQuery() {
      const { roleName, term } = this.parseSearch(this.formData.query)
      this.roleFilter = roleName
      if (term && isEmail(term)) {
        this.email = term
        this.searchText = null
      } else {
        this.email = null
        this.searchText = term || null
      }
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
    // reloads; the path stays /admin/users, keeping the menu highlight.
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
    // Set a user's single role (replaces their current one). Owner assignment is
    // enforced owner-only by the backend; a forbidden choice surfaces as a toast.
    setRole(user, event) {
      const roleName = event.target.value
      return this.$apollo
        .mutate({ mutation: setUserRoleMutation, variables: { userId: user.id, roleName } })
        .then(() => this.$apollo.queries.User.refetch())
        .then(() => this.$toast.success(this.$t('admin.users.roleChanged')))
        .catch((error) => this.$toast.error(error.message))
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
