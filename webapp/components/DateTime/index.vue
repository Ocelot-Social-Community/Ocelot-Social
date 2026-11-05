<template>
  <span>{{ dateTimeString }}</span>
</template>

<script>
import { getLocaleIso } from '~/locales'
import { formatAbsolute, formatRelative } from '~/utils/dateFormat'
import { branding } from '@ocelot-social/branding'

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
      const locale = getLocaleIso(this)
      return branding.dateTime.relativeDateTime
        ? formatRelative(this.dateTime, new Date(), branding.dateTime, locale)
        : formatAbsolute(this.dateTime, branding.dateTime, locale)
    },
  },
}
</script>
