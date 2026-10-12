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
    // The conference chat of the call the user is in: the room only its participants
    // share. Null outside a call, and until the server has confirmed the participation.
    chatRoomId: null,
    // Unread messages in that conference chat. It is kept out of the header's chat badge,
    // so the call shows the number itself: on its chat button and on the "Call" tab.
    conferenceUnread: 0,
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
    // Reset stale count from a previous call so the badge doesn't briefly show
    // another group's participant number before the query/subscription updates.
    state.participantCount = 0
    state.chatRoomId = null
    state.conferenceUnread = 0
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
    state.participantCount = 0
    state.chatRoomId = null
    state.conferenceUnread = 0
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
  SET_CHAT_ROOM_ID(state, roomId) {
    const next = roomId || null
    // Another room, or none: what was unread belongs to the room before.
    if (next !== state.chatRoomId) state.conferenceUnread = 0
    state.chatRoomId = next
  },
  SET_CONFERENCE_UNREAD(state, count) {
    state.conferenceUnread = Number(count) || 0
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
  chatRoomId(state) {
    return state.chatRoomId
  },
  conferenceUnread(state) {
    return state.conferenceUnread
  },
  phase(state) {
    return state.phase
  },
}
