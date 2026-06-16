export default ({ store, error }) => {
  if (!store.getters['auth/can']('badge.manage')) {
    return error({ statusCode: 403, message: 'error-pages.not-authorized' })
  }
}
