import { updateOnlineStatus as updateOnlineStatusMutation } from '~/graphql/updateOnlineStatus.js'

let _app = null

const updateOnlineStatus = async () => {
  if (!_app.store.getters['auth/isAuthenticated']) {
    return
  }

  const status = document.hidden ? 'away' : 'online'

  const client = _app.apolloProvider.defaultClient

  await client.mutate({
    mutation: updateOnlineStatusMutation,
    variables: { status },
  })

  // TODO
  console.log(`call home as ${status} at ${new Date().toUTCString()}`)
}

export default ({ app }) => {
  _app = app
  if (process.client) {
    window.addEventListener('visibilitychange', updateOnlineStatus)
    setInterval(updateOnlineStatus, 30000)
    updateOnlineStatus()
  }
}
