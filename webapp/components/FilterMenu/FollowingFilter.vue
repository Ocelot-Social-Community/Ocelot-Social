<template>
  <filter-menu-section :divider="false" class="following-filter">
    <template #filter-follower>
      <li class="item follower-item">
        <labeled-button
          icon="user-plus"
          :label="$t('filter-menu.following')"
          :filled="filteredByUsersFollowed"
          :title="$t('contribution.filterFollow')"
          @click="toggleFilteredByFollowed(currentUser.id)"
        />
      </li>
      <li class="item posts-in-my-groups-item">
        <labeled-button
          icon="users"
          :label="$t('filter-menu.my-groups')"
          :filled="filteredByPostsInMyGroups"
          :title="$t('contribution.filterMyGroups')"
          @click="toggleFilteredByMyGroups(currentUser.id)"
        />
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import LabeledButton from '~/components/_new/generic/LabeledButton/LabeledButton'

export default {
  name: 'FollowingFilter',
  components: {
    FilterMenuSection,
    LabeledButton,
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
      toggleFilteredByFollowed: 'posts/TOGGLE_FILTER_BY_FOLLOWED',
      toggleFilteredByMyGroups: 'posts/TOGGLE_FILTER_BY_MY_GROUPS',
    }),
  },
}
</script>
