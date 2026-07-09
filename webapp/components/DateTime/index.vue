<template>
  <span>{{ dateTimeString }}</span>
</template>

<script>
import { getDateFnsLocale } from '~/locales'
import format from 'date-fns/format'
import formatRelative from 'date-fns/formatRelative'
import branding from '@ocelot-social/branding'

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
      if (branding.dateTime.relativeDateTime) {
        return formatRelative(new Date(this.dateTime), new Date(), {
          locale: getDateFnsLocale(this),
        })
      } else {
        return format(new Date(this.dateTime), branding.dateTime.absoluteDateTimeFormat, {
          locale: getDateFnsLocale(this),
        })
      }
    },
  },
}
</script>
