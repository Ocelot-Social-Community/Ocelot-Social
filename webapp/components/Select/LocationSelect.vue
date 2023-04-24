<template>
  <div>
    <label class="ds-input-label">
      {{ `${$t('settings.data.labelCity')}` }}
      <span v-if="locationName">{{ `- ${locationName}` }}</span>
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
    <base-button
      v-if="locationName !== ''"
      icon="close"
      ghost
      size="small"
      style="position: relative; display: inline-block; right: -94%; top: -48px; width: 29px"
      @click.native="clearLocationName"
    ></base-button>
  </div>
</template>

<script>
import { queryLocations } from '~/graphql/location'

let timeout

export default {
  name: 'LocationSelect',
  props: {
    value: {
      required: true,
    },
  },
  async created() {
    const result = await this.requestGeoData(this.locationName)
    await this.$nextTick(() => {
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
      this.loadingGeo = true

      const place = encodeURIComponent(value)
      const lang = this.$i18n.locale()

      const {
        data: { queryLocations: result },
      } = await this.$apollo.query({ query: queryLocations(), variables: { place, lang } })

      this.cities = this.processLocationsResult(result)
      this.loadingGeo = false

      return this.cities.find((city) => city.value === value)
    },
    clearLocationName(event) {
      event.target.value = ''
      this.$emit('input', event.target.value)
    },
  },
}
</script>
