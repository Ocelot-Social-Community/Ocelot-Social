import { followUserMutation, unfollowUserMutation } from '~/graphql/User'

export function useFollowUser({ apollo, i18n }) {
  async function toggleFollow({ id, isCurrentlyFollowed }) {
    const follow = !isCurrentlyFollowed
    const mutation = follow ? followUserMutation(i18n) : unfollowUserMutation(i18n)
    try {
      const { data } = await apollo.mutate({
        mutation,
        variables: { id },
      })
      const result = follow ? data.followUser : data.unfollowUser
      return { success: true, data: result }
    } catch {
      return { success: false }
    }
  }

  return { toggleFollow }
}
