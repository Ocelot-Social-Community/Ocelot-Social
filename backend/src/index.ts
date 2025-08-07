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

if (CONFIG.PROXY_S3) {
  /*
  In a Docker environment, the `AWS_ENDPOINT` of the backend container would be `http://minio:9000` but this domain is not reachable from the Docker host.
  Therefore, we forward the local port 9000 to "http://minio:9000." The backend can upload files to its own proxy `http://localhost:9000` and the returned file location is going to be accessible from the web frontend.
  This behavior is only required in local development, not in production. Therefore, we put it behind a `CONFIG.PROXY_S3` feature flag.
  */
  const target = new URL(CONFIG.PROXY_S3)
  const proxy = createProxy(target)
  const forwardedPort = target.port // target port and forwarded port must be the same
  proxy.listen(forwardedPort, () => {
    /* eslint-disable-next-line no-console */
    console.log(`Simple HTTP proxy listening on port ${forwardedPort}`)
    /* eslint-disable-next-line no-console */
    console.log(`Proxying requests to ${target}`)
  })
}
