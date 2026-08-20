import { defineEntity } from '@db/schema/types'

/**
 * Transcribed from db/models/Location.ts.
 *
 * The per-language names are separate properties, one per supported locale, as the geocoder
 * writes them. They are NOT tied to config/locales.ts — that list governs the UI; this one
 * governs what Nominatim returned. `lat`/`lng` are absent on the 21 nodes that are countries
 * or regions rather than places.
 */
export const Location = defineEntity({
  label: 'Location',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string' },
    lat: { type: 'number' },
    lng: { type: 'number' },
    nameDE: { type: 'string' },
    nameEN: { type: 'string' },
    nameES: { type: 'string' },
    nameFR: { type: 'string' },
    nameIT: { type: 'string' },
    nameNL: { type: 'string' },
    namePL: { type: 'string' },
    namePT: { type: 'string' },
    nameRU: { type: 'string' },
    nameSQ: { type: 'string' },
  },
  required: ['id', 'name', 'type'],
  unique: ['id'],
})
