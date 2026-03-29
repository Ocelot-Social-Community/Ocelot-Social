<template>
  <filter-menu-section
    :title="$t('filter-menu.post-type')"
    :divider="false"
    class="post-type-filter"
  >
    <template #filter-follower>
      <li class="item all-item">
        <ocelot-labeled-button
          :icon="icons.check"
          :label="$t('filter-menu.all')"
          :filled="filteredPostTypes.length === 0"
          :title="$t('filter-menu.all')"
          @click="togglePostType(null)"
        >
          {{ $t('filter-menu.all') }}
        </ocelot-labeled-button>
      </li>
      <li class="item article-item">
        <ocelot-labeled-button
          :icon="icons.book"
          :label="$t('filter-menu.article')"
          :filled="filteredPostTypes.includes('Article')"
          :title="$t('filter-menu.article')"
          @click="togglePostType('Article')"
        />
      </li>
      <li class="item event-item">
        <ocelot-labeled-button
          :icon="icons.calendar"
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
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
import { OcelotLabeledButton } from '@ocelot-social/ui'

export default {
  name: 'PostTypeFilter',
  components: {
    FilterMenuSection,
    OcelotLabeledButton,
  },
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
    }),
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    ...mapMutations({
      togglePostType: 'posts/TOGGLE_POST_TYPE',
    }),
  },
}
</script>

<style lang="scss">
.post-type-filter {
  & .item {
    min-width: 80px;

    &:first-child {
      margin-left: calc(-1 * (80px - 36px) / 2);
    }
  }
}
</style>
