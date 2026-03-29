import { shoutMutation, unshoutMutation } from '~/graphql/Shout'

export function useShout({ apollo }) {
  async function toggleShout({ id, type, isCurrentlyShouted }) {
    const mutation = isCurrentlyShouted ? unshoutMutation : shoutMutation
    try {
      const res = await apollo.mutate({
        mutation,
        variables: { id, type },
      })
      return { success: !!(res && res.data) }
    } catch {
      return { success: false }
    }
  }

  return { toggleShout }
}
