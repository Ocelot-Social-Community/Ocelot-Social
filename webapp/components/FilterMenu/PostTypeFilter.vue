<template>
  <filter-menu-section
    :title="$t('filter-menu.post-type')"
    :divider="false"
    class="following-filter"
  >
    <template #filter-follower>
      <li class="item all-item">
        <labeled-button
          icon="check"
          :label="$t('filter-menu.all')"
          :filled="filteredPostTypes.length === 0"
          :title="$t('filter-menu.all')"
          @click="togglePostType(null)"
        />
      </li>
      <li class="item article-item">
        <labeled-button
          icon="book"
          :label="$t('filter-menu.article')"
          :filled="filteredPostTypes.includes('Article')"
          :title="$t('filter-menu.article')"
          @click="togglePostType('Article')"
        />
      </li>
      <li class="item event-item">
        <labeled-button
          icon="calendar"
          :label="$t('filter-menu.event')"
          :filled="filteredPostTypes.includes('Event')"
          :title="$t('filter-menu.event')"
          @click="togglePostType('Event')"
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
    }),
  },
  methods: {
    ...mapMutations({
      togglePostType: 'posts/TOGGLE_POST_TYPE',
    }),
  },
}
</script>
