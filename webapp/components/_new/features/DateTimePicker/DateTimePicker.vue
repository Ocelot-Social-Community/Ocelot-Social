<template>
  <div>
    <!-- <label>Beginn</label> -->
    <div class="date-input-container">
      <div class="event-grid-item-z-helper">
        <date-picker
          name="inputDate"
          v-model="inputDate"
          type="date"
          value-type="format"
          class="event-grid-item-z-helper"
          :placeholder="$t('post.viewEvent.eventStart')"
          :disabled-date="notBeforeToday"
          :disabled-time="notBeforeNow"
          @change="changeEventStart($event)"
          :time-picker-options="{ start: '00:00', step: '00:30', end: '23:30', format: 'HH:mm' }"
        ></date-picker>
      </div>
      <div class="event-grid-item-z-helper">
        <date-picker
          name="inputTime"
          v-model="inputTime"
          type="datetime"
          :minute-step="15"
          format="HH:mm"
          class="event-grid-item-z-helper"
          :placeholder="$t('post.viewEvent.eventStartTime')"
          :disabled-date="notBeforeToday"
          :disabled-time="notBeforeNow"
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
  emits: ['toggle-password'],
  props: {
    errors: { type: Object, default: () => null },
    formDate: { type: String, default: () => null },
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
    notBeforeToday(date) {
      return date < new Date().setHours(0, 0, 0, 0)
    },
    notBeforeNow(date) {
      return date < new Date()
    },
    notBeforeEventDay(date) {
      return date < new Date(this.date).setHours(0, 0, 0, 0)
    },
    notBeforeEvent(date) {
      return date <= new Date(this.date)
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
