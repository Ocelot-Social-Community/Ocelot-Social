<template>
  <div class="admin-users">
    <os-card>
      <h2 class="title">{{ $t('admin.users.name') }}</h2>
      <ds-form v-model="form" @submit="submit">
        <div class="ds-flex ds-flex-gap-small">
          <div style="flex: 0 0 90%; width: 90%">
            <ds-input
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
      </ds-form>
    </os-card>
    <os-card v-if="User && User.length">
      <div class="ds-table-wrap">
        <table class="ds-table ds-table-condensed ds-table-bordered">
          <thead>
            <tr>
              <th class="ds-table-head-col">{{ $t('admin.users.table.columns.number') }}</th>
              <th class="ds-table-head-col">{{ $t('admin.users.table.columns.name') }}</th>
              <th class="ds-table-head-col">{{ $t('admin.users.table.columns.email') }}</th>
              <th class="ds-table-head-col">{{ $t('admin.users.table.columns.slug') }}</th>
              <th class="ds-table-head-col">{{ $t('admin.users.table.columns.createdAt') }}</th>
              <th class="ds-table-head-col ds-table-head-col-right" :aria-label="$t('admin.users.table.columns.contributions')">🖉</th>
              <th class="ds-table-head-col ds-table-head-col-right" :aria-label="$t('admin.users.table.columns.comments')">🗨</th>
              <th class="ds-table-head-col ds-table-head-col-right" :aria-label="$t('admin.users.table.columns.shouted')">❤</th>
              <th class="ds-table-head-col ds-table-head-col-right">
                {{ $t('admin.users.table.columns.role') }}
              </th>
              <th v-if="$env.BADGES_ENABLED" class="ds-table-head-col ds-table-head-col-right">
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
                <template v-if="userRoles">
                  <select
                    v-if="user.id !== currentUser.id"
                    :value="`${user.role}`"
                    v-on:change="changeUserRole(user.id, $event)"
                  >
                    <option v-for="value in userRoles" :key="value">
                      {{ value }}
                    </option>
                  </select>
                  <p class="ds-text" v-else>{{ user.role }}</p>
                </template>
              </td>
              <td v-if="$env.BADGES_ENABLED" class="ds-table-col ds-table-col-right">
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
import { FetchAllRoles, updateUserRole } from '~/graphql/admin/Roles'

export default {
  components: {
    OsButton,
    OsCard,
    OsIcon,
    PaginationButtons,
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
      userRoles: [],
      form: {
        formData: {
          query: '',
        },
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
    userRoles: {
      query() {
        return FetchAllRoles()
      },
      update({ availableRoles }) {
        return availableRoles
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
    submit(formData) {
      this.offset = 0
      const { query } = formData
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
    changeUserRole(id, event) {
      const newRole = event.target.value
      this.$apollo
        .mutate({
          mutation: updateUserRole(),
          variables: { role: newRole, id },
        })
        .then(({ data }) => {
          this.$toast.success(this.$t('admin.users.roleChanged'))
        })
        .catch((error) => {
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

</style>
