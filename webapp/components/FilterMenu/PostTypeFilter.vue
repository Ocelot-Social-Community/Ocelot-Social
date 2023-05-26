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
          @click="setPostTypeFilter('Article')"
        />
      </li>
      <li class="item event-item">
        <labeled-button
          icon="calendar"
          :label="$t('filter-menu.event')"
          :filled="eventSet"
          :title="$t('filter-menu.event')"
          @click="setPostTypeFilter('Event')"
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
  data() {
    return {
      postTypes: ['Article', 'Event'],
    }
  },
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
      currentUser: 'auth/user',
    }),
    noneSet() {
      return !this.articleSet && !this.eventSet
    },
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
    setPostTypeFilter(setPostType) {
      if (this.noneSet) {
        if (setPostType !== 'All') this.toggleFilterPostType(setPostType)
      } else {
        if (setPostType !== 'All') {
          // if not set then set and unset all others
          if (!this.filteredPostTypes.includes(setPostType)) {
            this.toggleFilterPostType(setPostType)
            this.postTypes.forEach((postType) => {
              if (postType !== setPostType)
                if (this.filteredPostTypes.includes(postType)) this.toggleFilterPostType(postType)
            })
          }
        } else {
          // unset all
          this.postTypes.forEach((postType) => {
            if (this.filteredPostTypes.includes(postType)) this.toggleFilterPostType(postType)
          })
        }
      }
    },
  },
}
</script>
