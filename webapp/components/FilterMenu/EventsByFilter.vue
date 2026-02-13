<template>
  <filter-menu-section class="order-by-filter" :title="sectionTitle" :divider="false">
    <template #filter-list>
      <li class="item">
        <os-button
          variant="primary"
          :appearance="!eventsEnded ? 'filled' : 'outline'"
          size="sm"
          :title="$t('filter-menu.ended.all.hint')"
          @click="toggleEventsEnded"
          data-test="all-button"
        >
          <template #icon>
            <base-icon name="check" />
          </template>
          {{ $t('filter-menu.ended.all.label') }}
        </os-button>
      </li>
      <li class="item">
        <os-button
          variant="primary"
          :appearance="eventsEnded ? 'filled' : 'outline'"
          size="sm"
          :title="$t('filter-menu.ended.onlyEnded.hint')"
          @click="toggleEventsEnded"
          data-test="not-ended-button"
        >
          <template #icon>
            <base-icon name="calendar" />
          </template>
          {{ $t('filter-menu.ended.onlyEnded.label') }}
        </os-button>
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'

export default {
  name: 'EventsByFilter',
  components: {
    FilterMenuSection,
    OsButton,
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
