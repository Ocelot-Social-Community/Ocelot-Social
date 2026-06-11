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
                <div class="user-roles">
                  <span
                    v-for="rn in user.roleNames"
                    :key="rn"
                    class="user-roles__chip"
                    :data-test="`user-role-${user.id}-${rn}`"
                  >
                    {{ rn }}
                    <button
                      v-if="user.id !== currentUser.id && rn !== 'owner'"
                      type="button"
                      class="user-roles__remove"
                      :aria-label="$t('admin.users.removeRole', { role: rn })"
                      @click="unassign(user, rn)"
                    >
                      ×
                    </button>
                  </span>
                  <select
                    v-if="user.id !== currentUser.id && assignableRoles(user).length"
                    class="user-roles__add"
                    :data-test="`user-role-add-${user.id}`"
                    @change="assign(user, $event)"
                  >
                    <option value="" selected disabled>{{ $t('admin.users.addRole') }}</option>
                    <option v-for="rn in assignableRoles(user)" :key="rn" :value="rn">
                      {{ rn }}
                    </option>
                  </select>
                </div>
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
import { rolesQuery, assignRoleMutation, unassignRoleMutation } from '~/graphql/admin/Roles'
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
    return {
      offset: 0,
      pageSize,
      first: pageSize,
      User: [],
      hasNext: false,
      email: null,
      filter: null,
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
        const { offset, first, email, filter } = this
        const variables = { first, offset }
        if (email) variables.email = email
        if (filter) variables.filter = filter
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
    onSubmit() {
      this.offset = 0
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
    // Roles a user does not yet hold and that may be assigned in bulk here.
    // `owner` (sensitive, owner-only transfer) and the implicit `user` baseline
    // are deliberately excluded.
    assignableRoles(user) {
      const held = new Set(user.roleNames || [])
      return this.allRoleNames.filter((rn) => rn !== 'owner' && rn !== 'user' && !held.has(rn))
    },
    assign(user, event) {
      const roleName = event.target.value
      event.target.value = '' // reset the select back to the placeholder
      if (!roleName) return undefined
      return this.mutateRole(assignRoleMutation, { userId: user.id, roleName })
    },
    unassign(user, roleName) {
      return this.mutateRole(unassignRoleMutation, { userId: user.id, roleName })
    },
    mutateRole(mutation, variables) {
      return this.$apollo
        .mutate({ mutation, variables })
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
.user-roles {
  display: flex;
  flex-wrap: wrap;
  gap: $space-xx-small;
  justify-content: flex-end;
  align-items: center;

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2em;
    padding: 0.05em 0.4em;
    border-radius: $border-radius-base;
    background: $background-color-softer;
    font-size: 0.85em;
    white-space: nowrap;
  }
  &__remove {
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    color: $text-color-soft;
  }
  &__add {
    font-size: 0.85em;
  }
}
</style>
