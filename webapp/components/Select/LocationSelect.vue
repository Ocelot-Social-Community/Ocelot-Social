<template>
  <div>
    <label class="ds-input-label">
      {{ `${$t('settings.data.labelCity')}` + locationNameLabelAddOnOldName }}
    </label>
    <ds-select
      id="city"
      v-model="currentValue"
      :options="cities"
      icon="map-marker"
      :icon-right="null"
      :placeholder="$t('settings.data.labelCity') + ' …'"
      :loading="loadingGeo"
      @input.native="handleCityInput"
    />
    <os-button
      v-if="locationName !== '' && canBeCleared"
      data-test="clear-location-button"
      variant="primary"
      appearance="ghost"
      size="sm"
      :aria-label="$t('actions.clear')"
      style="right: -94%; top: -48px"
      @click="clearLocationName"
    >
      <template #icon><os-icon :icon="icons.close" /></template>
    </os-button>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { queryLocations } from '~/graphql/location'

let timeout

export default {
  name: 'LocationSelect',
  components: { OsButton, OsIcon },
  props: {
    value: {
      type: [String, Object],
      required: true,
    },
    canBeCleared: {
      type: Boolean,
      required: false,
      default: true,
    },
    showPreviousLocation: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  async created() {
    this.icons = iconRegistry
    await this.resolveLocalizedLocation()
  },
  data() {
    return {
      currentValue: this.value,
      loadingGeo: false,
      cities: [],
    }
  },
  computed: {
    locationName() {
      return typeof this.value === 'object' ? this.value.value : this.value
    },
    locationNameLabelAddOnOldName() {
      return this.locationName !== '' && this.showPreviousLocation ? ' — ' + this.locationName : ''
    },
    currentLocale() {
      return this.$store.state.i18n.locale
    },
  },
  watch: {
    currentValue() {
      if (this.currentValue !== this.value) {
        this.$emit('input', this.currentValue)
      }
    },
    value(newVal, oldVal) {
      if (newVal !== this.currentValue) {
        this.currentValue = newVal
      }
      // resolve when value is set after initial mount (e.g. settings page)
      const newName = typeof newVal === 'object' ? newVal.value : newVal
      const oldName = typeof oldVal === 'object' ? oldVal.value : oldVal
      if (newName && newName !== oldName) {
        this.resolveLocalizedLocation()
      }
    },
    currentLocale() {
      this.resolveLocalizedLocation()
    },
  },
  methods: {
    handleCityInput(event) {
      clearTimeout(timeout)
      timeout = setTimeout(
        () => this.requestGeoData(event.target ? event.target.value.trim() : ''),
        500,
      )
    },
    processLocationsResult(places) {
      if (!places.length) {
        return []
      }
      const result = []
      places.forEach((place) => {
        result.push({
          label: place.place_name,
          value: place.place_name,
          id: place.id,
        })
      })

      return result
    },
    async requestGeoData(value) {
      if (value === '') {
        this.cities = []
        return
      }

      try {
        this.loadingGeo = true

        const place = encodeURIComponent(value)
        const lang = this.$i18n.locale()

        const {
          data: { queryLocations: result },
        } = await this.$apollo.query({
          query: queryLocations(),
          variables: { place, lang },
          fetchPolicy: 'network-only',
        })

        this.cities = this.processLocationsResult(result)
        this.loadingGeo = false

        return this.cities.find((city) => city.value === value)
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.loadingGeo = false
      }
    },
    async resolveLocalizedLocation() {
      if (!this.locationName) return
      const result = await this.requestGeoData(this.locationName)
      this.$nextTick(() => {
        this.currentValue = result || (this.cities.length ? this.cities[0] : this.locationName)
      })
    },
    clearLocationName() {
      this.currentValue = ''
    },
  },
}
</script>
