import { resetPasswordMutation } from '~/graphql/Password'

export function useResetPassword({ apollo, toast }) {
  async function resetPassword({ password, email, nonce }) {
    try {
      const { data } = await apollo.mutate({
        mutation: resetPasswordMutation,
        variables: { password, email, nonce },
      })
      const success = !!data.resetPassword
      return { success, result: success ? 'success' : 'error' }
    } catch (err) {
      toast.error(err.message)
      return { success: false, result: null }
    }
  }

  return { resetPassword }
}
