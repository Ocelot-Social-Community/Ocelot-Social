// eslint-disable-next-line import-x/no-unassigned-import -- MUST be first: inject a runtime brand config before anything reads `branding`
import './branding/bootstrap'

import CONFIG from './config'
import pubsubContext from './context/pubsub'
import { closeDriver } from './db/neo4j'
import { loggerPlugin } from './plugins/apolloLogger'
import { getPolicyService } from './policy'
import createProxy from './proxy'
import { getRoleService } from './role'
import createServer from './server'

import type { PolicyPubSub } from './policy'
import type { RolePubSub } from './role'

async function main() {
  // Initialize network policy (seeds DB from ENV if values are missing) and
  // subscribe to policy.changed events for cross-instance cache sync.
  // Must complete before the server accepts requests.
  const pubsub = pubsubContext() as unknown as PolicyPubSub
  // App entry point: read the deployment environment to seed the policy.
  // eslint-disable-next-line n/no-process-env
  await getPolicyService().init(process.env, pubsub)

  // Initialize roles (seeds the default roles idempotently) and subscribe to
  // roles.changed for cross-instance cache sync. Also must complete before the
  // server accepts requests, since authorization resolves against the cache.
  await getRoleService().init(pubsub as unknown as RolePubSub)

  const { server, httpServer } = await createServer({
    plugins: [loggerPlugin],
  })
  const url = new URL(CONFIG.GRAPHQL_URI)
  httpServer.listen({ port: url.port }, () => {
    /* eslint-disable-next-line no-console */
    console.log(`🚀 Server ready at http://localhost:${url.port}/`)
    /* eslint-disable-next-line no-console */
    console.log(`🚀 Subscriptions ready at ws://localhost:${url.port}/`)
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

  // Graceful shutdown: close Neo4j driver and Apollo server on process signals.
  // This prevents connection pool leaks during nodemon restarts in development
  // and ensures clean shutdown in production.
  const shutdown = async () => {
    /* eslint-disable-next-line no-console */
    console.log('Shutting down...')
    await server.stop()
    httpServer.close()
    await closeDriver()
    process.exit(0)
  }
  const onSignal = () => {
    // eslint-disable-next-line promise/prefer-await-to-callbacks, @typescript-eslint/use-unknown-in-catch-callback-variable
    shutdown().catch((err) => {
      /* eslint-disable-next-line no-console */
      console.error('Shutdown failed:', err)
      process.exit(1)
    })
  }
  process.on('SIGTERM', onSignal)
  process.on('SIGINT', onSignal)
}

// eslint-disable-next-line promise/prefer-await-to-callbacks, @typescript-eslint/use-unknown-in-catch-callback-variable
main().catch((err) => {
  /* eslint-disable-next-line no-console */
  console.error('Failed to start server:', err)
  process.exit(1)
})
