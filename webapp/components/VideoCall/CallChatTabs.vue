<template>
  <!--
    Tabs in the look of the app's tab navigation — the active one underlined — but one line
    high: the place is the top of a narrow chat, shared with the chat's buttons.

    What can be done with the conference chat is in a toolbar below (CallChatToolbar): the row
    only holds tabs.
  -->
  <div class="call-chat-tabs" role="tablist" :aria-label="$t('videoCall.chatTabs.label')">
    <div
      v-for="tab in tabs"
      :key="tab.value"
      role="presentation"
      :class="['call-chat-tabs__cell', { 'call-chat-tabs__cell--active': tab.value === active }]"
    >
      <button
        ref="tabs"
        v-tooltip="{ content: tab.tooltip, placement: 'bottom', classes: 'tooltip--narrow' }"
        type="button"
        role="tab"
        class="call-chat-tabs__tab"
        :aria-label="tab.title"
        :aria-selected="tab.value === active ? 'true' : 'false'"
        :aria-description="tab.hint"
        :tabindex="tab.value === focusable ? 0 : -1"
        :data-test="'call-chat-tab-' + tab.value"
        @click="select(tab.value)"
        @keydown.left.prevent="step(-1)"
        @keydown.right.prevent="step(1)"
      >
        <!-- What kind of tab it is, at a glance: one of the two chats, or the people. -->
        <os-icon :icon="tab.icon" class="call-chat-tabs__icon" />
        <span class="call-chat-tabs__label">{{ tab.label }}</span>
        <!--
          Unread messages, as the red count the app shows on its icons; how many are in the
          call, in the calm colour.
        -->
        <os-badge
          v-if="tab.count > 0"
          :variant="tab.neutral ? 'default' : 'danger'"
          :count="tab.count"
          :data-test="'call-chat-tab-count-' + tab.value"
        />
      </button>
    </div>
  </div>
</template>

<script>
import { OsBadge, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters, mapMutations } from 'vuex'
import { activeCallChatTab, callChatTarget } from '~/components/VideoCall/callChat'

// The choice between the two chats of a running video call: the conference chat only its
// participants share, and the group's own, which reaches every member. Shown wherever one of
// the two is on screen — in the call's sidebar and in the floating chat window beside the
// parked call — so it reads and writes the stores rather than taking props from either.
export default {
  name: 'CallChatTabs',
  components: { OsBadge, OsIcon },
  props: {
    // Whether the participants of the call are a third tab: in the call's own sidebar, not in
    // the floating chat window beside the parked call, which only ever holds a chat.
    withParticipants: { type: Boolean, default: false },
    // How many people are in the call, for that tab.
    participantCount: { type: Number, default: 0 },
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    ...mapGetters({
      groupId: 'videoCall/groupId',
      chatRoomId: 'videoCall/chatRoomId',
      unread: 'videoCall/conferenceUnread',
      groupUnread: 'videoCall/groupChatUnread',
      chat: 'chat/showChat',
      participantsOpen: 'videoCall/participantsOpen',
    }),
    active() {
      if (this.withParticipants && this.participantsOpen) return 'participants'
      return activeCallChatTab(this.chat, this)
    },
    // The one tab in the tab order, as the tab pattern asks: the active one, else the first.
    focusable() {
      return this.active || this.tabs[0].value
    },
    // Short on the tab, with a symbol for its kind; spelled out in the tooltip, before what it
    // is for.
    tabs() {
      return this.tabList.map((tab) => ({
        ...tab,
        tooltip: `${tab.title} – ${tab.hint}`,
      }))
    },
    tabList() {
      return [
        // The people first: from the call itself, over its own chat, to the chat of the whole
        // group.
        ...(this.withParticipants
          ? [
              {
                value: 'participants',
                label: this.$t('videoCall.chatTabs.participants'),
                title: this.$t('videoCall.chatTabs.participants'),
                icon: this.icons.users,
                hint: this.$t('videoCall.chatTabs.participantsHint'),
                count: this.participantCount,
                neutral: true,
              },
            ]
          : []),
        // Beside the participants, the conference chat's tab waits for the chat: before the
        // server has confirmed the participation it would open the group's chat a second time.
        ...(this.withParticipants && !this.chatRoomId
          ? []
          : [
              {
                value: 'call',
                label: this.$t('videoCall.chatTabs.call'),
                title: this.$t('videoCall.chatTabs.callTitle'),
                icon: this.icons.chatBubble,
                // Held to a narrow tooltip, the hint wraps by itself. The same text is the note
                // above the chat's messages, where it wraps to the chat's width.
                hint: this.$t('videoCall.chatTabs.callHint'),
                count: this.unread,
              },
            ]),
        {
          value: 'group',
          label: this.$t('videoCall.chatTabs.group'),
          title: this.$t('videoCall.chatTabs.groupTitle'),
          icon: this.icons.chatBubble,
          hint: this.$t('videoCall.chatTabs.groupHint'),
          count: this.groupUnread,
        },
      ]
    },
  },
  methods: {
    ...mapMutations({
      openChat: 'chat/SET_OPEN_CHAT',
      setParticipantsOpen: 'videoCall/SET_PARTICIPANTS_OPEN',
    }),
    select(tab) {
      if (tab === 'participants') {
        this.setParticipantsOpen(true)
        return
      }
      this.setParticipantsOpen(false)
      this.openChat(callChatTarget(tab, this))
    },
    // Arrow keys move to the neighbouring tab and open it, wrapping at the ends.
    step(direction) {
      const index = this.tabs.findIndex((tab) => tab.value === this.focusable)
      const next = (index + direction + this.tabs.length) % this.tabs.length
      this.select(this.tabs[next].value)
      this.$nextTick(() => this.$refs.tabs[next]?.focus())
    },
  },
}
</script>

<style scoped>
.call-chat-tabs {
  /*  Fills the row it is put in, to its full height: the underline of the active tab then */
  /*  sits on the row's lower edge, whatever padding the row has around its buttons. */
  flex: 1 1 auto;
  align-self: stretch;
  display: flex;
  min-width: 0;
}

.call-chat-tabs__cell {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  /*  The same three states as the app's tab navigation. */
  border-bottom: 2px solid transparent;
}

.call-chat-tabs__cell:hover {
  border-bottom-color: var(--border-color-soft);
}

.call-chat-tabs__cell--active,
.call-chat-tabs__cell--active:hover {
  border-bottom-color: var(--color-primary);
}

.call-chat-tabs__tab {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xx-small);
  align-self: stretch;
  /*  Hardly any space above and below: the row the tabs are put in sets their height. */
  padding: var(--space-xxx-small) var(--space-xx-small);
  border: 0;
  background: none;
  color: var(--text-color-base);
  font: inherit;
  cursor: pointer;
}

.call-chat-tabs__cell--active .call-chat-tabs__tab {
  font-weight: var(--text-weight-bold);
}

/*  The label gives way when the row gets narrow; the count beside it does not (OsBadge's */
/*  `count` never shrinks). */
.call-chat-tabs__icon {
  flex: 0 0 auto;
}
.call-chat-tabs__label {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.call-chat-tabs__tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
</style>
