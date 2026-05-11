export const state = () => {
  return {
    enabled: false,
    showVideoCall: false,
    minimized: false,
    groupId: null,
    groupName: null,
    groupSlug: null,
    groupAvatar: null,
    participantCount: 0,
    // 'idle' | 'prejoin' | 'connecting' | 'in-call' — mirrors VideoCall's local
    // phase so the layout can decide where the chat lives.
    phase: 'idle',
  }
}

export const mutations = {
  SET_ENABLED(state, enabled) {
    state.enabled = !!enabled
  },
  OPEN(state, { groupId, groupName, groupSlug, groupAvatar }) {
    state.showVideoCall = true
    state.minimized = false
    state.groupId = groupId
    state.groupName = groupName || null
    state.groupSlug = groupSlug || null
    state.groupAvatar = groupAvatar || null
  },
  // Update group info post-hoc (e.g. after fetching by ID for a direct URL).
  SET_GROUP_INFO(state, { groupId, groupName, groupSlug, groupAvatar }) {
    if (!groupId || state.groupId !== groupId) return
    if (groupName !== undefined) state.groupName = groupName || null
    if (groupSlug !== undefined) state.groupSlug = groupSlug || null
    if (groupAvatar !== undefined) state.groupAvatar = groupAvatar || null
  },
  CLOSE(state) {
    state.showVideoCall = false
    state.minimized = false
    state.groupId = null
    state.groupName = null
    state.groupSlug = null
    state.groupAvatar = null
    state.phase = 'idle'
  },
  SET_MINIMIZED(state, minimized) {
    state.minimized = !!minimized
  },
  SET_PHASE(state, phase) {
    state.phase = phase || 'idle'
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
  groupAvatar(state) {
    return state.groupAvatar
  },
  participantCount(state) {
    return state.participantCount
  },
  phase(state) {
    return state.phase
  },
}
