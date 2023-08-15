<template>
  <div class="admin-users">
    <base-card>
      <h2 class="title">{{ $t('admin.users.name') }}</h2>
      <ds-form v-model="form" @submit="submit">
        <ds-flex gutter="small">
          <ds-flex-item width="90%">
            <ds-input
              model="query"
              :placeholder="$t('admin.users.form.placeholder')"
              icon="search"
            />
          </ds-flex-item>
          <ds-flex-item width="30px">
            <base-button filled circle type="submit" icon="search" :loading="$apollo.loading" />
          </ds-flex-item>
        </ds-flex>
      </ds-form>
    </base-card>
    <base-card v-if="User && User.length">
      <ds-table :data="User" :fields="fields" condensed>
        <template #index="scope">{{ scope.row.index + 1 }}.</template>
        <template #name="scope">
          <nuxt-link
            :to="{
              name: 'profile-id-slug',
              params: { id: scope.row.id, slug: scope.row.slug },
            }"
          >
            <b>{{ scope.row.name | truncate(20) }}</b>
          </nuxt-link>
        </template>
        <template #email="scope">
          <a :href="`mailto:${scope.row.email}`">
            <b>{{ scope.row.email }}</b>
          </a>
        </template>
        <template #slug="scope">
          <nuxt-link
            :to="{
              name: 'profile-id-slug',
              params: { id: scope.row.id, slug: scope.row.slug },
            }"
          >
            <b>{{ scope.row.slug | truncate(20) }}</b>
          </nuxt-link>
        </template>
        <template #createdAt="scope">
          {{ scope.row.createdAt | dateTime }}
        </template>

        <template slot="role" slot-scope="scope">
          <template v-if="userRoles">
            <select
              v-if="scope.row.id !== currentUser.id"
              :value="`${scope.row.role}`"
              v-on:change="changeUserRole(scope.row.id, $event)"
            >
              <option v-for="value in userRoles" :key="value">
                {{ value }}
              </option>
            </select>
            <ds-text v-else>{{ scope.row.role }}</ds-text>
          </template>
        </template>
      </ds-table>
      <pagination-buttons :hasNext="hasNext" :hasPrevious="hasPrevious" @next="next" @back="back" />
    </base-card>
    <base-card v-else>
      <ds-placeholder>{{ $t('admin.users.empty') }}</ds-placeholder>
    </base-card>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { isEmail } from 'validator'
import normalizeEmail from '~/components/utils/NormalizeEmail'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'
import { adminUserQuery } from '~/graphql/User'
import { FetchAllRoles, updateUserRole } from '~/graphql/admin/Roles'

export default {
  components: {
    PaginationButtons,
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
    fields() {
      return {
        index: this.$t('admin.users.table.columns.number'),
        name: this.$t('admin.users.table.columns.name'),
        email: this.$t('admin.users.table.columns.email'),
        slug: this.$t('admin.users.table.columns.slug'),
        createdAt: this.$t('admin.users.table.columns.createdAt'),
        contributionsCount: {
          label: '🖉',
          align: 'right',
        },
        commentedCount: {
          label: '🗨',
          align: 'right',
        },
        shoutedCount: {
          label: '❤',
          align: 'right',
        },
        role: {
          label: this.$t('admin.users.table.columns.role'),
          align: 'right',
        },
      }
    },
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
        this.email = normalizeEmail(query)
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
.admin-users > .base-card:first-child {
  margin-bottom: $space-small;
}
</style>
