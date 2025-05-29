<template>
  <filter-menu-section class="order-by-filter" :title="sectionTitle" :divider="false">
    <template #filter-list>
      <li class="item">
        <base-button
          icon="check"
          :label="$t('filter-menu.ended.all.label')"
          :filled="!eventsEnded"
          :title="$t('filter-menu.ended.all.hint')"
          @click="toggleEventsEnded"
          data-test="all-button"
          size="small"
        >
          {{ $t('filter-menu.ended.all.label') }}
        </base-button>
      </li>
      <li class="item">
        <base-button
          icon="calendar"
          :label="$t('filter-menu.ended.onlyEnded.label')"
          :filled="eventsEnded"
          :title="$t('filter-menu.ended.onlyEnded.hint')"
          @click="toggleEventsEnded"
          data-test="not-ended-button"
          size="small"
        >
          {{ $t('filter-menu.ended.onlyEnded.label') }}
        </base-button>
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'

export default {
  name: 'EventsByFilter',
  components: {
    FilterMenuSection,
  },
  computed: {
    ...mapGetters({
      postFilter: 'posts/filter',
    }),
    sectionTitle() {
      // return $t('filter-menu.eventsEnded')
      return null
    },
    eventsEnded() {
      return !!this.postFilter.eventStart_gte
    },
  },
  methods: {
    ...mapMutations({
      toggleEventsEnded: 'posts/TOGGLE_EVENTS_ENDED',
    }),
  },
}
</script>
