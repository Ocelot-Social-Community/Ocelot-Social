import type { Context } from '@src/context'

import { mapboxResponses } from './mapboxResponses'

export const fetchMock: Context['fetch'] = (url) => {
  const response: unknown = mapboxResponses[url] // eslint-disable-line security/detect-object-injection
  if (!response) {
    throw new Error(`Missing response for url: ${url}`)
  }
  return Promise.resolve(response)
}
