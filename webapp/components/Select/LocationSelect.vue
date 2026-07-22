<template>
  <div>
    <label v-if="showLabel" class="ds-input-label">
      {{ `${$t('settings.data.labelCity')}` + locationNameLabelAddOnOldName }}
    </label>
    <ocelot-select
      ref="select"
      id="city"
      v-model="currentValue"
      :options="cities"
      icon="map-marker"
      :icon-right="null"
      :prefill-on-open="true"
      :placeholder="placeholder !== null ? placeholder : $t('settings.data.labelCity') + ' …'"
      :disabled="disabled"
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
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  async created() {
    this.icons = iconRegistry
    this._cityQueryId = 0
    await this.resolveLocalizedLocation()
  },
  mounted() {
    this.$watch(
      () => this.$refs.select && this.$refs.select.isOpen,
      (isOpen) => {
        if (isOpen) this.onSelectOpen()
      },
    )
  },
  beforeDestroy() {
    clearTimeout(this.debounceTimeout)
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
    userProximity() {
      const loc =
        this.$store &&
        this.$store.state.auth &&
        this.$store.state.auth.user &&
        this.$store.state.auth.user.location
      if (loc && loc.lng != null && loc.lat != null) {
        return `${loc.lng},${loc.lat}`
      }
      return null
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
      // Only re-resolve when the incoming value is a plain string (e.g. loaded
      // from DB on settings page). An object means the user already selected a
      // result from the dropdown — no re-query needed.
      if (typeof newVal === 'object') return
      const oldName = typeof oldVal === 'object' ? oldVal.value : oldVal
      if (newVal && newVal !== oldName) {
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
    getProximityFromBrowser() {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null)
          return
        }
        let resolved = false
        const fallbackTimer = setTimeout(() => {
          if (!resolved) {
            resolved = true
            resolve(null)
          }
        }, 3000)
        const done = (value) => {
          if (!resolved) {
            resolved = true
            clearTimeout(fallbackTimer)
            resolve(value)
          }
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => done(`${pos.coords.longitude},${pos.coords.latitude}`),
          () => done(null),
          { timeout: 3000, maximumAge: 300000 },
        )
      })
    },
    async requestGeoData(value) {
      if (value === '') {
        this.cities = []
        return
      }

      const reqId = ++this._cityQueryId

      try {
        this.loadingGeo = true

        const lang = this.$i18n.locale()
        const proximity = this.userProximity || (await this.getProximityFromBrowser())

        const {
          data: { queryLocations: result },
        } = await this.$apollo.query({
          query: queryLocations(),
          variables: { place: value, lang, types: this.types, proximity },
          fetchPolicy: 'network-only',
        })

        if (reqId !== this._cityQueryId) return

        this.cities = this.processLocationsResult(result)
        this.loadingGeo = false

        return this.cities.find((city) => city.value === value)
      } catch (error) {
        if (reqId === this._cityQueryId) this.$toast.error(error.message)
      } finally {
        if (reqId === this._cityQueryId) this.loadingGeo = false
      }
    },
    async resolveLocalizedLocation() {
      if (!this.locationName) return
      const result = await this.requestGeoData(this.locationName)
      this.$nextTick(() => {
        this.currentValue = result || (this.cities.length ? this.cities[0] : this.locationName)
      })
    },
    onSelectOpen() {
      if (this.locationName && !this.cities.some((c) => c.value === this.locationName)) {
        this.requestGeoData(this.locationName)
      }
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
