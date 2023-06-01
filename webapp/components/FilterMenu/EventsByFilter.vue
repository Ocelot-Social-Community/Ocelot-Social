<template>
  <filter-menu-section class="order-by-filter" :title="sectionTitle" :divider="false">
    <template #filter-list>
      <li class="item">
        <labeled-button
          icon="check"
          :label="$t('filter-menu.ended.all.label')"
          :filled="eventsEnded === ''"
          :title="$t('filter-menu.ended.all.hint')"
          @click="toggleEventsEnded('')"
          data-test="all-button"
        />
      </li>
      <li class="item">
        <labeled-button
          icon="calendar"
          :label="$t('filter-menu.ended.onlyEnded.label')"
          :filled="eventsEnded === 'eventStart_gte'"
          :title="$t('filter-menu.ended.onlyEnded.hint')"
          @click="toggleEventsEnded('eventStart_gte')"
          data-test="not-ended-button"
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
  name: 'EventsByFilter',
  components: {
    FilterMenuSection,
    LabeledButton,
  },
  mixins: [FilterMenuMixin],
  computed: {
    sectionTitle() {
      // return $t('filter-menu.eventsEnded')
      return null
    },
  },
}
</script>
