<template>
  <div class="event-location-map">
    <client-only v-if="!isEmpty($env.MAPBOX_TOKEN)">
      <os-location-map
        :mapbox-gl="mapboxgl"
        :access-token="$env.MAPBOX_TOKEN"
        :lat="lat"
        :lng="lng"
        :initial-center="defaultCenter"
        :initial-zoom="4"
        :map-style="defaultStyleUrl"
        :pin-color="pinColor"
        editable
        :pick-location-label="$t('post.viewEvent.pickLocationOnMap')"
        :styles="styles"
        :style-switcher-label="$t('map.styles.title')"
        @pin-change="onPinChange"
      />
    </client-only>
    <empty v-else icon="alert" :message="$t('map.alertMessage')" margin="small" />
  </div>
</template>

<script>
import { isEmpty } from 'lodash'
import mapboxgl from 'mapbox-gl'
import { OsLocationMap } from '@ocelot-social/ui/ocelot'
import Empty from '~/components/Empty/Empty'
import { queryLocations } from '~/graphql/location'

const REVERSE_GEOCODE_TYPES = 'address,poi,place'

// Must exactly match the "outdoors" entry's URL in the `styles` computed
// below — the style-switcher marks a style "active" by string-comparing
// this value against each entry's url, so a mismatch (e.g. a missing/extra
// query param) leaves none of them highlighted until the user clicks one.
const OUTDOORS_STYLE_URL = 'mapbox://styles/mapbox/outdoors-v12?optimize=true'

// Same value as --color-map-marker-event in root-tokens.css, used only if that
// custom property can't be read yet (e.g. before the stylesheet is applied).
const EVENT_MARKER_COLOR_FALLBACK = 'rgb(119, 83, 235)'

// Fallback label when reverse-geocoding finds no address for a clicked/dragged
// point — shows the raw coordinates instead of leaving the field empty/null.
function formatCoordinates(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export default {
  name: 'EventLocationMap',
  components: { OsLocationMap, Empty },
  props: {
    // Either a plain string (not yet geocoded) or an object as produced by
    // LocationSelect / this component: { label, value, id, lat, lng }.
    location: {
      type: [String, Object],
      default: null,
    },
  },
  data() {
    return {
      isEmpty,
      mapboxgl,
      defaultCenter: [10.452764, 51.165707], // center of Germany
    }
  },
  computed: {
    lat() {
      return this.hasCoordinates ? this.location.lat : null
    },
    lng() {
      return this.hasCoordinates ? this.location.lng : null
    },
    hasCoordinates() {
      return (
        typeof this.location === 'object' &&
        this.location !== null &&
        typeof this.location.lat === 'number' &&
        typeof this.location.lng === 'number'
      )
    },
    defaultStyleUrl() {
      return OUTDOORS_STYLE_URL
    },
    // Same purple as the "event" markers on pages/map.vue — read from the
    // shared CSS token (--color-map-marker-event, root-tokens.css) at
    // runtime rather than duplicating the literal, so a brand override of
    // that token is picked up here too. mapbox-gl's Marker needs a resolved
    // color, not a live var() reference, hence getComputedStyle() instead of
    // just passing "var(--color-map-marker-event)" straight through.
    pinColor() {
      if (typeof window === 'undefined') return EVENT_MARKER_COLOR_FALLBACK
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-map-marker-event')
        .trim()
      return value || EVENT_MARKER_COLOR_FALLBACK
    },
    styles() {
      return [
        {
          id: 'outdoors',
          url: OUTDOORS_STYLE_URL,
          label: this.$t('map.styles.outdoors'),
        },
        {
          id: 'streets',
          url: 'mapbox://styles/mapbox/streets-v11?optimize=true',
          label: this.$t('map.styles.streets'),
        },
        {
          id: 'satellite',
          url: 'mapbox://styles/mapbox/satellite-streets-v11?optimize=true',
          label: this.$t('map.styles.satellite'),
        },
        {
          id: 'dark',
          url: 'mapbox://styles/mapbox/dark-v10?optimize=true',
          label: this.$t('map.styles.dark'),
        },
      ]
    },
  },
  methods: {
    async onPinChange({ lat, lng }) {
      // Mapbox forward-geocoding endpoint auto-detects a "lng,lat" search
      // string and reverse-geocodes it — same endpoint the address search
      // already uses, no separate backend resolver needed.
      try {
        const {
          data: { queryLocations: results },
        } = await this.$apollo.query({
          query: queryLocations(),
          variables: {
            place: `${lng},${lat}`,
            lang: this.$i18n.locale(),
            types: REVERSE_GEOCODE_TYPES,
          },
          fetchPolicy: 'network-only',
        })
        const match = results && results[0]
        const label = match ? match.place_name : formatCoordinates(lat, lng)
        this.$emit('input', {
          label,
          value: label,
          id: match ? match.id : null,
          lat: match ? (match.lat ?? lat) : lat,
          lng: match ? (match.lng ?? lng) : lng,
        })
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>

<style>
@import 'mapbox-gl/dist/mapbox-gl.css';

.event-location-map {
  height: 260px;
}
</style>
