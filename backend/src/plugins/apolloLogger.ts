/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { randomBytes } from 'node:crypto'

import cloneDeep from 'lodash/cloneDeep'

import ocelotLogger from '@src/logger'

export const loggerPlugin = {
  requestDidStart(requestContext) {
    const isIntrospectionQuery = requestContext.request.operationName === 'IntrospectionQuery'
    const qID = randomBytes(4).toString('hex')
    if (!isIntrospectionQuery) {
      const logRequest = ['Apollo Request', qID]
      logRequest.push(JSON.stringify(requestContext.request.query))
      if (requestContext.request.variables) {
        const variables = cloneDeep(requestContext.request.variables)
        if (variables.password) variables.password = '***'
        logRequest.push(JSON.stringify(variables))
      }
      ocelotLogger.debug(...logRequest)
    }
    return {
      // eslint-disable-next-line @typescript-eslint/require-await
      async willSendResponse(requestContext) {
        if (!isIntrospectionQuery) {
          const logResponse = ['Apollo Response', qID]
          if (requestContext.errors) {
            ocelotLogger.error(...logResponse, JSON.stringify(requestContext.errors))
            return
          }
          logResponse.push(JSON.stringify(requestContext.response.data))
          ocelotLogger.debug(...logResponse)
        }
      },
    }
  },
}
