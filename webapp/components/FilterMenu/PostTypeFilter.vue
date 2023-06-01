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
          :filled="noneSetInPostTypeFilter"
          :title="$t('filter-menu.all')"
          @click="toggleSetUnsetPostTypeFilter('All')"
        />
      </li>
      <li class="item article-item">
        <labeled-button
          icon="book"
          :label="$t('filter-menu.article')"
          :filled="articleSetInPostTypeFilter"
          :title="$t('filter-menu.article')"
          @click="toggleSetUnsetPostTypeFilter('Article')"
        />
      </li>
      <li class="item event-item">
        <labeled-button
          icon="calendar"
          :label="$t('filter-menu.event')"
          :filled="eventSetInPostTypeFilter"
          :title="$t('filter-menu.event')"
          @click="toggleSetUnsetPostTypeFilter('Event')"
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
}
</script>
