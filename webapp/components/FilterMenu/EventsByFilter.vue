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
            <os-icon :icon="icons.check" />
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
            <os-icon :icon="icons.calendar" />
          </template>
          {{ $t('filter-menu.ended.onlyEnded.label') }}
        </os-button>
      </li>
    </template>
  </filter-menu-section>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters, mapMutations } from 'vuex'
import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'

export default {
  name: 'EventsByFilter',
  components: {
    FilterMenuSection,
    OsButton,
    OsIcon,
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
  created() {
    this.icons = iconRegistry
  },
  methods: {
    ...mapMutations({
      toggleEventsEnded: 'posts/TOGGLE_EVENTS_ENDED',
    }),
  },
}
</script>
