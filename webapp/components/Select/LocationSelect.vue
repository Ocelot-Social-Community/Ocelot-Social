<template>
  <div>
    <label v-if="showLabel" class="ds-input-label">
      {{ `${$t('settings.data.labelCity')}` + locationNameLabelAddOnOldName }}
    </label>
    <ocelot-select
      id="city"
      v-model="currentValue"
      :options="cities"
      icon="map-marker"
      :icon-right="null"
      :placeholder="placeholder !== null ? placeholder : $t('settings.data.labelCity') + ' …'"
      @input.native="handleCityInput"
    >
      <template v-if="(locationName !== '' && canBeCleared) || loadingGeo" #icon-right>
        <os-button
          data-test="clear-location-button"
          variant="primary"
          appearance="ghost"
          size="sm"
          circle
          :loading="loadingGeo"
          :aria-label="$t('actions.clear')"
          @click.stop="clearLocationName"
        >
          <template #icon><os-icon :icon="icons.close" /></template>
        </os-button>
      </template>
    </ocelot-select>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import OcelotSelect from '~/components/OcelotSelect/OcelotSelect.vue'
import { iconRegistry } from '~/utils/iconRegistry'
import { queryLocations } from '~/graphql/location'

export default {
  name: 'LocationSelect',
  components: { OsButton, OsIcon, OcelotSelect },
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
    types: {
      type: String,
      required: false,
      default: 'region,place,country',
    },
    placeholder: {
      type: String,
      required: false,
      default: null,
    },
    showLabel: {
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
      debounceTimeout: null,
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
      return this.$store && this.$store.state.i18n && this.$store.state.i18n.locale
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
      const value = event.target ? event.target.value.trim() : ''
      clearTimeout(this.debounceTimeout)
      if (value.length < 3) {
        this.cities = []
        return
      }
      this.debounceTimeout = setTimeout(() => this.requestGeoData(value), 500)
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
          variables: { place, lang, types: this.types },
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

<style lang="scss" scoped>
::v-deep .ocelot-select-icon-right {
  right: 4px;
}
</style>
