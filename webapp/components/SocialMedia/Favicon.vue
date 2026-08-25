<template>
  <os-icon v-if="!src || failed" :icon="fallback" class="favicon-fallback" />
  <img v-else :src="src" :alt="alt" :height="size" :width="size" @error="failed = true" />
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { resolveIcon } from '~/utils/iconRegistry'

export default {
  name: 'Favicon',
  components: { OsIcon },
  props: {
    src: { type: String, default: null },
    size: { type: [Number, String], default: 22 },
    alt: { type: String, default: '' },
    // Shown when there is no favicon or it fails to load. A chain link says "this goes
    // somewhere" and fits a web address; a mail address is not somewhere you go, so the
    // caller names what belongs in front of it.
    fallbackIcon: { type: String, default: 'link' },
  },
  data() {
    return { failed: false }
  },
  computed: {
    fallback() {
      return resolveIcon(this.fallbackIcon)
    },
  },
  watch: {
    src() {
      this.failed = false
    },
  },
}
</script>
