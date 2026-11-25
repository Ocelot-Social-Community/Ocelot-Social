<template>
  <!--
    Tabs in the look of the app's tab navigation — the active one underlined — but one line
    high: the place is the top of a narrow chat, shared with the chat's buttons.

    What can be done with the conference chat is in a toolbar below (CallChatToolbar): the row
    only holds tabs.
  -->
  <div
    class="call-chat-tabs"
    role="tablist"
    :aria-label="$t('videoCall.chatTabs.label')"
    :style="{ '--call-chat-tabs-others': othersLeastWidth }"
  >
    <div
      v-for="tab in tabs"
      :key="tab.value"
      role="presentation"
      :class="[
        'call-chat-tabs__cell',
        {
          'call-chat-tabs__cell--active': tab.value === active,
          'call-chat-tabs__cell--counted': tab.count > 0,
          'call-chat-tabs__cell--compact': compact.includes(tab.value),
        },
      ]"
    >
      <!--
        What the tab holds, unseen, with the title in bold as when open: it gives the cell the
        width the tab asks for. The tab itself lies over it and fills the cell, whatever is left
        of its title then.
      -->
      <span ref="sizers" class="call-chat-tabs__sizer" aria-hidden="true" :data-tab="tab.value">
        <os-icon :icon="tab.icon" class="call-chat-tabs__icon" />
        <span class="call-chat-tabs__label">{{ tab.label }}</span>
        <os-badge v-if="tab.count > 0" :count="tab.count" />
      </span>
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
        <!--
          The title, cut with "…" as the tab gets narrow; below a least width, gone, the symbol
          (and count) alone, in the middle.
        -->
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

// How much of a title a tab shows at the least, in em of its font; a shorter one whole.
const TITLE_LEAST_EM = 3

// Whether a tab of `room` px shows its title: `whole` is what it holds with all of the title,
// `title` the title's own width. Without the title it needs whole - title; with it, at least
// the least of the title, or all of a shorter one.
export const titleFits = ({ room, whole, title, least }) =>
  room >= whole - title + Math.min(title, least)

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
  data() {
    return {
      // The tabs too narrow for what is the least of their title: their symbol (and count) alone.
      compact: [],
    }
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    // Each cell's width against what its unseen copy holds. Hiding a title changes no cell's
    // width (the copy keeps it), so this settles at once.
    if (typeof ResizeObserver === 'undefined') return
    this.cellObserver = new ResizeObserver(() => this.fitTitles())
    this.observeCells()
  },
  updated() {
    this.observeCells()
  },
  beforeDestroy() {
    if (this.cellObserver) this.cellObserver.disconnect()
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
    // How much room the tabs beside the open one take at the least, each down to its symbol (and
    // count): the open one may take all the rest before its title is cut.
    othersLeastWidth() {
      const others = this.tabs.filter((tab) => tab.value !== this.active)
      const counted = others.filter((tab) => tab.count > 0).length
      const plain = others.length - counted
      return `calc(var(--call-chat-tab-least) * ${plain} + var(--call-chat-tab-least-counted) * ${counted})`
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
                // The chat of the call: the call's camera, a speech bubble before it.
                icon: this.icons.videoChat,
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
    observeCells() {
      if (!this.cellObserver) return
      this.cellObserver.disconnect()
      ;(this.$refs.sizers || []).forEach((sizer) => this.cellObserver.observe(sizer.parentElement))
    },
    // A title is shown while its tab has room for at least the least of it — all of a short one,
    // some 3em of a longer one, cut with "…" — and otherwise not at all: the symbol alone.
    fitTitles() {
      const compact = []
      // By the tab each copy stands for: Vue 2 keeps no order in a list of refs once it re-renders.
      ;(this.$refs.sizers || []).forEach((sizer) => {
        const label = sizer.querySelector('.call-chat-tabs__label')
        const tab = this.tabs.find(({ value }) => value === sizer.dataset.tab)
        if (!label || !tab || !sizer.isConnected) return
        const fontSize = parseFloat(getComputedStyle(label).fontSize) || 16
        if (
          !titleFits({
            room: sizer.parentElement.clientWidth,
            whole: sizer.offsetWidth,
            title: label.offsetWidth,
            least: TITLE_LEAST_EM * fontSize,
          })
        ) {
          compact.push(tab.value)
        }
      })
      if (compact.join() !== this.compact.join()) this.compact = compact
    },
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
  min-width: 0;
  /*  Each tab as wide as its title asks; room beyond what all need is shared out evenly, so */
  /*  the tabs fill the row. Short of room, the open tab comes first: the others give way, down */
  /*  to their symbol (and count), before it is cut (see the cells). */
  display: flex;
  /*  A tab at its least: its symbol and the space beside it; with a count, that as well. */
  --call-chat-tab-least: calc(1.2em + 2 * var(--space-x-small));
  --call-chat-tab-least-counted: calc(var(--call-chat-tab-least) + var(--space-xx-small) + 1.75em);
}

.call-chat-tabs__cell {
  /*  Giving way in proportion to their titles, down to their symbol. */
  flex: 1 1 auto;
  min-width: var(--call-chat-tab-least);
  position: relative;
  display: flex;
  overflow: hidden;
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

.call-chat-tabs__cell--counted {
  min-width: var(--call-chat-tab-least-counted);
}

/*  The open tab does not give way; it takes at most what the others leave at their least, and */
/*  only beyond that is its title cut. */
.call-chat-tabs__cell--active {
  flex-shrink: 0;
  max-width: calc(100% - var(--call-chat-tabs-others));
}

/*  The sizer and the tab hold the same, laid out alike. */
.call-chat-tabs__sizer,
.call-chat-tabs__tab {
  display: flex;
  align-items: center;
  gap: var(--space-xx-small);
  /*  Hardly any space above and below: the row the tabs are put in sets their height. Beside, */
  /*  enough that two tabs never run into each other. */
  padding: var(--space-xxx-small) var(--space-x-small);
}

.call-chat-tabs__sizer {
  flex: 0 0 auto;
  visibility: hidden;
  font-weight: var(--text-weight-bold);
}

.call-chat-tabs__tab {
  position: absolute;
  inset: 0;
  justify-content: center;
  border: 0;
  background: none;
  color: var(--text-color-base);
  font: inherit;
  cursor: pointer;
}

.call-chat-tabs__cell--active .call-chat-tabs__tab {
  font-weight: var(--text-weight-bold);
}

/*  The title gives way when the row gets narrow; the symbol and the count beside it do not */
/*  (OsBadge's `count` never shrinks). */
.call-chat-tabs__icon {
  flex: 0 0 auto;
}
.call-chat-tabs__label {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*  Too narrow for the least of its title: no "…" with a letter or two, the symbol alone. */
.call-chat-tabs__cell--compact .call-chat-tabs__tab .call-chat-tabs__label {
  display: none;
}

.call-chat-tabs__tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
</style>
