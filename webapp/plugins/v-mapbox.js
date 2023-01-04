// Vue2 + Mapbox Reference: https://github.com/geospoc/v-mapbox/issues/702
import Vue from "vue";
import {
    MglGeojsonLayer,
    MglVectorLayer,
    MglMap,
    MglMarker,
    MglPopup,
    MglScaleControl,
  } from "v-mapbox";
  
  // Map
  Vue.component("MglMap", MglMap);
  
  // Controls
  Vue.component("MglScaleControl", MglScaleControl);
  
  // Layers
  Vue.component("MglGeojsonLayer", MglGeojsonLayer);
  Vue.component("MglVectorLayer", MglVectorLayer);
  
  // Marker & Popup
  Vue.component("MglMarker", MglMarker);
  Vue.component("MglPopup", MglPopup);
  