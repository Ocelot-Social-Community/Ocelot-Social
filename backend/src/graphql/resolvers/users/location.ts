/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable promise/avoid-new */
/* eslint-disable promise/prefer-await-to-callbacks */
import { UserInputError } from 'apollo-server'
import request from 'request'

import CONFIG from '@config/index'

const fetch = (url) => {
  return new Promise((resolve, reject) => {
    request(url, function (error, response, body) {
      if (error) {
        reject(error)
      } else {
        resolve(JSON.parse(body))
      }
    })
  })
}

const locales = ['en', 'de', 'fr', 'nl', 'it', 'es', 'pt', 'pl', 'ru']

const createLocation = async (session, mapboxData) => {
  const data = {
    id: mapboxData.id + (mapboxData.address ? `-${mapboxData.address}` : ''),
    nameEN: mapboxData.text_en,
    nameDE: mapboxData.text_de,
    nameFR: mapboxData.text_fr,
    nameNL: mapboxData.text_nl,
    nameIT: mapboxData.text_it,
    nameES: mapboxData.text_es,
    namePT: mapboxData.text_pt,
    namePL: mapboxData.text_pl,
    nameRU: mapboxData.text_ru,
    type: mapboxData.id.split('.')[0].toLowerCase(),
    address: mapboxData.address,
    lng: mapboxData.center?.length ? mapboxData.center[0] : null,
    lat: mapboxData.center?.length ? mapboxData.center[1] : null,
  }

  let mutation =
    'MERGE (l:Location {id: $id}) ' +
    'SET l.name = $nameEN, ' +
    'l.nameEN = $nameEN, ' +
    'l.nameDE = $nameDE, ' +
    'l.nameFR = $nameFR, ' +
    'l.nameNL = $nameNL, ' +
    'l.nameIT = $nameIT, ' +
    'l.nameES = $nameES, ' +
    'l.namePT = $namePT, ' +
    'l.namePL = $namePL, ' +
    'l.nameRU = $nameRU, ' +
    'l.type = $type'

  if (data.lat && data.lng) {
    mutation += ', l.lat = $lat, l.lng = $lng'
  }
  if (data.address) {
    mutation += ', l.address = $address'
  }

  mutation += ' RETURN l.id'

  await session.writeTransaction((transaction) => {
    return transaction.run(mutation, data)
  })
}

export const createOrUpdateLocations = async (nodeLabel, nodeId, locationName, session) => {
  if (locationName === undefined) return

  let locationId

  if (locationName !== null) {
    const res: any = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        locationName,
      )}.json?access_token=${
        CONFIG.MAPBOX_TOKEN
      }&types=region,place,country,address&language=${locales.join(',')}`,
    )

    if (!res?.features?.[0]) {
      throw new UserInputError('locationName is invalid')
    }

    let data

    res.features.forEach((item) => {
      if (item.matching_place_name === locationName) {
        data = item
      }
    })
    if (!data) {
      data = res.features[0]
    }

    if (!data?.place_type?.length) {
      throw new UserInputError('locationName is invalid')
    }

    if (data.place_type.length > 1) {
      data.id = 'region.' + data.id.split('.')[1]
    }
    await createLocation(session, data)

    let parent = data

    if (parent.address) {
      parent.id += `-${parent.address}`
    }

    if (data.context) {
      for await (const ctx of data.context) {
        await createLocation(session, ctx)
        await session.writeTransaction((transaction) => {
          return transaction.run(
            `
                MATCH (parent:Location {id: $parentId}), (child:Location {id: $childId})
                MERGE (child)<-[:IS_IN]-(parent)
                RETURN child.id, parent.id
              `,
            {
              parentId: parent.id,
              childId: ctx.id,
            },
          )
        })
        parent = ctx
      }
    }

    locationId = data.id
  } else {
    locationId = 'non-existent-id'
  }

  // delete all current locations from node and add new location
  await session.writeTransaction((transaction) => {
    return transaction.run(
      `
        MATCH (node:${nodeLabel} {id: $nodeId})
        OPTIONAL MATCH (node)-[relationship:IS_IN]->(:Location)
        DELETE relationship
        WITH node
        MATCH (location:Location {id: $locationId})
        MERGE (node)-[:IS_IN]->(location)
        RETURN location.id, node.id
      `,
      { nodeId, locationId },
    )
  })
}

export const queryLocations = async ({ place, lang }) => {
  const res: any = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${place}.json?access_token=${CONFIG.MAPBOX_TOKEN}&types=region,place,country&language=${lang}`,
  )
  // Return empty array if no location found or error occurred
  if (!res?.features) {
    return []
  }
  return res.features
}
