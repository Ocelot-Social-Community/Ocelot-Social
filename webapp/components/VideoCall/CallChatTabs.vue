<template>
  <os-toggle-group
    :options="tabs"
    :value="active"
    :label="$t('videoCall.chatTabs.label')"
    @select="select"
  />
</template>

<script>
import { OsToggleGroup } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import { activeCallChatTab, callChatTarget } from '~/components/VideoCall/callChat'

// The choice between the two chats of a running video call: the conference chat only its
// participants share, and the group's own, which reaches every member. Shown wherever one of
// the two is on screen — in the call's sidebar and in the floating chat window beside the
// parked call — so it reads and writes the stores rather than taking props from either.
export default {
  name: 'CallChatTabs',
  components: { OsToggleGroup },
  computed: {
    ...mapGetters({
      groupId: 'videoCall/groupId',
      chatRoomId: 'videoCall/chatRoomId',
      unread: 'videoCall/conferenceUnread',
      chat: 'chat/showChat',
    }),
    active() {
      return activeCallChatTab(this.chat, this)
    },
    tabs() {
      const callLabel = this.$t('videoCall.chatTabs.call')
      return [
        {
          value: 'call',
          label: this.unread > 0 ? `${callLabel} (${this.unread})` : callLabel,
          title: this.$t('videoCall.chatTabs.callHint'),
        },
        {
          value: 'group',
          label: this.$t('videoCall.chatTabs.group'),
          title: this.$t('videoCall.chatTabs.groupHint'),
        },
      ]
    },
  },
  methods: {
    ...mapMutations({
      openChat: 'chat/SET_OPEN_CHAT',
    }),
    select(tab) {
      this.openChat(callChatTarget(tab, this))
    },
  },
}
</script>
