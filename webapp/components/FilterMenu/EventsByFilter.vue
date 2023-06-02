<template>
  <filter-menu-section class="order-by-filter" :title="sectionTitle" :divider="false">
    <template #filter-list>
      <li class="item">
        <labeled-button
          icon="check"
          :label="$t('filter-menu.ended.all.label')"
          :filled="!eventsEnded"
          :title="$t('filter-menu.ended.all.hint')"
          @click="toggleEventsEnded(false)"
          data-test="all-button"
        />
      </li>
      <li class="item">
        <labeled-button
          icon="calendar"
          :label="$t('filter-menu.ended.onlyEnded.label')"
          :filled="!!eventsEnded"
          :title="$t('filter-menu.ended.onlyEnded.hint')"
          @click="toggleEventsEnded(true)"
          data-test="not-ended-button"
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
  name: 'EventsByFilter',
  components: {
    FilterMenuSection,
    LabeledButton,
  },
  computed: {
    ...mapGetters({
      eventsEnded: 'posts/eventsEnded',
    }),
    sectionTitle() {
      // return $t('filter-menu.eventsEnded')
      return null
    },
  },
  methods: {
    ...mapMutations({
      toggleEventsEnded: 'posts/TOGGLE_EVENTS_ENDED',
    }),
  },
}
</script>
