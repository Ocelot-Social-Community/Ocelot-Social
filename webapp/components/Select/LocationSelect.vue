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
      variant="primary"
      appearance="ghost"
      size="sm"
      :aria-label="$t('actions.clear')"
      style="right: -94%; top: -48px"
      @click="clearLocationName"
    >
      <template #icon><base-icon name="close" /></template>
    </os-button>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { queryLocations } from '~/graphql/location'

let timeout

export default {
  name: 'LocationSelect',
  components: { OsButton },
  props: {
    value: {
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
    const result = await this.requestGeoData(this.locationName)
    this.$nextTick(() => {
      this.currentValue = result || this.locationName
    })
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
  },
  watch: {
    currentValue() {
      if (this.currentValue !== this.value) {
        this.$emit('input', this.currentValue)
      }
    },
    value() {
      if (this.value !== this.currentValue) {
        this.currentValue = this.value
      }
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
        } = await this.$apollo.query({ query: queryLocations(), variables: { place, lang } })

        this.cities = this.processLocationsResult(result)
        this.loadingGeo = false

        return this.cities.find((city) => city.value === value)
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.loadingGeo = false
      }
    },
    clearLocationName() {
      this.currentValue = ''
    },
  },
}
</script>
