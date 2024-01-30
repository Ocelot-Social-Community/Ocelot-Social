<template>
  <div>
    <label v-if="inputLabel">{{ inputLabel }}</label>
    <div class="date-input-container">
      <div class="event-grid-item-z-helper">
        <date-picker
          name="inputDate"
          v-model="inputDate"
          type="date"
          value-type="format"
          class="event-grid-item-z-helper"
          :placeholder="placeholderDate"
          :disabled-date="notBeforeDate"
          :disabled-time="notBeforeDay"
          @change="changeDate($event)"
        ></date-picker>
      </div>
      <div class="event-grid-item-z-helper time-picker">
        <date-picker
          v-if="inputDate"
          name="inputTime"
          v-model="inputTime"
          type="datetime"
          :minute-step="15"
          format="HH:mm"
          class="event-grid-item-z-helper"
          :placeholder="placeholderTime"
          :show-second="false"
          :show-time-panel="false"
          :confirm="true"
          @close="getTimeFromDate"
        >
          <template v-slot:content="slotProps">
            <div :style="{ display: 'flex' }">
              <time-panel
                :value="slotProps.value"
                @select="slotProps.emit"
                :minute-step="15"
                :show-second="false"
              ></time-panel>
            </div>
          </template>
          <template v-slot:icon-calendar>
            <base-icon name="clock" />
          </template>
        </date-picker>
      </div>
    </div>
    <!-- TODO decouple from eventstart? -->
    <div v-if="errors && errors.eventStart" class="chipbox event-grid-item-margin-helper">
      <ds-chip size="base" :color="errors && errors.eventStart && 'danger'">
        <base-icon name="warning" />
      </ds-chip>
    </div>
  </div>
</template>

<script>
import DatePicker from 'vue2-datepicker'
import 'vue2-datepicker/scss/index.scss'

const { TimePanel } = DatePicker

export default {
  name: 'DateTimePicker',
  components: {
    DatePicker,
    TimePanel,
  },
  emits: ['change-event-start', 'change-event-end'],
  props: {
    errors: { type: Object, default: () => null },
    formDate: { type: String, default: () => null },
    inputLabel: { type: String, default: '' },
    compareDate: { type: String, default: () => null },
    placeholderDate: { type: String },
    placeholderTime: { type: String, default: '' },
    // formTime: { type: String, default: () => null },
  },
  data() {
    return {
      // date: this.formDate,
      inputDate: this.formDate,
      inputTime: '',
    }
  },
  methods: {
    notBeforeDay(date) {
      if (this.compareDate === null) {
        return date < new Date().setHours(0, 0, 0, 0)
      } else {
        return date < new Date(this.compareDate).setHours(0, 0, 0, 0)
      }
    },
    notBeforeDate(date) {
      if (this.compareDate === null) {
        return date < new Date()
      } else {
        return date <= new Date(this.compareDate)
      }
    },
    getTimeFromDate(event) {
      if (this.inputTime) {
        var timeObject = new Date(this.inputTime)
        var min = timeObject.getUTCMinutes()
        var hour = timeObject.getUTCHours()

        var dateObject = new Date(this.inputDate)
        dateObject.setUTCHours(hour, min)
        this.inputDate = dateObject.toISOString()
        // this.formDate = date_object.toUTCString()
      }
    },
    changeDate(event) {
      this.$emit('change-date', event)
    },
    changeEventEnd(event) {
      this.$emit('change-event-end', event)
    },
    changeEventStart(event) {
      this.$emit('change-event-start', event)
    },
  },
}
</script>

<style lang="scss" scoped>
.time-picker {
  margin-left: $space-small;
}
.eventDatas {
  .chipbox {
    display: flex;
    justify-content: flex-end;

    > .ds-chip {
      margin-top: -10px;
    }
  }
  // style override to handle dynamic inputs
  .event-location-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

.date-input-container {
  display: flex;
}
.event-grid-item {
  // important needed because of component inline style
  grid-row-end: span 3 !important;
}
.event-grid-item-z-helper {
  z-index: 20;
}
.event-grid-item-margin-helper {
  margin-top: 10px;
}
.event-grid-item-font-helper {
  font-size: larger;
}
</style>
