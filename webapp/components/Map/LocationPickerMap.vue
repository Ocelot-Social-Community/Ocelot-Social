<template>
  <div class="location-picker-map">
    <client-only v-if="!isEmpty($env.MAPBOX_TOKEN)">
      <os-location-map
        :mapbox-gl="mapboxgl"
        :access-token="$env.MAPBOX_TOKEN"
        :lat="lat"
        :lng="lng"
        :pin-revision="pinRevision"
        :initial-center="defaultCenter"
        :initial-zoom="4"
        :map-style="defaultStyleUrl"
        :pin-color="pinColor"
        :editable="editable"
        :pick-location-label="$t('post.viewEvent.pickLocationOnMap')"
        :view-on-map="!editable"
        :view-on-map-label="$t('post.viewEvent.viewOnMainMap')"
        :styles="styles"
        :style-switcher-label="$t('map.styles.title')"
        @pin-change="onPinChange"
        @view-on-map="onViewOnMap"
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

// Default for the "types" prop — precise enough for an event's exact pin.
// Callers wanting coarser results (e.g. groups) pass their own "types" prop.
const REVERSE_GEOCODE_TYPES = 'address,poi,place'

// Must exactly match the "outdoors" entry's URL in the `styles` computed
// below — the style-switcher marks a style "active" by string-comparing
// this value against each entry's url, so a mismatch (e.g. a missing/extra
// query param) leaves none of them highlighted until the user clicks one.
const OUTDOORS_STYLE_URL = 'mapbox://styles/mapbox/outdoors-v12?optimize=true'

// Mirrors the matching --color-map-marker-* custom properties in
// root-tokens.css, used only if they can't be read yet (e.g. before the
// stylesheet is applied). Keyed by the "markerColorToken" prop's value.
const MARKER_COLOR_FALLBACKS = {
  '--color-map-marker-event': 'rgb(119, 83, 235)',
  '--color-map-marker-group': 'rgb(248, 77, 77)',
}

// Fallback label when reverse-geocoding finds no address for a clicked/dragged
// point — shows the raw coordinates instead of leaving the field empty/null.
function formatCoordinates(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export default {
  name: 'LocationPickerMap',
  components: { OsLocationMap, Empty },
  props: {
    // Either a plain string (not yet geocoded) or an object as produced by
    // LocationSelect / this component: { label, value, id, lat, lng }.
    location: {
      type: [String, Object],
      default: null,
    },
    // true (default): create/edit flow — pick-location tool, draggable pin.
    // false: read-only display (e.g. the post detail page) — no editing,
    // adds a "view on the main map" control/clickable pin instead.
    editable: {
      type: Boolean,
      default: true,
    },
    // Whether the event this map belongs to already lies in the past. When
    // navigating to the main map, this asks it to include past-event pins
    // too (it hides them by default) — otherwise the linked event's own pin
    // (and any other past ones) wouldn't show up there at all.
    isPastEvent: {
      type: Boolean,
      default: false,
    },
    // The event post's id — sent along on "view on map" so the main map can
    // open this exact event's popup instead of just centering on a pin.
    postId: {
      type: String,
      default: null,
    },
    // 'exact' (default, events/posts): the pin stays exactly where it was
    // clicked/dragged — see the "never match.lat/match.lng" comment in
    // onPinChange below.
    // 'resolved' (groups): the pin snaps to the reverse-geocoded match's own
    // coordinate instead. Deliberately coarser — a group's location isn't
    // meant to pin one exact point the way an event's is.
    precision: {
      type: String,
      default: 'exact',
      validator: (value) => ['exact', 'resolved'].includes(value),
    },
    // Reverse-geocode result types to ask mapbox for (comma-separated, see
    // https://docs.mapbox.com/api/search/geocoding/#data-types). Events keep
    // the precise default below; groups pass the coarser
    // 'place,region,country' (LocationSelect's own default types for them).
    types: {
      type: String,
      default: REVERSE_GEOCODE_TYPES,
    },
    // Which --color-map-marker-* custom property (root-tokens.css) to read
    // the pin color from — the same token the main map uses for this kind of
    // pin, so an event's map and a group's map show the same color the main
    // map would for that pin.
    markerColorToken: {
      type: String,
      default: '--color-map-marker-event',
      validator: (value) => Object.prototype.hasOwnProperty.call(MARKER_COLOR_FALLBACKS, value),
    },
  },
  data() {
    return {
      isEmpty,
      mapboxgl,
      defaultCenter: [10.452764, 51.165707], // center of Germany
      // Bumped on every onPinChange call so a slow, stale reverse-geocoding
      // response (from an earlier drag) can't overwrite what a later one
      // already resolved — only the request matching the current value
      // applies its result/error.
      pinChangeRequestId: 0,
      // Bumped every time a pin-change resolution actually lands (success or
      // error), passed straight through to OsLocationMap's own "pinRevision"
      // prop — see its doc comment: needed so the marker resyncs even when
      // the resolved lat/lng come back identical to what they already were
      // (e.g. dragging within the same place under precision="resolved"),
      // which a plain lat/lng comparison alone would never detect as a
      // change worth re-applying to the marker's own (by then diverged, via
      // the drag itself) on-screen position.
      pinRevision: 0,
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
    // Same color as the matching markers on pages/map.vue — read from the
    // shared CSS token (markerColorToken, root-tokens.css) at runtime rather
    // than duplicating the literal, so a brand override of that token is
    // picked up here too. mapbox-gl's Marker needs a resolved color, not a
    // live var() reference, hence getComputedStyle() instead of just passing
    // "var(--color-map-marker-...)" straight through.
    pinColor() {
      const fallback = MARKER_COLOR_FALLBACKS[this.markerColorToken]
      if (typeof window === 'undefined') return fallback
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(this.markerColorToken)
        .trim()
      return value || fallback
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
      const requestId = ++this.pinChangeRequestId
      try {
        const {
          data: { queryLocations: results },
        } = await this.$apollo.query({
          query: queryLocations(),
          variables: {
            place: `${lng},${lat}`,
            lang: this.$i18n.locale(),
            types: this.types,
          },
          fetchPolicy: 'network-only',
        })
        if (requestId !== this.pinChangeRequestId) return
        const match = results && results[0]
        const label = match ? match.place_name : formatCoordinates(lat, lng)
        // precision="exact" (events): always the exact clicked/dragged point,
        // never match.lat/match.lng (the matched place's own registered
        // coordinate, which can be measurably off — e.g. a building's
        // entrance rather than where the user actually pinned). The match is
        // only used for its label/id there; the pin itself must stay exactly
        // where it was put.
        // precision="resolved" (groups): snap to the match's own coordinate
        // instead — falls back to the raw click when nothing matched, same
        // as "exact" then has no choice but to do anyway.
        const usesResolvedCoordinates = this.precision === 'resolved' && match
        this.pinRevision += 1
        this.$emit('input', {
          label,
          value: label,
          id: match ? match.id : null,
          lat: usesResolvedCoordinates ? match.lat : lat,
          lng: usesResolvedCoordinates ? match.lng : lng,
        })
      } catch (error) {
        if (requestId !== this.pinChangeRequestId) return
        // The pin itself already moved (mapbox-gl already redrew it) —
        // still save/emit its raw coordinates so the field and the pin stay
        // in sync even though reverse-geocoding couldn't label them.
        const label = formatCoordinates(lat, lng)
        this.pinRevision += 1
        this.$emit('input', { label, value: label, id: null, lat, lng })
        this.$toast.error(error.message)
      }
    },
    onViewOnMap({ lat, lng }) {
      const query = { lat, lng }
      if (this.isPastEvent) query.showPastEvents = '1'
      if (this.postId) query.eventId = this.postId
      this.$router.push({ path: '/map', query })
    },
  },
}
</script>

<style>
@import 'mapbox-gl/dist/mapbox-gl.css';

.location-picker-map {
  /* All map tools (zoom, fullscreen, geolocate, pick-location/view-on-map,
     style-switcher) now stack in the top-right corner instead of splitting
     across both sides — taller than before so that stack doesn't crowd out
     the visible map/pin area. */
  height: 280px;
}
</style>
