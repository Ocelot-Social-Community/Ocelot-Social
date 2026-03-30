import { joinGroupMutation, leaveGroupMutation } from '~/graphql/groups'

export function useJoinLeaveGroup({ apollo, toast }) {
  async function joinLeaveGroup({ groupId, userId, isMember }) {
    const join = !isMember
    const mutation = join ? joinGroupMutation() : leaveGroupMutation()
    try {
      const { data } = await apollo.mutate({
        mutation,
        variables: { groupId, userId },
      })
      const result = join ? data.JoinGroup : data.LeaveGroup
      return { success: true, data: result }
    } catch (error) {
      toast.error(error.message)
      return { success: false }
    }
  }

  return { joinLeaveGroup }
}
