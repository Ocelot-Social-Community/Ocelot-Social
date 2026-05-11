export const state = () => {
  return {
    enabled: false,
    showVideoCall: false,
    minimized: false,
    groupId: null,
    participantCount: 0,
  }
}

export const mutations = {
  SET_ENABLED(state, enabled) {
    state.enabled = !!enabled
  },
  OPEN(state, { groupId }) {
    state.showVideoCall = true
    state.minimized = false
    state.groupId = groupId
  },
  CLOSE(state) {
    state.showVideoCall = false
    state.minimized = false
    state.groupId = null
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
  participantCount(state) {
    return state.participantCount
  },
}
