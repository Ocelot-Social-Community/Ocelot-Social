/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-shadow */

import { randomBytes } from 'node:crypto'

import cloneDeep from 'lodash/cloneDeep'

import ocelotLogger from '@src/logger'

export const loggerPlugin = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async requestDidStart(requestContext) {
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
          const errors = requestContext.response.body?.singleResult?.errors
          if (errors?.length) {
            ocelotLogger.error(...logResponse, JSON.stringify(errors))
            return
          }
          if (requestContext.response.body?.singleResult?.data?.login) {
            // mask the token
            const data = cloneDeep(requestContext.response.body.singleResult.data)
            data.login = 'token'
            logResponse.push(JSON.stringify(data))
          } else if (requestContext.response.body?.singleResult?.data) {
            logResponse.push(JSON.stringify(requestContext.response.body.singleResult.data))
          }
          ocelotLogger.debug(...logResponse)
        }
      },
    }
  },
}
