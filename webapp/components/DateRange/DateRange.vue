<template>
  <ds-text class="date-range" align="left" color="soft" :size="size">
    <div>
      <div>
        <base-icon name="calendar" data-test="calendar" />
        {{ getStartDateString }}
      </div>
      <div>
        <base-icon name="clock" data-test="calendar" />
        {{
          getStartTimeString +
          (this.endDateAsDate && isSameDateButMayHaveTimeDifference
            ? '&mdash;' + getEndTimeString
            : '')
        }}
      </div>
    </div>
    <template v-if="!isSameDateButMayHaveTimeDifference">
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
import { format, isSameDay } from 'date-fns'

export default {
  name: 'DateRange',
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
    isSameDateButMayHaveTimeDifference() {
      return !this.endDateAsDate || isSameDay(this.endDateAsDate, this.startDateAsDate)
    },
    getStartDateString() {
      const isSameYear =
        this.isSameDateButMayHaveTimeDifference ||
        !this.endDateAsDate ||
        this.endDateAsDate.getYear() === this.startDateAsDate.getYear()
      const isSameMonth =
        isSameYear &&
        (!this.endDateAsDate || this.endDateAsDate.getMonth() === this.startDateAsDate.getMonth())
      const startDateFormat = this.isSameDateButMayHaveTimeDifference
        ? 'dd.MM.yyyy'
        : isSameMonth
        ? 'dd.'
        : isSameYear
        ? 'dd.MM.'
        : 'dd.MM.yyyy'
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
.date-range {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
