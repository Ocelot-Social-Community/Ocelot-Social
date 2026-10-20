// Mapbox tile styles offered by every map (pages/map.vue, LocationPickerMap).
// https://docs.mapbox.com/api/maps/styles/ — the label is map.styles.<id>.
export const MAP_STYLES = [
  { id: 'outdoors', url: 'mapbox://styles/mapbox/outdoors-v12?optimize=true' },
  { id: 'streets', url: 'mapbox://styles/mapbox/streets-v11?optimize=true' },
  { id: 'satellite', url: 'mapbox://styles/mapbox/satellite-streets-v11?optimize=true' },
  { id: 'dark', url: 'mapbox://styles/mapbox/dark-v10?optimize=true' },
]

const urlOf = (id) => MAP_STYLES.find((style) => style.id === id).url

// A dark page opens on the dark tiles, a light one on outdoors.
export const defaultMapStyleUrl = (dark) => urlOf(dark ? 'dark' : 'outdoors')

// Spelled out so the i18n lint sees every label key in use.
export const mapStyleLabel = ($t, id) =>
  ({
    outdoors: $t('map.styles.outdoors'),
    streets: $t('map.styles.streets'),
    satellite: $t('map.styles.satellite'),
    dark: $t('map.styles.dark'),
  })[id]
