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
      <div class="role-filter">
        <label class="role-filter__label" for="users-role-filter">
          {{ $t('admin.users.table.columns.role') }}:
        </label>
        <select
          id="users-role-filter"
          class="role-filter__select"
          :value="roleFilter || ''"
          data-test="users-role-filter"
          @change="setRoleFilter($event.target.value || null)"
        >
          <option value="">{{ $t('admin.users.allRoles') }}</option>
          <option v-for="rn in allRoleNames" :key="rn" :value="rn">{{ rn }}</option>
        </select>
      </div>
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
    // Deep-link from "x members" on the roles page: /admin/users?role=<name>.
    const role = this.$route && this.$route.query && this.$route.query.role
    if (role) this.roleFilter = role
  },
  data() {
    const pageSize = 15
    return {
      offset: 0,
      pageSize,
      first: pageSize,
      User: [],
      hasNext: false,
      email: null,
      filter: null,
      roleFilter: null,
      allRoleNames: [],
      formData: {
        query: '',
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
        const { offset, first, email, filter, roleFilter } = this
        const variables = { first, offset }
        if (roleFilter) variables.roleName = roleFilter
        else if (email) variables.email = email
        else if (filter) variables.filter = filter
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
    // The role filter and the text/email search are separate modes; setting one
    // clears the other.
    setRoleFilter(roleName) {
      this.roleFilter = roleName
      this.offset = 0
      this.email = null
      this.filter = null
      this.formData.query = ''
      if (this.$router) {
        this.$router.replace({ query: roleName ? { role: roleName } : {} }).catch(() => {})
      }
    },
    onSubmit() {
      this.offset = 0
      this.roleFilter = null
      const { query } = this.formData
      if (isEmail(query)) {
        this.email = query
        this.filter = null
      } else {
        this.email = null
        this.filter = {
          OR: [{ name_contains: query }, { slug_contains: query }, { about_contains: query }],
        }
      }
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
.role-filter {
  display: flex;
  align-items: center;
  gap: $space-x-small;
  margin-top: $space-small;
  font-size: 0.9em;

  &__label {
    color: $text-color-soft;
  }
}
</style>
