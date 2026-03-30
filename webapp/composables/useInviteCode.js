import {
  generatePersonalInviteCode as generateMutation,
  invalidateInviteCode as invalidateMutation,
} from '~/graphql/InviteCode'

export function useInviteCode({ apollo, toast, t, store }) {
  async function generatePersonalInviteCode(comment) {
    try {
      await apollo.mutate({
        mutation: generateMutation(),
        variables: { comment },
        update: (_, { data: { generatePersonalInviteCode: newCode } }) => {
          const user = store.getters['auth/user']
          store.commit('auth/SET_USER_PARTIAL', {
            ...user,
            inviteCodes: [...user.inviteCodes, newCode],
          })
        },
      })
      toast.success(t('invite-codes.create-success'))
      return { success: true }
    } catch (error) {
      toast.error(t('invite-codes.create-error', { error: error.message }))
      return { success: false }
    }
  }

  async function invalidateInviteCode(code) {
    try {
      await apollo.mutate({
        mutation: invalidateMutation(),
        variables: { code },
        update: () => {
          const user = store.getters['auth/user']
          store.commit('auth/SET_USER_PARTIAL', {
            ...user,
            inviteCodes: user.inviteCodes.map((inviteCode) => ({
              ...inviteCode,
              isValid: inviteCode.code === code ? false : inviteCode.isValid,
            })),
          })
        },
      })
      toast.success(t('invite-codes.invalidate-success'))
      return { success: true }
    } catch (error) {
      toast.error(t('invite-codes.invalidate-error', { error: error.message }))
      return { success: false }
    }
  }

  return { generatePersonalInviteCode, invalidateInviteCode }
}
