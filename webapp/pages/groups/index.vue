<template>
  <div>
    <div class="ds-my-small">
      <tab-navigation :tabs="tabOptions" :activeTab="tabActive" @switch-tab="handleTab" />
    </div>
    <div class="ds-my-large"></div>
    <div class="ds-mb-large">
      <!-- create group -->
      <div class="ds-mb-large ds-space-centered">
        <os-button
          :as="canCreateAnyGroup ? 'nuxt-link' : 'button'"
          :to="{ name: 'groups-create' }"
          :class="{ 'permission-denied': !canCreateAnyGroup }"
          :aria-disabled="!canCreateAnyGroup"
          class="group-add-button"
          variant="primary"
          appearance="filled"
          circle
          size="xl"
          :aria-label="$t('group.createNewGroup.tooltip')"
          v-tooltip="{
            content: canCreateAnyGroup
              ? $t('group.createNewGroup.tooltip')
              : $t('permissions.deniedHint'),
            placement: 'left',
          }"
        >
          <template #icon>
            <os-icon :icon="icons.plus" />
          </template>
        </os-button>
      </div>
      <!-- group list -->
      <div class="ds-mb-large ds-space-centered" v-if="showPagination">
        <pagination-buttons
          :hasNext="hasNext"
          :showPageCounter="true"
          :hasPrevious="hasPrevious"
          :activePage="activePage"
          :activeResourceCount="activeTab.count"
          :key="'Top'"
          :pageSize="pageSize"
          @back="previousResults"
          @next="nextResults"
        />
      </div>
      <group-list :groups="myGroups" />
      <div class="ds-mb-large ds-space-centered" v-if="showPagination">
        <pagination-buttons
          :hasNext="hasNext"
          :showPageCounter="true"
          :hasPrevious="hasPrevious"
          :activePage="activePage"
          :activeResourceCount="activeTab.count"
          :key="'Bottom'"
          :pageSize="pageSize"
          @back="previousResults"
          @next="nextResults"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import GroupList from '~/components/Group/GroupList'
import { groupQuery, groupCountQuery } from '~/graphql/groups.js'
import TabNavigation from '~/components/_new/generic/TabNavigation/TabNavigation'
import PaginationButtons from '~/components/_new/generic/PaginationButtons/PaginationButtons'

const tabToFilterMapping = (tab) => {
  return {
    myGroups: { isMember: true },
    allGroups: {},
  }[tab]
}

export default {
  name: 'Groups',
  components: {
    OsButton,
    OsIcon,
    GroupList,
    TabNavigation,
    PaginationButtons,
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    return {
      Group: [],
      groupFilter: { isMember: true },
      tabActive: 'myGroups',
      pageSize: 6,
      activePage: 0,
      myGroupsCount: 0,
      allGroupsCount: 0,
    }
  },
  methods: {
    handleTab(tab) {
      if (this.tabActive !== tab) {
        this.tabActive = tab
        this.activePage = 0
        this.groupFilter = tabToFilterMapping(tab)
        this.$apollo.queries.Group.refetch()
      }
    },
    previousResults() {
      this.activePage--
      this.$apollo.queries.Group.refetch()
    },
    nextResults() {
      this.activePage++
      this.$apollo.queries.Group.refetch()
    },
  },
  computed: {
    // The create-group entry point is open if the user may create at least one group
    // type (flat group.create_* rights mirror the backend shield).
    canCreateAnyGroup() {
      return ['public', 'closed', 'hidden'].some((type) => this.$can(`group.create_${type}`))
    },
    activeTab() {
      return this.tabOptions.find((tab) => tab.type === this.tabActive)
    },
    showPagination() {
      return this.activeTab.count > this.pageSize
    },
    hasNext() {
      return (this.activePage + 1) * this.pageSize < this.activeTab.count
    },
    hasPrevious() {
      return this.activePage > 0
    },
    pagination() {
      return {
        first: this.pageSize,
        offset: this.activePage * this.pageSize,
      }
    },
    myGroups() {
      return this.Group ? this.Group : []
    },
    tabOptions() {
      return [
        {
          type: 'myGroups',
          title: this.$t('group.myGroups'),
          count: this.myGroupsCount,
          disabled: this.myGroupsCount === 0,
        },
        {
          type: 'allGroups',
          title: this.$t('group.allGroups'),
          count: this.allGroupsCount,
          disabled: this.allGroupsCount === 0,
        },
      ]
    },
  },
  apollo: {
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {
          ...this.groupFilter,
          ...this.pagination,
        }
      },
      error(error) {
        this.Group = []
        this.$toast.error(error.message)
      },
      fetchPolicy: 'cache-and-network',
    },
    MyGroupsCount: {
      query() {
        return groupCountQuery()
      },
      variables() {
        return {
          isMember: true,
        }
      },
      update({ GroupCount }) {
        this.myGroupsCount = GroupCount
      },
      fetchPolicy: 'cache-and-network',
    },
    AllGroupsCount: {
      query() {
        return groupCountQuery()
      },
      update({ GroupCount }) {
        this.allGroupsCount = GroupCount
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style lang="scss">
.group-add-button {
  box-shadow: $box-shadow-x-large !important;
}
</style>
