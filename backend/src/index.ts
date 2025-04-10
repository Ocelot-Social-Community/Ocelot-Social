import CONFIG from './config'
import createServer from './server'

const { server, httpServer } = createServer()
const url = new URL(CONFIG.GRAPHQL_URI)
httpServer.listen({ port: url.port }, () => {
  /* eslint-disable-next-line no-console */
  console.log(`🚀 Server ready at http://localhost:${url.port}${server.graphqlPath}`)
  /* eslint-disable-next-line no-console */
  console.log(`🚀 Subscriptions ready at ws://localhost:${url.port}${server.subscriptionsPath}`)
})
