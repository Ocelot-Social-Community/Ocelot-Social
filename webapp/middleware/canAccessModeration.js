export default ({ store, error }) => {
  if (!store.getters['auth/canAccessModeration']) {
    return error({ statusCode: 403, message: 'error-pages.not-authorized' })
  }
}
