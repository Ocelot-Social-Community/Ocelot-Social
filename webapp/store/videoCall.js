export const state = () => {
  return {
    enabled: false,
    showVideoCall: false,
    minimized: false,
    groupId: null,
    groupName: null,
    groupSlug: null,
    participantCount: 0,
  }
}

export const mutations = {
  SET_ENABLED(state, enabled) {
    state.enabled = !!enabled
  },
  OPEN(state, { groupId, groupName, groupSlug }) {
    state.showVideoCall = true
    state.minimized = false
    state.groupId = groupId
    state.groupName = groupName || null
    state.groupSlug = groupSlug || null
  },
  CLOSE(state) {
    state.showVideoCall = false
    state.minimized = false
    state.groupId = null
    state.groupName = null
    state.groupSlug = null
  },
  SET_MINIMIZED(state, minimized) {
    state.minimized = !!minimized
  },
  SET_PARTICIPANT_COUNT(state, count) {
    state.participantCount = Number(count) || 0
  },
}

export const getters = {
  enabled(state) {
    return state.enabled
  },
  showVideoCall(state) {
    return state.showVideoCall
  },
  minimized(state) {
    return state.minimized
  },
  groupId(state) {
    return state.groupId
  },
  groupName(state) {
    return state.groupName
  },
  groupSlug(state) {
    return state.groupSlug
  },
  participantCount(state) {
    return state.participantCount
  },
}
