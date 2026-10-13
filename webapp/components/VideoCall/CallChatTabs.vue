<template>
  <!--
    Tabs in the look of the app's tab navigation — the active one underlined — but one line
    high: the place is the top of a narrow chat, shared with the chat's buttons.
  -->
  <div class="call-chat-tabs" role="tablist" :aria-label="$t('videoCall.chatTabs.label')">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      ref="tabs"
      type="button"
      role="tab"
      :class="['call-chat-tabs__tab', { 'call-chat-tabs__tab--active': tab.value === active }]"
      :aria-selected="tab.value === active ? 'true' : 'false'"
      :tabindex="tab.value === focusable ? 0 : -1"
      :title="tab.title"
      :data-test="'call-chat-tab-' + tab.value"
      @click="select(tab.value)"
      @keydown.left.prevent="step(-1)"
      @keydown.right.prevent="step(1)"
    >
      <span class="call-chat-tabs__label">{{ tab.label }}</span>
      <!-- Unread messages, as the red count the app shows on its icons. -->
      <os-badge
        v-if="tab.count > 0"
        variant="danger"
        class="call-chat-tabs__count"
        :data-test="'call-chat-tab-count-' + tab.value"
      >
        {{ tab.count > 99 ? '99+' : tab.count }}
      </os-badge>
    </button>
  </div>
</template>

<script>
import { OsBadge } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import { activeCallChatTab, callChatTarget } from '~/components/VideoCall/callChat'

// The choice between the two chats of a running video call: the conference chat only its
// participants share, and the group's own, which reaches every member. Shown wherever one of
// the two is on screen — in the call's sidebar and in the floating chat window beside the
// parked call — so it reads and writes the stores rather than taking props from either.
export default {
  name: 'CallChatTabs',
  components: { OsBadge },
  computed: {
    ...mapGetters({
      groupId: 'videoCall/groupId',
      chatRoomId: 'videoCall/chatRoomId',
      unread: 'videoCall/conferenceUnread',
      groupUnread: 'videoCall/groupChatUnread',
      chat: 'chat/showChat',
    }),
    active() {
      return activeCallChatTab(this.chat, this)
    },
    // The one tab in the tab order, as the tab pattern asks: the active one, else the first.
    focusable() {
      return this.active || this.tabs[0].value
    },
    tabs() {
      return [
        {
          value: 'call',
          label: this.$t('videoCall.chatTabs.call'),
          title: this.$t('videoCall.chatTabs.callHint'),
          count: this.unread,
        },
        {
          value: 'group',
          label: this.$t('videoCall.chatTabs.group'),
          title: this.$t('videoCall.chatTabs.groupHint'),
          count: this.groupUnread,
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

.call-chat-tabs__tab {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xx-small);
  padding: var(--space-x-small) var(--space-xx-small);
  border: 0;
  /*  The same three states as the app's tab navigation. */
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-color-base);
  font: inherit;
  cursor: pointer;
}

/*  The label gives way when the row gets narrow; the count beside it does not. */
.call-chat-tabs__label {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*  OsBadge is a pill made for words. For a count it is drawn in to a circle around one */
/*  digit — as wide as it is high, both set, as the badge's own box does not include its */
/*  padding in a width — and grows sideways with more. `::v-deep`, because the badge's */
/*  root carries no scoped-style attribute of this component. */
.call-chat-tabs__tab ::v-deep .call-chat-tabs__count {
  flex: 0 0 auto;
  box-sizing: border-box;
  justify-content: center;
  min-width: 1.7em;
  height: 1.7em;
  /*  `!important`, because no selector written here outranks the badge's own padding: */
  /*  the app's build lifts every utility class of the UI library to the weight of an id */
  /*  (`.px-\[0\.8em\]:not(#\#)`, the cascade-layers polyfill), so the pill's padding */
  /*  won against this rule and the count stayed wider than high. */
  padding: 0 0.45em !important;
  line-height: 1;
  font-weight: var(--text-weight-bold);
}

.call-chat-tabs__tab:hover {
  border-bottom-color: var(--color-neutral-70);
}

.call-chat-tabs__tab--active,
.call-chat-tabs__tab--active:hover {
  border-bottom-color: var(--color-primary);
  font-weight: var(--text-weight-bold);
}

.call-chat-tabs__tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
</style>
