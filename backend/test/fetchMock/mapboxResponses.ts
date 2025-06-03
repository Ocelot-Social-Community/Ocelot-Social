import { berlinDe } from './berlinDe'
import { berlinEn } from './berlinEn'
import { berlinGermany } from './berlinGermany'
import { empty } from './empty'
import { hamburg } from './hamburg'
import { hamburgNY } from './hamburgNY'
import { leipzig } from './leipzig'
import { paris } from './paris'
import { welzheim } from './welzheim'

export const mapboxResponses = {
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Berlin.json?access_token=MAPBOX_TOKEN&types=region,place,country&language=en':
    berlinEn,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Berlin.json?access_token=MAPBOX_TOKEN&types=region,place,country&language=de':
    berlinDe,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Berlin%2C%20Germany.json?access_token=MAPBOX_TOKEN&types=region,place,country,address&language=en,de,fr,nl,it,es,pt,pl,ru':
    berlinGermany,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/GbHtsd4sdHa.json?access_token=MAPBOX_TOKEN&types=region,place,country&language=en':
    empty,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/.json?access_token=MAPBOX_TOKEN&types=region,place,country&language=en':
    empty,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Welzheim%2C%20Baden-W%C3%BCrttemberg%2C%20Germany.json?access_token=MAPBOX_TOKEN&types=region,place,country,address&language=en,de,fr,nl,it,es,pt,pl,ru':
    welzheim,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Hamburg%2C%20Germany.json?access_token=MAPBOX_TOKEN&types=region,place,country,address&language=en,de,fr,nl,it,es,pt,pl,ru':
    hamburg,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Hamburg%2C%20New%20Jersey%2C%20United%20States.json?access_token=MAPBOX_TOKEN&types=region,place,country,address&language=en,de,fr,nl,it,es,pt,pl,ru':
    hamburgNY,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Leipzig.json?access_token=MAPBOX_TOKEN&types=region,place,country,address&language=en,de,fr,nl,it,es,pt,pl,ru':
    leipzig,
  'https://api.mapbox.com/geocoding/v5/mapbox.places/Paris%2C%20France.json?access_token=MAPBOX_TOKEN&types=region,place,country,address&language=en,de,fr,nl,it,es,pt,pl,ru':
    paris,
} as const
