<template>
  <ds-text class="location-teaser" align="left" color="soft" :size="size">
    <base-icon name="map-marker" data-test="map-marker" />
    <span v-if="venue">{{ venue }}</span>
    <span v-if="venue">&nbsp;&mdash;&nbsp;</span>
    <span v-if="!isOnline">
      {{ locationName }}
    </span>
    <span v-else>
      {{ $t('post.viewEvent.eventIsOnline') }}
    </span>
  </ds-text>
</template>

<script>
export default {
  name: 'LocationTeaser',
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
    venue: {
      type: String,
      default: null,
    },
    locationName: {
      type: String,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style lang="scss">
.location-teaser {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
