<template>
  <div>
    LocationSelect - value: {{ value }}
    <ds-select
      id="city"
      :label="$t('settings.data.labelCity') + addPreviousLocationName"
      :value="ownValue"
      :options="cities"
      icon="map-marker"
      :icon-right="null"
      :placeholder="$t('settings.data.labelCity') + ' …'"
      :loading="loadingGeo"
      @input.native="handleCityInput"
      @changed="onChangeLocation"
      @selected="onSelectLocation"
    />
    <base-button
      v-if="locationName !== ''"
      icon="close"
      ghost
      size="small"
      style="position: relative; display: inline-block; right: -96%; top: -33px; width: 26px"
      @click.native="clearLocationName"
    ></base-button>
    <ds-text class="location-hint" color="softer">
      {{ $t('settings.data.labelCityHint') }}
    </ds-text>
  </div>
</template>

<script>
 import { queryLocations } from '~/graphql/location'

 let timeout

 export default {
   name: 'LocationSelect',
   props: {
     changed: {
       required: false,
     },
     selected: {
       required: false,
     },
     value: {
       required: true,
     },
   },
   async created() {
     console.log('created', this.value)
     // set to "requestGeoData" object and fill select menu if possible
     const result = await this.requestGeoData(this.locationName)
     console.log('result', result)
     await this.$nextTick(() => {
       this.ownValue = result || this.locationName
       console.log('## created() - ownValue:', this.ownValue)
     })
   },
   data() {
     return {
       ownValue: this.value,
       loadingGeo: false,
       cities: [],
     }
   },
   computed: {
     locationName() {
       const isNestedValue = typeof this.value === 'object' && typeof this.value.value === 'string'
       const isDirectString = typeof this.value === 'string'
       return isNestedValue ? this.value.value : isDirectString ? this.value : ''
     },
     addPreviousLocationName() {
       return this.locationName !== '' ? ' — ' + this.locationName : ''
     },
   },
   watch: {
     ownValue() {
       console.log('ownValue', this.ownValue)
       if (this.ownValue !== this.value) {
         this.$emit('input', this.ownValue)         
       }
     },
     value() {
       console.log('value', this.value)
       if (this.value !== this.ownValue) {
         this.ownValue = this.value
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
       console.log('## handleCityInput(event) - ownValue:', this.ownValue)
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

       console.log('requestGeoData', result)
       
       this.cities = this.processLocationsResult(result)
       this.loadingGeo = false

       console.log('cities', this.cities)
       
       return this.cities.find((city) => city.value === value)
     },
     onChangeLocation(event) {
       console.log('## LocationSelecet.onChangeLocation - this.changed: ', this.changed)
       console.log('## LocationSelecet.onChangeLocation - vm.changed: ', vm.changed)

       this.$emit('change', event.target.value)
     },
     onSelectLocation(event) {
       console.log('## LocationSelecet.onSelectLoction - this.selected: ', this.selected)
       console.log('## LocationSelecet.onSelectLoction - vm.selected: ', vm.selected)
       this.$emit('select', event.target.value)
     },
     clearLocationName(event) {
       event.target.value = ''
       this.$emit('input', event.target.value)
     },
   },
 }
</script>
