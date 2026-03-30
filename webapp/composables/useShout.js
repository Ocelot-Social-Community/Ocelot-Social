import { shoutMutation, unshoutMutation } from '~/graphql/Shout'

export function useShout({ apollo }) {
  async function toggleShout({ id, type, isCurrentlyShouted }) {
    const mutation = isCurrentlyShouted ? unshoutMutation : shoutMutation
    try {
      const res = await apollo.mutate({
        mutation,
        variables: { id, type },
      })
      const result = isCurrentlyShouted ? res?.data?.unshout : res?.data?.shout
      return { success: !!result }
    } catch {
      return { success: false }
    }
  }

  return { toggleShout }
}
