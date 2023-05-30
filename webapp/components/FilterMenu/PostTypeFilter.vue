<template>
  <filter-menu-section
    :title="$t('filter-menu.post-type')"
    :divider="false"
    class="following-filter"
  >
    <template #filter-follower>
      <li class="item article-item">
        <labeled-button
          icon="check"
          :label="$t('filter-menu.all')"
          :filled="noneSetInPostTypeFilter"
          :title="$t('filter-menu.all')"
          @click="setUnsetPostTypeFilter('All')"
        />
      </li>
      <li class="item article-item">
        <labeled-button
          icon="book"
          :label="$t('filter-menu.article')"
          :filled="articleSetInPostTypeFilter"
          :title="$t('filter-menu.article')"
          @click="setUnsetPostTypeFilter('Article')"
        />
      </li>
      <li class="item event-item">
        <labeled-button
          icon="calendar"
          :label="$t('filter-menu.event')"
          :filled="eventSetInPostTypeFilter"
          :title="$t('filter-menu.event')"
          @click="setUnsetPostTypeFilter('Event')"
        />
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import FilterMenuMixin from '~/mixins/filterMenuMixin.js'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import LabeledButton from '~/components/_new/generic/LabeledButton/LabeledButton'

export default {
  name: 'PostTypeFilter',
  components: {
    FilterMenuSection,
    LabeledButton,
  },
  mixins: [FilterMenuMixin],
  data() {
    return {
      filterPostTypes: ['Article', 'Event'],
    }
  },
  methods: {
    unsetAllPostTypeFilters() {
      this.filterPostTypes.forEach((postType) => {
        if (this.filteredPostTypes.includes(postType)) this.toggleFilterPostType(postType)
      })
    },
    setUnsetPostTypeFilter(setPostType) {
      if (this.noneSetInPostTypeFilter) {
        if (setPostType !== 'All') this.toggleFilterPostType(setPostType)
      } else {
        if (setPostType !== 'All') {
          if (this.filteredPostTypes.includes(setPostType)) {
            this.unsetAllPostTypeFilters()
          } else {
            // if 'setPostType' is not set then set it and unset all others
            this.toggleFilterPostType(setPostType)
            this.filterPostTypes.forEach((postType) => {
              if (postType !== setPostType)
                if (this.filteredPostTypes.includes(postType)) this.toggleFilterPostType(postType)
            })
          }
        } else {
          this.unsetAllPostTypeFilters()
        }
      }
    },
  },
}
</script>
