// mapbox-gl's own UI strings — the tooltips of its zoom, compass, fullscreen, geolocate and
// attribution controls, and what screen readers call its logo — in the user's
// language, as mapbox-gl's `locale` map option. Left out, mapbox-gl shows them in English.
export const mapboxLocale = ($t) => ({
  'NavigationControl.ZoomIn': $t('map.controls.zoomIn'),
  'NavigationControl.ZoomOut': $t('map.controls.zoomOut'),
  'NavigationControl.ResetBearing': $t('map.controls.resetBearing'),
  'FullscreenControl.Enter': $t('map.controls.enterFullscreen'),
  'FullscreenControl.Exit': $t('map.controls.exitFullscreen'),
  'GeolocateControl.FindMyLocation': $t('map.controls.findMyLocation'),
  'GeolocateControl.LocationNotAvailable': $t('map.controls.locationNotAvailable'),
  'AttributionControl.ToggleAttribution': $t('map.controls.toggleAttribution'),
  'AttributionControl.MapFeedback': $t('map.controls.mapFeedback'),
  'LogoControl.Title': $t('map.controls.logo'),
})
