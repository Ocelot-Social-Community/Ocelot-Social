<template>
  <filter-menu-section
    :title="$t('filter-menu.following-title')"
    :divider="false"
    class="following-filter"
  >
    <template #filter-follower>
      <div class="item item-all-follower">
        <os-button
          variant="primary"
          :appearance="
            !filteredByUsersFollowed && !filteredByPostsInMyGroups ? 'filled' : 'outline'
          "
          size="sm"
          @click="setResetFollowers"
        >
          <template #icon>
            <base-icon name="check" />
          </template>
          {{ $t('filter-menu.all') }}
        </os-button>
      </div>
      <div class="follower-filter-list">
        <li class="item follower-item">
          <os-button
            variant="primary"
            :appearance="filteredByUsersFollowed ? 'filled' : 'outline'"
            size="sm"
            :title="$t('filter-menu.following')"
            @click="toggleFilteredByFollowed(currentUser.id)"
          >
            <template #icon>
              <base-icon name="user-plus" />
            </template>
            {{ $t('filter-menu.following') }}
          </os-button>
        </li>
        <li class="item posts-in-my-groups-item">
          <os-button
            variant="primary"
            :appearance="filteredByPostsInMyGroups ? 'filled' : 'outline'"
            size="sm"
            :title="$t('contribution.filterMyGroups')"
            @click="toggleFilteredByMyGroups()"
          >
            <template #icon>
              <base-icon name="users" />
            </template>
            {{ $t('contribution.filterMyGroups') }}
          </os-button>
        </li>
      </div>
    </template>
  </filter-menu-section>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'

export default {
  name: 'FollowingFilter',
  components: {
    FilterMenuSection,
    OsButton,
  },
  computed: {
    ...mapGetters({
      filteredByUsersFollowed: 'posts/filteredByUsersFollowed',
      filteredByPostsInMyGroups: 'posts/filteredByPostsInMyGroups',
      currentUser: 'auth/user',
    }),
  },
  methods: {
    ...mapMutations({
      resetFollowers: 'posts/RESET_FOLLOWERS_FILTER',
      toggleFilteredByFollowed: 'posts/TOGGLE_FILTER_BY_FOLLOWED',
      toggleFilteredByMyGroups: 'posts/TOGGLE_FILTER_BY_MY_GROUPS',
    }),
    setResetFollowers() {
      this.resetFollowers()
      this.$emit('showFilterMenu')
    },
  },
}
</script>

<style lang="scss">
.follower-filter-list {
  display: flex;
  margin-left: $space-xx-small;

  & button {
    margin-right: $space-xx-small;
    margin-bottom: $space-xx-small;
  }
}
</style>
