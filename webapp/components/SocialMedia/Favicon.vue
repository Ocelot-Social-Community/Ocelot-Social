<template>
  <os-icon v-if="!src || failed" :icon="icons.link" class="favicon-fallback" />
  <img v-else :src="src" :alt="alt" :height="size" :width="size" @error="failed = true" />
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'Favicon',
  components: { OsIcon },
  props: {
    src: { type: String, default: null },
    size: { type: [Number, String], default: 22 },
    alt: { type: String, default: '' },
  },
  data() {
    return { failed: false }
  },
  created() {
    this.icons = iconRegistry
  },
  watch: {
    src() {
      this.failed = false
    },
  },
}
</script>
