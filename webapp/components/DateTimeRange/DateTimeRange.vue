<template>
  <div
    class="ds-text ds-text-left ds-text-soft date-time-range"
    :class="size && 'ds-text-size-' + size"
  >
    <div class="date-time-row">
      <div>
        <os-icon :icon="icons.calendar" data-test="calendar" />
        {{ getStartDateString }}
      </div>
      <div>
        <os-icon :icon="icons.clock" data-test="clock" />
        {{ endDateAsDate && isSameDayLocal ? getTimeRangeString : getStartTimeString }}
      </div>
    </div>
    <!-- Whether start and end fall on the same day depends on the time zone, which differs between
         server and browser. v-show keeps the markup the same on both, so hydration matches. -->
    <os-icon v-show="!isSameDayLocal" :icon="icons.arrowDown" />
    <div v-show="!isSameDayLocal" class="ds-flex date-time-row">
      <div>
        <os-icon :icon="icons.calendar" data-test="calendar" />
        {{ getEndDateString }}
      </div>
      <div>
        <os-icon :icon="icons.clock" data-test="clock" />
        {{ getEndTimeString }}
      </div>
    </div>
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { getLocaleIso } from '~/locales'
import { format, formatRange, isSameDay } from '~/utils/dateFormat'

export default {
  name: 'DateTimeRange',
  components: { OsIcon },
  props: {
    /**
     * The size used for the text.
     * @options small|base|large|x-large|xx-large|xxx-large
     */
    size: {
      type: String,
      default: null,
      validator: (value) => {
        return value.match(/(small|base|large|x-large|xx-large|xxx-large)/)
      },
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      default: null,
    },
  },
  computed: {
    startDateAsDate() {
      return new Date(this.startDate)
    },
    endDateAsDate() {
      return this.endDate ? new Date(this.endDate) : null
    },
    isSameDayLocal() {
      return !this.endDateAsDate || isSameDay(this.endDateAsDate, this.startDateAsDate)
    },
    locale() {
      return getLocaleIso(this)
    },
    getStartDateString() {
      return format(this.startDateAsDate, 'numericDate', this.locale)
    },
    getStartTimeString() {
      return format(this.startDateAsDate, 'time', this.locale)
    },
    // "14:00–16:30 Uhr", "2:00 – 4:30 PM": the locale writes a span on one day as one.
    getTimeRangeString() {
      return formatRange(this.startDateAsDate, this.endDateAsDate, 'time', this.locale)
    },
    getEndDateString() {
      return this.endDate ? format(this.endDateAsDate, 'numericDate', this.locale) : ''
    },
    getEndTimeString() {
      return this.endDate ? format(this.endDateAsDate, 'time', this.locale) : ''
    },
  },
  created() {
    this.icons = iconRegistry
  },
}
</script>

<style>
.date-time-range {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .date-time-row {
    display: flex;
    gap: 10px;
  }
}
</style>
