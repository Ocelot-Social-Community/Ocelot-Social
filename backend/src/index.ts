/* eslint-disable @typescript-eslint/restrict-template-expressions */

import CONFIG from './config'
import { loggerPlugin } from './plugins/apolloLogger'
import createProxy from './proxy'
import createServer from './server'

const { server, httpServer } = createServer({
  plugins: [loggerPlugin],
})
const url = new URL(CONFIG.GRAPHQL_URI)
httpServer.listen({ port: url.port }, () => {
  /* eslint-disable-next-line no-console */
  console.log(`🚀 Server ready at http://localhost:${url.port}${server.graphqlPath}`)
  /* eslint-disable-next-line no-console */
  console.log(`🚀 Subscriptions ready at ws://localhost:${url.port}${server.subscriptionsPath}`)
})

const PROXY_PORT = 9000 // Port for the proxy server to listen on
const TARGET_HOST = 'minio' // The host to proxy requests to
const TARGET_PORT = 9000 // The port of the target host
const proxy = createProxy({ TARGET_PORT, TARGET_HOST })
proxy.listen(PROXY_PORT, () => {
  /* eslint-disable-next-line no-console */
  console.log(`Simple HTTP proxy listening on port ${PROXY_PORT}`)
  /* eslint-disable-next-line no-console */
  console.log(`Proxying requests to http://${TARGET_HOST}:${TARGET_PORT}`)
})
