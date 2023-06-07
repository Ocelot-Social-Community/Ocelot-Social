<template>
  <ds-text class="date-time-range" align="left" color="soft" :size="size">
    <div>
      <div>
        <base-icon name="calendar" data-test="calendar" />
        {{ getStartDateString }}
      </div>
      <div>
        <base-icon name="clock" data-test="calendar" />
        {{
          getStartTimeString + (this.endDateAsDate && isSameDay ? '&mdash;' + getEndTimeString : '')
        }}
      </div>
    </div>
    <template v-if="!isSameDay">
      &nbsp;&mdash;&nbsp;
      <div>
        <div>
          <base-icon name="calendar" data-test="calendar" />
          {{ getEndDateString }}
        </div>
        <div>
          <base-icon name="clock" data-test="calendar" />
          {{ getEndTimeString }}
        </div>
      </div>
    </template>
  </ds-text>
</template>

<script>
import { format, isSameDay, isSameYear } from 'date-fns'

export default {
  name: 'DateTimeRange',
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
      require: true,
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
    isSameDay() {
      return !this.endDateAsDate || isSameDay(this.endDateAsDate, this.startDateAsDate)
    },
    isSameYear() {
      return !this.endDateAsDate || isSameYear(this.endDateAsDate, this.startDateAsDate)
    },
    getStartDateString() {
      let startDateFormat = 'dd.MM.yyyy'
      if (!this.isSameDay && this.isSameYear) {
        startDateFormat = 'dd.MM.'
      }
      return format(this.startDateAsDate, startDateFormat)
    },
    getStartTimeString() {
      return format(new Date(this.startDate), 'HH:mm')
    },
    getEndDateString() {
      return this.endDate ? format(new Date(this.endDate), 'dd.MM.yyyy') : ''
    },
    getEndTimeString() {
      return this.endDate ? format(new Date(this.endDate), 'HH:mm') : ''
    },
  },
}
</script>

<style lang="scss">
.date-time-range {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
