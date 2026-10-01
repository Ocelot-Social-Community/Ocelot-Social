import { changePasswordMutation } from '~/graphql/Password'

export function useChangePassword({
  apollo,
  store,
  toast,
  t,
  backendError = (error) => error.message,
}) {
  async function changePassword({ oldPassword, password }) {
    try {
      const { data } = await apollo.mutate({
        mutation: changePasswordMutation,
        variables: { oldPassword, password },
      })
      store.commit('auth/SET_TOKEN', data.changePassword)
      toast.success(t('settings.security.change-password.success'))
      return { success: true }
    } catch (err) {
      toast.error(backendError(err))
      return { success: false }
    }
  }

  return { changePassword }
}
