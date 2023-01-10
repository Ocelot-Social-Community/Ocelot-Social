// Vue2 + Mapbox Reference: https://github.com/geospoc/v-mapbox/issues/702
import Vue from 'vue'
import {
  MglGeojsonLayer,
  MglVectorLayer,
  MglMap,
  MglMarker,
  MglPopup,
  MglAttributionControl,
  MglScaleControl,
  MglNavigationControl,
  MglGeolocateControl,
  MglFullscreenControl,
} from 'v-mapbox'

// Map
Vue.component('MglMap', MglMap)

// overview of all: https://github.com/geospoc/v-mapbox/tree/v1.11.2/src/components
// mapbox: https://docs.mapbox.com/mapbox-gl-js/api/markers/

// Controls
Vue.component('MglAttributionControl', MglAttributionControl)
Vue.component('MglScaleControl', MglScaleControl)
Vue.component('MglNavigationControl', MglNavigationControl)
Vue.component('MglGeolocateControl', MglGeolocateControl)
Vue.component('MglFullscreenControl', MglFullscreenControl)

// Layers
Vue.component('MglGeojsonLayer', MglGeojsonLayer)
Vue.component('MglVectorLayer', MglVectorLayer)

// Marker & Popup
Vue.component('MglMarker', MglMarker)
Vue.component('MglPopup', MglPopup)
