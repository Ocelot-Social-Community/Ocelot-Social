<template>
  <!--
    Tabs in the look of the app's tab navigation — the active one underlined — but one line
    high: the place is the top of a narrow chat, shared with the chat's buttons.

    The underline sits on a cell around each tab, as the cell of the conference chat also
    holds its download button while it is open: the button belongs to that chat, and a
    button cannot sit inside the tab's own.
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
        v-tooltip="{ content: tab.hint, placement: 'bottom', classes: 'tooltip--narrow' }"
        type="button"
        role="tab"
        class="call-chat-tabs__tab"
        :aria-selected="tab.value === active ? 'true' : 'false'"
        :aria-description="tab.hint"
        :tabindex="tab.value === focusable ? 0 : -1"
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
      <!--
        What can be done with the conference chat, behind the app's three dots: calmer
        than a row of icons in the tab, and room for what is still to come.
      -->
      <dropdown
        v-if="exportable && tab.value === 'call' && active === 'call'"
        class="call-chat-tabs__menu"
        placement="bottom-end"
        offset="5"
      >
        <template #default="{ toggleMenu }">
          <os-button
            data-test="call-chat-tab-menu"
            variant="primary"
            appearance="ghost"
            circle
            size="sm"
            :loading="exporting"
            :aria-label="$t('actions.menu')"
            @click.prevent="toggleMenu()"
          >
            <template #icon>
              <os-icon :icon="icons.ellipsisV" />
            </template>
          </os-button>
        </template>
        <template #popover="{ toggleMenu }">
          <os-menu dropdown :routes="callChatActions">
            <template #menuitem="item">
              <os-menu-item
                :route="item.route"
                :parents="item.parents"
                @click.stop.prevent="runAction(item.route, toggleMenu)"
              >
                <os-icon :icon="item.route.icon" />
                {{ item.route.label }}
              </os-menu-item>
            </template>
          </os-menu>
        </template>
      </dropdown>
    </div>
  </div>
</template>

<script>
import { OsBadge, OsButton, OsIcon, OsMenu, OsMenuItem } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Dropdown from '~/components/Dropdown'
import { mapGetters, mapMutations } from 'vuex'
import { activeCallChatTab, callChatTarget } from '~/components/VideoCall/callChat'

// The choice between the two chats of a running video call: the conference chat only its
// participants share, and the group's own, which reaches every member. Shown wherever one of
// the two is on screen — in the call's sidebar and in the floating chat window beside the
// parked call — so it reads and writes the stores rather than taking props from either.
export default {
  name: 'CallChatTabs',
  components: { Dropdown, OsBadge, OsButton, OsIcon, OsMenu, OsMenuItem },
  props: {
    // Whether the conference chat's tab offers its menu, with the chat's download. The
    // download is the chat's own doing, so the host, which holds the chat, does it on
    // `export`.
    exportable: { type: Boolean, default: false },
    // Whether a download asked for is still under way.
    exporting: { type: Boolean, default: false },
  },
  emits: ['export'],
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
    }),
    active() {
      return activeCallChatTab(this.chat, this)
    },
    // The entries of the conference chat's menu. One so far; others, such as who may write,
    // are meant to join it.
    callChatActions() {
      return [
        {
          name: 'export',
          label: this.$t('chat.exportChat'),
          icon: this.icons.download,
          callback: () => this.$emit('export'),
        },
      ]
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
          // Held to a narrow tooltip, the hint wraps by itself. The same text is the note
          // above the chat's messages, where it wraps to the chat's width.
          hint: this.$t('videoCall.chatTabs.callHint'),
          count: this.unread,
        },
        {
          value: 'group',
          label: this.$t('videoCall.chatTabs.group'),
          hint: this.$t('videoCall.chatTabs.groupHint'),
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
    runAction(action, toggleMenu) {
      action.callback()
      toggleMenu()
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
  border-bottom-color: var(--color-neutral-70);
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
  padding: var(--space-x-small) var(--space-xx-small);
  border: 0;
  background: none;
  color: var(--text-color-base);
  font: inherit;
  cursor: pointer;
}

.call-chat-tabs__cell--active .call-chat-tabs__tab {
  font-weight: var(--text-weight-bold);
}

.call-chat-tabs__menu {
  flex-shrink: 0;
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

.call-chat-tabs__tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
</style>
