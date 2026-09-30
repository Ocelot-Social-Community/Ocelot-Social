<template>
  <os-card>
    <h2 class="title">{{ $t('admin.groups.title') }}</h2>
    <p class="description">{{ $t('admin.groups.description') }}</p>

    <form class="filters" @submit.prevent="reload">
      <input
        v-model="groupFilter.search"
        type="search"
        :placeholder="$t('admin.groups.searchPlaceholder')"
        data-test="search"
        @input="debouncedReload"
      />
      <select v-model="groupFilter.groupType" data-test="filter-type" @change="reload">
        <option :value="null">{{ $t('admin.groups.allTypes') }}</option>
        <option v-for="type in groupTypes" :key="type" :value="type">
          {{ $t(`group.types.${type}`) }}
        </option>
      </select>
      <label class="checkbox">
        <input
          v-model="groupFilter.ownerless"
          type="checkbox"
          data-test="filter-ownerless"
          @change="reload"
        />
        {{ $t('admin.groups.ownerlessOnly') }}
      </label>
      <label class="checkbox">
        <input
          v-model="groupFilter.disabled"
          type="checkbox"
          data-test="filter-disabled"
          @change="reload"
        />
        {{ $t('admin.groups.disabledOnly') }}
      </label>
    </form>

    <p v-if="!groups.length" class="empty" data-test="empty">{{ $t('admin.groups.empty') }}</p>

    <table v-else class="ds-table" data-test="group-table">
      <thead>
        <tr>
          <th>{{ $t('admin.groups.columns.name') }}</th>
          <th>{{ $t('admin.groups.columns.type') }}</th>
          <th>{{ $t('admin.groups.columns.members') }}</th>
          <th>{{ $t('admin.groups.columns.owners') }}</th>
          <th>{{ $t('admin.groups.columns.state') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="group in groups" :key="group.id" :data-test="`group-${group.id}`">
          <td>
            <nuxt-link :to="{ name: 'groups-id-slug', params: { id: group.id, slug: group.slug } }">
              {{ group.name }}
            </nuxt-link>
            <span class="slug">@{{ group.slug }}</span>
          </td>
          <td>{{ $t(`group.types.${group.groupType}`) }}</td>
          <td>{{ group.membersCount === null ? '–' : group.membersCount }}</td>
          <td>
            <!-- Zero owners is legal and is exactly what an admin is here to fix: the member
                 list is where a new owner is appointed. -->
            <nuxt-link
              v-if="group.ownerCount === 0"
              class="ownerless"
              :to="`/groups/edit/${group.id}/members`"
              :data-test="`appoint-owner-${group.id}`"
            >
              {{ $t('admin.groups.noOwner') }}
            </nuxt-link>
            <template v-else>{{ group.ownerCount === null ? '–' : group.ownerCount }}</template>
          </td>
          <td>
            <span v-if="group.disabled">{{ $t('admin.groups.disabled') }}</span>
            <span v-else>{{ $t('admin.groups.active') }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="total > groups.length" class="pager">
      <os-button :disabled="offset === 0" data-test="prev" @click="page(-1)">
        {{ $t('admin.groups.previous') }}
      </os-button>
      <span>{{ $t('admin.groups.count', { shown: groups.length, total }) }}</span>
      <os-button :disabled="offset + pageSize >= total" data-test="next" @click="page(1)">
        {{ $t('admin.groups.next') }}
      </os-button>
    </div>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'

import { adminGroupsQuery } from '~/graphql/adminGroups.js'

const PAGE_SIZE = 25
const GROUP_TYPES = ['public', 'closed', 'hidden']

export default {
  components: { OsButton, OsCard },
  data() {
    return {
      groups: [],
      total: 0,
      offset: 0,
      pageSize: PAGE_SIZE,
      // Named groupFilter, not filter: the schema contract test reads every `filter: {`
      // in the webapp as a post filter, and this one is about groups.
      groupFilter: { search: '', groupType: null, ownerless: false, disabled: false },
    }
  },
  computed: {
    groupTypes() {
      return GROUP_TYPES
    },
    variables() {
      return {
        search: this.groupFilter.search || null,
        groupType: this.groupFilter.groupType,
        // Only send the flags when they are on: `false` would mean "only groups that are NOT
        // disabled", which is a different question from "all of them".
        ownerless: this.groupFilter.ownerless ? true : null,
        disabled: this.groupFilter.disabled ? true : null,
        first: this.pageSize,
        offset: this.offset,
      }
    },
  },
  methods: {
    debouncedReload() {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => this.reload(), 300)
    },
    reload() {
      this.offset = 0
      return this.$apollo.queries.adminGroups.refetch(this.variables)
    },
    page(direction) {
      this.offset = Math.max(0, this.offset + direction * this.pageSize)
      return this.$apollo.queries.adminGroups.refetch(this.variables)
    },
  },
  apollo: {
    adminGroups: {
      query() {
        return adminGroupsQuery()
      },
      variables() {
        return this.variables
      },
      manual: true,
      result({ data, loading }) {
        if (loading || !data) return
        this.groups = data.adminGroups ?? []
        this.total = data.adminGroupCount ?? 0
      },
      error(error) {
        this.$toast.error(error.message)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style scoped>
.title {
  margin-bottom: 0;
}
.description {
  color: var(--text-color-soft);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-small);
  align-items: center;
  margin-bottom: var(--space-base);
}
.checkbox {
  display: flex;
  gap: var(--space-xx-small);
  align-items: center;
}
.slug {
  color: var(--text-color-soft);
  margin-left: var(--space-xx-small);
}
.ownerless {
  color: var(--text-color-danger);
  font-weight: bold;
}
.empty {
  color: var(--text-color-soft);
}
.pager {
  display: flex;
  gap: var(--space-small);
  align-items: center;
  margin-top: var(--space-base);
}
</style>
