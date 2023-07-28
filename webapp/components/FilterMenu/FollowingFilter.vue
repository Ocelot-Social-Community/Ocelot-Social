<template>
  <filter-menu-section
    :title="$t('filter-menu.following-title')"
    :divider="false"
    class="following-filter"
  >
    <template #filter-follower>
      <div class="item item-all-follower">
        <base-button
          :filled="!filteredByUsersFollowed && !filteredByPostsInMyGroups"
          :label="$t('filter-menu.all')"
          icon="check"
          @click="setResetFollowers"
          size="small"
        >
          {{ $t('filter-menu.all') }}
        </base-button>
      </div>
      <div class="follower-filter-list">
        <li class="item follower-item">
          <base-button
            icon="user-plus"
            :label="$t('filter-menu.following')"
            :filled="filteredByUsersFollowed"
            :title="$t('contribution.filterFollow')"
            @click="toggleFilteredByFollowed(currentUser.id)"
            size="small"
          >
            {{ $t('contribution.filterFollow') }}
          </base-button>
        </li>
        <li class="item posts-in-my-groups-item">
          <base-button
            icon="users"
            :label="$t('filter-menu.my-groups')"
            :filled="filteredByPostsInMyGroups"
            :title="$t('contribution.filterMyGroups')"
            @click="toggleFilteredByMyGroups()"
            size="small"
          >
            {{ $t('contribution.filterMyGroups') }}
          </base-button>
        </li>
      </div>
    </template>
  </filter-menu-section>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'

export default {
  name: 'FollowingFilter',
  components: {
    FilterMenuSection,
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

  & .base-button {
    margin-right: $space-xx-small;
    margin-bottom: $space-xx-small;
  }
}
</style>
