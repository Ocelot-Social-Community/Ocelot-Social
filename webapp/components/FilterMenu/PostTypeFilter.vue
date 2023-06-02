<template>
  <filter-menu-section
    :title="$t('filter-menu.post-type')"
    :divider="false"
    class="following-filter"
  >
    <template #filter-follower>
      <li class="item article-item">
        <labeled-button
          icon="book"
          :label="$t('filter-menu.article')"
          :filled="articleSet"
          :title="$t('filter-menu.article')"
          @click="toggleFilterPostType('Article')"
        />
      </li>
      <li class="item event-item">
        <labeled-button
          icon="calendar"
          :label="$t('filter-menu.events')"
          :filled="eventSet"
          :title="$t('filter-menu.events')"
          @click="toggleFilterPostType('Event')"
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
  name: 'PostTypeFilter',
  components: {
    FilterMenuSection,
    LabeledButton,
  },
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
      currentUser: 'auth/user',
    }),
    articleSet() {
      return this.filteredPostTypes.includes('Article')
    },
    eventSet() {
      return this.filteredPostTypes.includes('Event')
    },
  },
  methods: {
    ...mapMutations({
      toggleFilterPostType: 'posts/TOGGLE_POST_TYPE',
    }),
  },
}
</script>
