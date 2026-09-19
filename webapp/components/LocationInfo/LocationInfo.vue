<template>
  <div :class="`location-info size-${size}`">
    <div class="location">
      <!-- OsIcon's own default is align-bottom, which sits a pointed pin
           glyph noticeably lower than the surrounding text's cap-height —
           align-middle (merged in via tailwind-merge, overriding it) reads
           much closer to the text's actual visual center. -->
      <os-icon :icon="icons.mapMarker" class="align-middle" />
      {{ fullLocationName }}
    </div>
    <div v-if="locationData.distanceToMe !== null && !isOwner" class="distance">
      {{ $t('location.distance', { distance: locationData.distanceToMe }) }}
    </div>
  </div>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'LocationInfo',
  components: { OsIcon },
  props: {
    locationData: { type: Object, default: null },
    size: {
      type: String,
      default: 'base',
      validator: (value) => {
        return value.match(/(small|base)/)
      },
    },
    isOwner: {
      type: Boolean,
      required: true,
    },
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    // Same level of detail LocationSelect's own search results already show
    // while editing (Mapbox's own place_name, e.g. "Ottensen, Hamburg,
    // Germany") — the Location node's bare own name alone ("Ottensen")
    // doesn't say which country or, for a common city name like "Paris",
    // even which one. Built by walking the queried parent chain (see the
    // "location" GraphQL fragment) instead of storing it directly, so it's
    // always current with whatever locales/parents are actually loaded —
    // falls back to just the bare name if no parent was fetched.
    fullLocationName() {
      const parts = []
      let node = this.locationData
      while (node && node.name) {
        parts.push(node.name)
        node = node.parent
      }
      return parts.join(', ')
    },
  },
}
</script>

<style scoped>
.location-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* No flex here (unlike the column above) — the icon needs to sit inline,
     as if it were the text's own first character, so it travels with the
     first word when the (now often longer, full "district, city, region,
     country") name wraps, instead of floating centered against the whole
     multi-line block regardless of where any single line actually starts. */
  .location {
    text-align: center;
  }
}

.size-base {
  > .distance {
    margin-top: 8px;
  }
}

.size-small {
  font-size: 0.8rem;
  color: var(--color-neutral-40);
  margin-bottom: 12px;

  > .distance {
    margin-top: 2px;
  }
}
</style>
