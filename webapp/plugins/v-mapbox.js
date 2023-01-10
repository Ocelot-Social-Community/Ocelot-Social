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
} from 'v-mapbox'

// Map
Vue.component('MglMap', MglMap)

// Controls
Vue.component('MglAttributionControl', MglAttributionControl)
Vue.component('MglScaleControl', MglScaleControl)
Vue.component('MglNavigationControl', MglNavigationControl)
Vue.component('MglGeolocateControl', MglGeolocateControl)

// Layers
Vue.component('MglGeojsonLayer', MglGeojsonLayer)
Vue.component('MglVectorLayer', MglVectorLayer)

// Marker & Popup
Vue.component('MglMarker', MglMarker)
Vue.component('MglPopup', MglPopup)
