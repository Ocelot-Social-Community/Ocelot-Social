import { berlinDe } from './berlinDe'
import { berlinEn } from './berlinEn'
import { empty } from './empty'
import { welzheim } from './welzheim'

export const mapboxResponses = {
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Berlin.json?access_token=MAPBOX_TOKEN&types=region,place,country&language=en':
    berlinEn,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Berlin.json?access_token=MAPBOX_TOKEN&types=region,place,country&language=de':
    berlinDe,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/GbHtsd4sdHa.json?access_token=MAPBOX_TOKEN&types=region,place,country&language=en':
    empty,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/.json?access_token=MAPBOX_TOKEN&types=region,place,country&language=en':
    empty,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Welzheim%2C%20Baden-W%C3%BCrttemberg%2C%20Germany.json?access_token=MAPBOX_TOKEN&types=region,place,country,address&language=en,de,fr,nl,it,es,pt,pl,ru':
    welzheim,
} as const
