<template>
  <span>{{ dateTimeString }}</span>
</template>

<script>
import { getDateFnsLocale } from '~/locales'
import format from 'date-fns/format'
import formatRelative from 'date-fns/formatRelative'
import dateTimeConstants from '~/constants/dateTime'

export default {
  name: 'DateTime',
  props: {
    dateTime: {
      type: [Date, String],
      required: true,
    },
  },
  computed: {
    dateTimeString() {
      if (dateTimeConstants.RELATIVE_DATETIME) {
        return formatRelative(new Date(this.dateTime), new Date(), { locale: getDateFnsLocale(this) })
      } else {
        return format(new Date(this.dateTime), dateTimeConstants.ABSOLUT_DATETIME_FORMAT, { locale: getDateFnsLocale(this) })
      }
    },
  },
}
</script>
