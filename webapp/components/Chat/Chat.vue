<template>
  <vue-advanced-chat
    :current-user-id="currentUser.id"
    :room-id="activeRoomId"
    :template-actions="EMPTY_ACTIONS"
    :menu-actions="EMPTY_ACTIONS"
    :text-messages="JSON.stringify(textMessages)"
    :message-actions="EMPTY_ACTIONS"
    :messages="JSON.stringify(messages)"
    :messages-loaded="messagesLoaded"
    :rooms="JSON.stringify(displayedRooms)"
    :room-actions="EMPTY_ACTIONS"
    :rooms-loaded="roomsLoaded"
    :loading-rooms="loadingRooms"
    :media-preview-enabled="isSafari ? 'false' : 'true'"
    show-files="true"
    show-audio="true"
    capture-files="true"
    :height="chatHeight"
    :styles="JSON.stringify(computedChatStyle)"
    :show-footer="selectedRoomWritable ? 'true' : 'false'"
    :responsive-breakpoint="600"
    :single-room="singleRoom"
    show-reaction-emojis="false"
    custom-search-room-enabled="true"
    textarea-auto-focus="false"
    :room-message="roomMessage"
    @send-message="sendMessage($event.detail[0])"
    @typing-message="draftTyped($event.detail[0])"
    @open-failed-message="sendAgain($event.detail[0])"
    @fetch-messages="fetchMessages($event.detail[0])"
    @fetch-more-rooms="fetchMoreRooms"
    @search-room="searchRooms($event.detail[0])"
    @add-room="toggleUserSearch"
    @open-user-tag="redirectToUserProfile($event.detail[0])"
    @open-file="openFile($event.detail[0].file.file)"
  >
    <div v-if="selectedRoom && selectedRoom.roomId" slot="room-options" class="chat-room-options">
      <div v-if="singleRoom || selectedRoom.isCallRoom" class="chat-room-options__buttons">
        <os-button
          v-if="selectedRoom.isCallRoom"
          variant="primary"
          appearance="outline"
          circle
          size="sm"
          :loading="exporting"
          :aria-label="$t('chat.exportChat')"
          :title="$t('chat.exportChat')"
          @click="exportRoom"
        >
          <template #icon>
            <os-icon :icon="icons.download" />
          </template>
        </os-button>
        <!-- No larger view for a call's conference chat: it is reached from the call only. -->
        <os-button
          v-if="singleRoom && !selectedRoom.isCallRoom"
          as="nuxt-link"
          :to="expandChatLink"
          variant="primary"
          appearance="outline"
          circle
          size="sm"
          :aria-label="$t('chat.expandChat')"
        >
          <template #icon>
            <os-icon :icon="icons.expand" />
          </template>
        </os-button>
        <os-button
          v-if="singleRoom"
          variant="primary"
          appearance="outline"
          circle
          size="sm"
          :aria-label="$t('chat.closeChat')"
          @click="$emit('close-single-room', true)"
        >
          <template #icon>
            <os-icon :icon="icons.close" />
          </template>
        </os-button>
      </div>
    </div>

    <div slot="room-header-avatar">
      <component
        :is="roomHeaderLink ? 'nuxt-link' : 'span'"
        :to="roomHeaderLink"
        class="chat-header-profile-link"
      >
        <avatar-image
          v-if="selectedRoom"
          :profile="selectedRoomProfile"
          size="small"
          class="vac-avatar-profile vac-avatar-profile--header"
        />
      </component>
    </div>

    <div slot="room-header-info" class="chat-room-header-info">
      <div class="vac-room-name vac-text-ellipsis">
        <room-title-link
          :name="selectedRoomTitle"
          :to="roomHeaderLink"
          :show-group-icon="!!(selectedRoom && selectedRoom.isGroupRoom)"
        />
      </div>
    </div>

    <div
      v-for="room in groupRooms"
      :slot="'room-list-info_' + room.roomId"
      :key="'info-' + room.id"
    >
      <div class="vac-room-name vac-text-ellipsis room-name-with-icon">
        <os-icon :icon="icons.group" class="room-group-icon" />
        {{ room.roomName }}
      </div>
    </div>

    <div v-for="room in rooms" :slot="'room-list-avatar_' + room.id" :key="room.id">
      <avatar-image
        :profile="room.isGroupRoom ? room.groupProfile : room.userProfile"
        class="vac-avatar-profile"
      />
    </div>

    <!-- The room list's field filters the rooms by name: the filter's icon, not a search. -->
    <os-icon slot="search-icon" :icon="icons.filter" class="chat-rooms-filter-icon" />

    <template v-for="msg in messages">
      <avatar-image
        v-if="msg.avatar"
        :slot="'message-avatar_' + msg._id"
        :key="'avatar-' + msg._id"
        :profile="messageUserProfile(msg.senderId)"
        class="vac-message-avatar"
        style="align-self: flex-end; margin: 0 0 2px; cursor: pointer"
        @click.native="navigateToUserProfile(msg.senderId)"
      />
    </template>
  </vue-advanced-chat>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import RoomTitleLink from '~/components/_new/generic/RoomTitleLink/RoomTitleLink'
import locales from '~/locales/index.js'
import {
  roomQuery,
  createGroupRoom,
  saveRoomDraft,
  addRoomDraftFile,
  removeRoomDraftFile,
  unreadRoomsQuery,
  userProfileQuery,
} from '~/graphql/Rooms'
import {
  messageQuery,
  createMessageMutation,
  chatMessageAdded,
  chatMessageStatusUpdated,
  markMessagesAsSeen,
} from '~/graphql/Messages'
import chatStyle from '~/constants/chat.js'
import { findMessageField } from './messageField'
import {
  clearUnsavedDraft,
  isLatestDraftRevision,
  newDraftRevision,
  queueDraftWork,
  setUnsavedDraft,
  unsavedDraft,
  unsavedDraftRoomIds,
  goneDraftFiles,
  setGoneDraftFiles,
  markDraftFileRemoved,
  isDraftFileRemoved,
} from './unsavedDrafts'
import { createTooltip, destroyTooltip } from 'v-tooltip'
import { findLibraryComponent } from './libraryComponent'
import { mapGetters, mapMutations } from 'vuex'

const EMPTY_ACTIONS = JSON.stringify([])
// The app's info-circle and close icons, as paths: the hint lives inside the chat library's
// markup, where no component of the app can be put.
const INFO_ICON_PATH =
  'M16 3c7.168 0 13 5.832 13 13s-5.832 13-13 13-13-5.832-13-13 5.832-13 13-13zM16 5c-6.087 0-11 4.913-11 11s4.913 11 11 11 11-4.913 11-11-4.913-11-11-11zM15 10h2v2h-2v-2zM15 14h2v8h-2v-8z'
const CLOSE_ICON_PATH =
  'M7.219 5.781l8.781 8.781 8.781-8.781 1.438 1.438-8.781 8.781 8.781 8.781-1.438 1.438-8.781-8.781-8.781 8.781-1.438-1.438 8.781-8.781-8.781-8.781z'
// The library's arrow down on its button to the newest message, turned up: the button to the
// oldest unread message above mirrors it (renderUnreadAbove).
const ARROW_UP_ICON_PATH = 'M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z'
// Room left above the oldest unread message once it is jumped to: what was said before it.
const UNREAD_JUMP_MARGIN = 48
// The most pages of older messages loaded to reach it, as a stop for a count that is off.
const UNREAD_JUMP_MAX_PAGES = 50
const ROOM_PAGE_SIZE = 10
const MESSAGE_PAGE_SIZE = 20
const EXPORT_PAGE_SIZE = 100
// How long the exported file's blob URL is kept after the download was asked for.
const EXPORT_URL_RELEASE_MS = 1000
// What belongs to the message above it in an exported chat is set in by this much: the
// further lines of a message written over several, and its attachments.
const EXPORT_INDENT = '    '
// How long typing has to rest before what was typed is kept as the room's draft. Leaving the
// room, closing the chat and leaving the page keep it at once.
const DRAFT_SAVE_DELAY_MS = 1000
// As much of a draft as the room list shows, like the last message there.
const DRAFT_PREVIEW_LENGTH = 30
// How often, and how far apart, a room's draft looks for the message field showing that room
// before it gives up putting back its files and mentions (see whenFieldShows).
const FIELD_TRIES = 20
const FIELD_RETRY_MS = 50

export default {
  name: 'Chat',
  components: { OsButton, OsIcon, AvatarImage, RoomTitleLink },
  props: {
    singleRoom: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: String,
      default: null,
    },
    groupId: {
      type: String,
      default: null,
    },
    // A room opened by its id — the conference chat of a video call, which belongs to
    // neither one user nor the group as a whole.
    roomId: {
      type: String,
      default: null,
    },
    // Whether opening a room puts the cursor into the message field. Off where that would
    // be unwelcome: on a phone it brings up the keyboard over what one came to read.
    autoFocus: {
      type: Boolean,
      default: true,
    },
    // Height in px that something above the chat takes inside the floating chat window —
    // the tab row beside a parked video call. The chat gives up that much, so the window
    // keeps its place below the page header.
    reservedHeight: {
      type: Number,
      default: 0,
    },
    // Leaves out the room's header — avatar, name and the room's buttons. For a host that
    // already says which room this is and offers the buttons itself: the video call does
    // both in its own header and tab row, right above the chat.
    hideHeader: {
      type: Boolean,
      default: false,
    },
    // A hint shown above the messages when the chat opens, until it is dismissed with its X
    // (for as long as the page is not reloaded). Line breaks in the text are kept. `hintKey`
    // names the hint for that dismissal: a hint with the same key stays away in every chat.
    hint: {
      type: String,
      default: null,
    },
    hintKey: {
      type: String,
      default: null,
    },
    // When true the chat fills its parent container instead of using the
    // chat-modul's viewport-based height calc. Used by the in-call sidebar.
    fitParent: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      EMPTY_ACTIONS,
      rooms: [],
      roomsLoaded: false,
      roomCursor: null,
      roomSearch: '',
      roomObserverDirty: false,
      selectedRoom: null,
      activeRoomId: null,
      loadingRooms: true,
      messagesLoaded: false,
      oldestLoadedIndexId: null,
      messages: [],
      unseenMessageIds: new Set(),
      // Unread messages above the part of the room shown (countUnreadAbove), and whether the
      // button to them is on its way there.
      unreadAbove: 0,
      jumpingToUnread: false,
      pendingStatusUpdates: {},
      exporting: false,
      // The drafts known per room id, as last kept — they override the `draft` a room came
      // with. What is being typed right now is not in here (see draftTyped).
      drafts: {},
      // The files of the drafts, per room id, as known on the server — they override the
      // `draftFiles` a room came with.
      draftFiles: {},
      // The text the message field is to show for the room opened (vue-advanced-chat's
      // `room-message`): its draft. Set when another room is opened, never while typing.
      roomMessage: null,
    }
  },
  created() {
    this.icons = iconRegistry
    // How often another room has been opened; see fetchMessages.
    this.roomSwitches = 0
    // Conference chats a message arrived for while not in the list; see chatMessageAdded.
    this.callRoomIds = new Set()
    // Typed, and not kept yet, per room id — the text, the people picked to mention in it, the
    // files attached; and its timer. The saves go one after the other (queueDraftSave).
    this._typed = {}
    this._typedMentions = {}
    this._typedFiles = {}
    this._draftTimers = {}
    // The addresses of draft files whose removal is under way (removeDraftFiles).
    this._removing = new Set()
    // The files last seen in the field per room, kept with the draft or not.
    this._fieldFiles = {}
    // The latest save of a room's draft asked for, per room id, as { text }: sent again with
    // `keepalive` when the page is left while it is under way, as its request may be cut off.
    // An object of its own per save, so an earlier save of the same text does not take it.
    this._savingText = {}
    // Set while the page is left: saves asked for then go out at once, with `keepalive`.
    this._leaving = false
    // The message field's inside (messageField.js), and the room whose draft it has been given:
    // until then, its changes are the library's own, emptying it for another room.
    this._field = null
    this._fieldRoom = null
    this._showing = null
    // Messages that could not be sent, by their local id: shown as failed, to be sent again.
    this._unsent = {}
    // The room a direct conversation begun here got, by the id it was shown with until then:
    // a message sent there before may fail only after another one opened the room.
    this._realRoomOf = {}
    // Unread messages that came in while their room was open. The room's unread count leaves
    // them out (chatMessageAdded), so they are neither counted against it nor taken off it.
    this._arrivedUnseen = new Set()
    // Counts the openings of one room (newRoom, newGroupRoom, openRoom): an answer for an
    // opening that a later one has replaced selects nothing (beginOpening).
    this._openingGeneration = 0
  },
  watch: {
    draftLabelCss() {
      this.renderDraftLabels()
    },
    groupId(newGroupId) {
      if (this.singleRoom && newGroupId) {
        this.newGroupRoom(newGroupId)
      }
    },
    userId(newUserId) {
      if (this.singleRoom && newUserId) {
        this.newRoom(newUserId)
      }
    },
    roomId(newRoomId) {
      if (this.singleRoom && newRoomId) {
        this.openRoom(newRoomId)
      }
    },
    showHint() {
      this.renderHint()
    },
    // For a host that offers something depending on it — the download in a call's menu says
    // when there is nothing to download.
    knownEmpty(empty) {
      this.$emit('empty-change', empty)
    },
    hint() {
      this.renderHint()
    },
    // What the button to the unread messages above counts changes with the messages, the
    // room's unread count, and the room open.
    messages() {
      this.scheduleUnreadAbove()
    },
    rooms() {
      this.scheduleUnreadAbove()
    },
    selectedRoom() {
      this.scheduleUnreadAbove()
    },
    // The host can start or stop bringing its own header while this chat stays the same —
    // beside a video call, once the call's conference chat is confirmed. The styles that
    // take the built-in header out are written once, so they are written anew.
    hideHeader() {
      this._shadowStyle?.remove()
      this._shadowStyle = null
      this._shadowStylesInjected = false
      this.injectShadowStyles()
    },
    currentLocaleIso() {
      this.messages = this.messages.map((m) => {
        this.formatMessageDate(m)
        return { ...m }
      })
    },
  },
  mounted() {
    if (this.singleRoom && this.roomId) {
      this.openRoom(this.roomId)
    } else if (this.singleRoom && this.groupId) {
      this.newGroupRoom(this.groupId)
    } else if (this.singleRoom && this.userId) {
      this.newRoom(this.userId)
    } else {
      this.fetchRooms()
    }

    // Not left to the first batch of messages (see setupMessageVisibilityTracking): a
    // header that is to be left out must not show until then.
    this.$nextTick(() => {
      this.injectShadowStyles()
      this.renderHint()
    })

    // Subscriptions
    this._subscriptions = []

    const messageObserver = this.$apollo.subscribe({ query: chatMessageAdded() })
    const messageSub = messageObserver.subscribe({
      next: this.chatMessageAdded,
      error: (error) => this.$toastBackendError(error),
    })
    this._subscriptions.push(messageSub)

    const statusObserver = this.$apollo.subscribe({ query: chatMessageStatusUpdated() })
    const statusSub = statusObserver.subscribe({
      next: this.handleMessageStatusUpdated,
    })
    this._subscriptions.push(statusSub)

    // Leaving the page keeps what was typed, as far as the browser still lets the request go.
    window.addEventListener('pagehide', this.keepDraftsOnLeaving)
    // Drafts whose save failed, maybe after a chat closed before: saved again now.
    unsavedDraftRoomIds(this.currentUser.id).forEach((roomId) => this.keepDraft(roomId))
  },
  beforeDestroy() {
    // The chat is taken down — closed, or swapped for the participant list of a call: what
    // was typed is kept, to be there again when the room is opened anew.
    window.removeEventListener('pagehide', this.keepDraftsOnLeaving)
    this.keepAllDrafts()
    // A jump to the oldest unread message under way goes no further (jumpToOldestUnread).
    this._destroyed = true
    if (this._unreadAboveFrame) cancelAnimationFrame(this._unreadAboveFrame)
    this._scrollContainer?.removeEventListener?.('scroll', this.scheduleUnreadAbove)
    this.removeUnreadAbove()
    this._subscriptions?.forEach((s) => s.unsubscribe())
    if (this._intersectionObserver) this._intersectionObserver.disconnect()
    if (this._roomLoaderObserver) this._roomLoaderObserver.disconnect()
    if (this._mutationObserver) this._mutationObserver.disconnect()
    if (this._seenFlushTimer) clearTimeout(this._seenFlushTimer)
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
      videoCallShown: 'videoCall/showVideoCall',
      videoCallMinimized: 'videoCall/minimized',
      dismissedHints: 'chat/dismissedHints',
    }),
    showHint() {
      return !!this.hint && !(this.dismissedHints || []).includes(this.hintKey || this.hint)
    },
    chatHeight() {
      // When embedded in another container (e.g. video-call sidebar), let the
      // parent dictate the size.
      if (this.fitParent) return '100%'
      if (this.singleRoom) {
        // The chat-modul sits at bottom: 45px normally. When a minimized
        // video call is parked above the footer, the chat-modul shifts up to
        // bottom: 333px (45 + 280 + 8) — clamp the chat height so it stays
        // below the page header instead of running off the top of the viewport.
        if (this.videoCallShown && this.videoCallMinimized) {
          return `calc(100dvh - ${420 + this.reservedHeight}px)`
        }
        return `calc(100dvh - ${190 + this.reservedHeight}px)`
      }
      return '100%'
    },
    computedChatStyle() {
      return chatStyle.STYLE
    },
    isSafari() {
      return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    },
    currentLocaleIso() {
      const code = this.$i18n.locale()
      const locale = locales.find((l) => l.code === code)
      return locale ? locale.iso : 'en-US'
    },
    expandChatLink() {
      if (!this.selectedRoom) return { name: 'chat' }
      const query = {}
      if (this.selectedRoom.isGroupRoom && this.selectedRoom.groupProfile?.id) {
        query.groupId = this.selectedRoom.groupProfile.id
      } else {
        const otherUser = this.selectedRoom.users?.find((u) => u.id !== this.currentUser.id)
        if (otherUser) query.userId = otherUser.id
      }
      return { name: 'chat', query }
    },
    groupRooms() {
      return this.rooms.filter((r) => r.isGroupRoom)
    },
    displayedRooms() {
      // Cap unreadCount at "99+" for display; internal state stays numeric for arithmetic
      return this.rooms.map((r) => {
        const room =
          typeof r.unreadCount === 'number' && r.unreadCount > 99 ? { ...r, unreadCount: '99+' } : r
        // A room left with a draft says so in place of its last message, as messengers do:
        // its text, or the names of its files. Not the room open: its draft is in the field.
        if (r.id === this.selectedRoom?.id) return room
        const draft = this.untagged(r.id, this.draftOf(r.id)).text.trim()
        const files = this.draftFilesOf(r.id)
        if (!draft && !files.length) return room
        const text = draft || files.map((file) => this.fileNameOf(file)).join(', ')
        return {
          ...room,
          // Marked "Draft:" before the text, in a colour of its own (draftLabelCss).
          _hasDraft: true,
          lastMessage: {
            ...room.lastMessage,
            content: text.substring(0, DRAFT_PREVIEW_LENGTH),
            // Nobody's message: no sender's name before it, no ticks after it.
            senderId: null,
            username: null,
            files: [],
            deleted: false,
          },
        }
      })
    },
    // The room list draws the last message as plain text, out of reach of the app's components:
    // "Draft:" goes before it through the stylesheet, by the room's id the list gives its entry.
    draftLabelCss() {
      const label = JSON.stringify(this.$t('chat.draft'))
      return this.displayedRooms
        .filter((room) => room._hasDraft)
        .map(
          (room) =>
            `.vac-room-item[id=${JSON.stringify(String(room.roomId))}] .vac-text-last::before { content: ${label}; color: var(--chat-draft-label-color); margin-right: 0.25em; flex-shrink: 0; }`,
        )
        .join('\n')
    },
    selectedRoomProfile() {
      if (!this.selectedRoom) return null
      return this.selectedRoom.isGroupRoom
        ? this.selectedRoom.groupProfile
        : this.selectedRoom.userProfile
    },
    roomHeaderLink() {
      if (!this.selectedRoom) return null
      if (this.selectedRoom.isGroupRoom && this.selectedRoom.groupProfile?.id) {
        const { id, slug } = this.selectedRoom.groupProfile
        return `/groups/${encodeURIComponent(id)}/${encodeURIComponent(slug)}`
      }
      const otherUser = this.selectedRoom.users?.find((u) => u.id !== this.currentUser.id)
      if (otherUser) {
        const slug = otherUser.name?.toLowerCase().replaceAll(' ', '-')
        return `/profile/${encodeURIComponent(otherUser.id)}/${encodeURIComponent(slug)}`
      }
      return null
    },
    selectedRoomTitle() {
      if (!this.selectedRoom) return ''
      // A call's conference chat carries the group's name; say which of the two chats it is.
      return this.selectedRoom.isCallRoom
        ? this.$t('chat.callRoomName', { name: this.selectedRoom.roomName })
        : this.selectedRoom.roomName
    },
    // Known to hold no message at all: every message is loaded, and there is none. Not just
    // "none loaded yet", which a chat whose older messages are still to come would also be.
    knownEmpty() {
      return (
        !!this.selectedRoom?.id &&
        !this.selectedRoom.id.startsWith('temp-') &&
        this.messagesLoaded &&
        this.messages.length === 0
      )
    },
    selectedRoomWritable() {
      // Only the conference chat of a video call that is over is read-only.
      return !this.selectedRoom || this.selectedRoom.isWritable !== false
    },
    textMessages() {
      return {
        ROOMS_EMPTY: this.$t('chat.roomsEmpty'),
        ROOM_EMPTY: this.$t('chat.roomEmpty'),
        NEW_MESSAGES: this.$t('chat.newMessages'),
        MESSAGE_DELETED: this.$t('chat.messageDeleted'),
        MESSAGES_EMPTY:
          this.selectedRoom && this.selectedRoom.isCallRoom
            ? this.$t('chat.callRoomEmpty')
            : this.$t('chat.messagesEmpty'),
        CONVERSATION_STARTED: this.$t('chat.conversationStarted'),
        TYPE_MESSAGE: this.$t('chat.typeMessage'),
        SEARCH: this.$t('chat.search'),
        IS_ONLINE: this.$t('chat.isOnline'),
        LAST_SEEN: this.$t('chat.lastSeen'),
        IS_TYPING: this.$t('chat.isTyping'),
        CANCEL_SELECT_MESSAGE: this.$t('chat.cancelSelectMessage'),
      }
    },
  },
  methods: {
    ...mapMutations({
      commitUnreadRoomCount: 'chat/UPDATE_ROOM_COUNT',
      dismissHint: 'chat/DISMISS_HINT',
    }),

    // The hint floats above the messages, inside the chat library's own markup: the library
    // offers no place there to put anything into, so it is added to its message column from
    // outside, as the styles in injectShadowStyles are. Called again whenever the column may
    // have been drawn anew (a room opened) and whenever the hint changes or is dismissed.
    renderHint() {
      const shadowRoot = this.$el?.shadowRoot
      // Only real elements count: whatever else answers to a selector is not markup to add to.
      const find = (selector) => {
        const node = shadowRoot?.querySelector?.(selector)
        return node instanceof Element ? node : null
      }
      const column = find('.vac-col-messages')
      const existing = find('.chat-hint')
      if (!this.showHint) {
        existing?.remove()
        return
      }
      if (!column) return
      if (existing && existing.parentNode === column) {
        existing.querySelector('.chat-hint__text').textContent = this.hint
        return
      }
      existing?.remove()
      const bubble = document.createElement('div')
      bubble.className = 'chat-hint'
      bubble.setAttribute('role', 'note')
      bubble.dataset.test = 'chat-hint'
      const svg = (path) =>
        `<svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="${path}"/></svg>`
      bubble.innerHTML = `${svg(INFO_ICON_PATH)}<span class="chat-hint__text"></span><button type="button" class="chat-hint__close" data-test="chat-hint-close">${svg(CLOSE_ICON_PATH)}</button>`
      // The text as text: it comes from the locales, but has no business being markup.
      bubble.querySelector('.chat-hint__text').textContent = this.hint
      const close = bubble.querySelector('.chat-hint__close')
      close.setAttribute('aria-label', this.$t('actions.close'))
      close.addEventListener('click', () => this.dismissHint(this.hintKey || this.hint))
      column.appendChild(bubble)
      // The button to the unread messages above goes below the hint.
      this.renderUnreadAbove()
    },

    // The unread messages above the part of the room shown: those loaded and scrolled past,
    // and those not loaded yet — the room's unread count beyond the unread ones loaded.
    countUnreadAbove() {
      const room = this.rooms.find((r) => r.id === this.selectedRoom?.id)
      if (!room) return 0
      const notLoaded = this.unreadNotLoaded(room)
      const shadowRoot = this.$el?.shadowRoot
      const container = shadowRoot?.querySelector?.('.vac-container-scroll')
      if (!(container instanceof Element)) return notLoaded
      const top = container.getBoundingClientRect().top
      const scrolledPast = this.messages.filter((m) => {
        if (!this.unseenMessageIds.has(m.id)) return false
        const element = shadowRoot.querySelector(`[id="${m._id}"]`)
        return !!element && element.getBoundingClientRect().bottom <= top
      }).length
      return notLoaded + scrolledPast
    },

    // The unread messages of the room not loaded yet: its unread count, less the unread ones
    // loaded and those seen just now but not yet taken off the count (they wait for the batch
    // to be sent, markAsSeen). Those come in while the room was open were never in the count.
    unreadNotLoaded(room) {
      const unread = typeof room?.unreadCount === 'number' ? room.unreadCount : 0
      const counted = (ids) => ids.filter((id) => !this._arrivedUnseen.has(id)).length
      return Math.max(
        0,
        unread - counted([...this.unseenMessageIds]) - counted(this._seenBatch || []),
      )
    },

    // Once per frame at most: scrolling reports far more often.
    scheduleUnreadAbove() {
      if (this._unreadAboveFrame) return
      this._unreadAboveFrame = requestAnimationFrame(() => {
        this._unreadAboveFrame = null
        this.unreadAbove = this.countUnreadAbove()
        this.renderUnreadAbove()
        this.showUnreadBelow(this.countUnreadBelow())
      })
    },

    // The unread messages loaded below the part of the room shown.
    countUnreadBelow() {
      const shadowRoot = this.$el?.shadowRoot
      const container = shadowRoot?.querySelector?.('.vac-container-scroll')
      if (!(container instanceof Element)) return 0
      const bottom = container.getBoundingClientRect().bottom
      return this.messages.filter((m) => {
        if (!this.unseenMessageIds.has(m.id)) return false
        const element = shadowRoot.querySelector(`[id="${m._id}"]`)
        return !!element && element.getBoundingClientRect().top >= bottom
      }).length
    },

    // The library's button to the newest message counts the messages come in while scrolled up;
    // it is given the unread ones below instead, which holds those and the ones jumped over
    // (jumpToOldestUnread). Its count lives inside the library (libraryComponent.js).
    showUnreadBelow(count) {
      const room = findLibraryComponent(this.$el, 'ChatRoom')?.proxy
      if (!room || room.scrollMessagesCount === count) return
      room.scrollMessagesCount = count
      if (count) room.scrollIcon = true
    },

    // The library marks a request for older messages as under way (`loadingMoreMessages`) and
    // clears the mark only when its messages change. A page that failed changes none, which
    // left its paging stuck in the room. The mark lives inside the library (libraryComponent.js).
    releaseLibraryPaging() {
      const room = findLibraryComponent(this.$el, 'ChatRoom')?.proxy
      if (room) room.loadingMoreMessages = false
    },

    // Unread messages that came into sight while the room moved on its own, on the way to the
    // oldest unread one, were not read: they are asked about anew where the room stopped.
    reobserveUnseen() {
      const observer = this._intersectionObserver
      const shadowRoot = this.$el?.shadowRoot
      if (!observer || !shadowRoot) return
      shadowRoot.querySelectorAll('[data-unseen-id]').forEach((element) => {
        observer.unobserve(element)
        observer.observe(element)
      })
    },

    // The button to the oldest unread message above, the counterpart of the library's button
    // to the newest one below: its look and its counter's colours, those of unread messages,
    // at the top. Written into the library's markup like the hint, where no component of the
    // app can be put.
    renderUnreadAbove() {
      const shadowRoot = this.$el?.shadowRoot
      const column = shadowRoot?.querySelector?.('.vac-col-messages')
      let button = shadowRoot?.querySelector?.('.chat-unread-above')
      if (!(button instanceof Element)) button = null
      if (!this.unreadAbove || !(column instanceof Element)) {
        this.removeUnreadAbove()
        return
      }
      if (!button || button.parentNode !== column) {
        this.removeUnreadAbove()
        button = document.createElement('button')
        button.type = 'button'
        button.className = 'vac-icon-scroll chat-unread-above'
        button.dataset.test = 'chat-unread-above'
        button.innerHTML = `<div class="vac-badge-counter vac-messages-count"></div><svg viewBox="0 0 24 24" width="25" height="25" aria-hidden="true" focusable="false"><path d="${ARROW_UP_ICON_PATH}"/></svg>`
        button.addEventListener('click', () => this.jumpToOldestUnread())
        column.appendChild(button)
      }
      // Below the hint where there is one, else below the room's header.
      const hint = column.querySelector('.chat-hint')
      button.style.top = hint
        ? `${hint.offsetTop + hint.offsetHeight + 8}px`
        : `${this.hideHeader ? 8 : 68}px`
      button.querySelector('.vac-messages-count').textContent =
        this.unreadAbove > 99 ? '99+' : String(this.unreadAbove)
      button.classList.toggle('chat-unread-above--busy', this.jumpingToUnread)
      button.setAttribute('aria-busy', String(this.jumpingToUnread))
      const label = this.$t('chat.unreadAbove', { count: this.unreadAbove })
      if (button.getAttribute('aria-label') !== label) {
        button.setAttribute('aria-label', label)
        if (button._tooltip) destroyTooltip(button)
        createTooltip(button, { content: label, placement: 'left' })
      }
    },

    removeUnreadAbove() {
      const button = this.$el?.shadowRoot?.querySelector?.('.chat-unread-above')
      if (!(button instanceof Element)) return
      if (button._tooltip) destroyTooltip(button)
      button.remove()
    },

    // To the oldest unread message: the older pages are loaded until it is, then it is
    // scrolled to the top of the room, with what was said before it above.
    async jumpToOldestUnread() {
      if (this.jumpingToUnread || !this.selectedRoom) return
      const room = this.selectedRoom
      this.jumpingToUnread = true
      this.renderUnreadAbove()
      try {
        for (let page = 0; page < UNREAD_JUMP_MAX_PAGES; page++) {
          const roomNow = this.rooms.find((r) => r.id === room.id)
          if (this.messagesLoaded || !this.unreadNotLoaded(roomNow)) break
          const oldest = this.oldestLoadedIndexId
          const loaded = await this.fetchMessages({ room })
          // Stopped by a failed page, another room opened, the chat closed, or a page that
          // brought nothing older.
          if (!loaded || this._destroyed || this.selectedRoom !== room) break
          if (this.oldestLoadedIndexId === oldest) break
        }
        if (this._destroyed || this.selectedRoom !== room) return
        // The library draws what was loaded with its own Vue, after this one's tick.
        await this.$nextTick()
        await new Promise((resolve) => requestAnimationFrame(resolve))
        if (this._destroyed || this.selectedRoom !== room) return
        this.scrollToOldestUnread()
      } finally {
        this.jumpingToUnread = false
        if (!this._destroyed) {
          this.reobserveUnseen()
          this.scheduleUnreadAbove()
        }
      }
    },

    scrollToOldestUnread() {
      const shadowRoot = this.$el?.shadowRoot
      const container = shadowRoot?.querySelector?.('.vac-container-scroll')
      const oldest = this.messages
        .filter((m) => this.unseenMessageIds.has(m.id))
        .reduce((min, m) => (!min || m.indexId < min.indexId ? m : min), null)
      if (!oldest || !(container instanceof Element)) return
      const element = shadowRoot.querySelector(`[id="${oldest._id}"]`)
      if (!element) return
      container.scrollTop +=
        element.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        UNREAD_JUMP_MARGIN
    },

    buildLastMessage(msg) {
      const content = (msg.content || '').trim()
      let preview = content ? content.substring(0, 30) : ''
      if (!preview && msg.files?.length) {
        const f = msg.files[0]
        if (!f.type?.startsWith('audio/') && !f.audio) {
          preview = `\uD83D\uDCCE ${f.name || ''}`
        }
      }
      return { ...msg, content: preview, files: msg.files }
    },

    markAsSeen(messageIds) {
      if (!messageIds.length || !this.selectedRoom) return
      const room = this.selectedRoom
      // Update local messages to seen
      const seenIds = new Set(messageIds)
      this.messages = this.messages.map((m) => {
        if (seenIds.has(m.id)) {
          return { ...m, seen: true }
        }
        return m
      })
      // Update room unread count
      const roomIndex = this.rooms.findIndex((r) => r.id === room.id)
      if (roomIndex !== -1) {
        const changedRoom = { ...this.rooms[roomIndex] }
        // Those come in while the room was open were never in its count (chatMessageAdded).
        const counted = messageIds.filter((id) => !this._arrivedUnseen.delete(id)).length
        changedRoom.unreadCount = Math.max(0, changedRoom.unreadCount - counted)
        this.$set(this.rooms, roomIndex, changedRoom)
      }
      // Persist to server
      this.$apollo
        .mutate({
          mutation: markMessagesAsSeen(),
          variables: { messageIds },
        })
        .then(() => {
          this.$apollo
            .query({ query: unreadRoomsQuery(), fetchPolicy: 'network-only' })
            .then(({ data: { UnreadRooms } }) => {
              this.commitUnreadRoomCount(UnreadRooms)
            })
        })
    },

    injectShadowStyles() {
      // vue-advanced-chat renders inside a Web Component shadow DOM, so
      // normal CSS can't reach its layout. The library also hard-codes
      //   .vac-player-progress { width: 190px }
      // which overflows the message box in our narrow side-panel variant
      // (the library's 50%/80% box breakpoint is tied to window width, not
      // the container width). Make the waveform flex-based so it scales to
      // whatever room the message box gives it.
      const shadowRoot = this.$el?.shadowRoot
      if (!shadowRoot || this._shadowStylesInjected) return
      if (typeof shadowRoot.appendChild !== 'function') return
      const style = document.createElement('style')
      style.textContent = `
        /* The library colours the links in a message #0d579c, unreadable on a dark ground. */
        .vac-card-window a { color: var(--chat-tag-color); }
        .vac-player-bar { min-width: 0; }
        .vac-player-progress { width: auto; flex: 1 1 auto; min-width: 0; }
        .vac-room-header .vac-info-wrapper { flex: 1 1 0; min-width: 0; width: auto; }
        .vac-room-header .vac-room-name { min-width: 0; }
        /* Align the chat room header with the video call header. The library
           ships .vac-room-header at height: 64px with an inner .vac-room-wrapper
           providing 0 16px padding — override the height only so the two
           overlays line up when stacked. The wrapper's 16px horizontal padding
           already matches the video header's $space-small (16px). */
        .vac-room-header { height: 60px !important; }
        /* The messages begin where the header ends: the library keeps 65px free above them
           (50px on a narrow screen), which left a strip between the two. */
        .vac-col-messages .vac-container-scroll { margin-top: 60px; }
        .vac-room-header .vac-avatar-profile--header { margin-right: 8px; }
        /* A scrollbar that floats over the messages (macOS): room for it, as the avatar of
           one's own messages reaches the right edge of the list; and above them, as the
           avatars (AvatarImage, positioned, its content transformed) were drawn over it. Its
           own stacking context puts the list's scrollbar above all that is in it. Both classes
           for the padding: the library's own (padding: 0 5px 5px) comes later in the shadow root.
           Thin, as Safari's is wider than the padding; still floating, unlike a scrollbar styled
           through ::-webkit-scrollbar, which takes a track of its own there. */
        .vac-container-scroll { isolation: isolate; scrollbar-width: thin; }
        .vac-container-scroll .vac-messages-container { padding-right: 12px; }
        /* The room list's scrollbar like the messages': thin, and above the avatars in it. */
        .vac-rooms-container .vac-room-list { isolation: isolate; scrollbar-width: thin; }
        ${
          // A chat on its own — the floating window, the call's sidebar — has little height,
          // and the library puts 10px above and below the input (7px on a narrow screen).
          // Less of it there, and the input as high as the call's buttons (36px: one 20px
          // line, 7px above and below, its 1px border): the row is then as high as the call's
          // control bar beside it (45px with its line on top), on any screen. The library
          // reads the padding back when the input grows with more lines.
          this.singleRoom
            ? `
        .vac-box-footer { padding-top: 4px !important; padding-bottom: 4px !important; }
        .vac-textarea { padding-top: 7px !important; padding-bottom: 7px !important; line-height: 20px !important; }
        `
            : ''
        }
        ${
          // The library has no switch for its header, and reserves the header's height
          // above the messages with a margin of their own — both have to go.
          this.hideHeader
            ? `
        .vac-room-header { display: none !important; }
        .vac-container-scroll { margin-top: 0 !important; }
        `
            : ''
        }
        /* The hint above the messages (see renderHint). Below the room's header where there
           is one, at the top where the host brings its own. */
        .chat-hint {
          position: absolute;
          top: ${this.hideHeader ? 8 : 68}px;
          left: 12px;
          right: 12px;
          z-index: 20;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 8px 8px 12px;
          /* Its colours are tokens (root-tokens.css, --chat-hint-*), for a brand to change. */
          background: var(--chat-hint-background);
          color: var(--chat-hint-color);
          border-radius: var(--border-radius-base);
          box-shadow: var(--chat-hint-shadow);
          font-size: 14px;
          line-height: 1.4;
        }
        .chat-hint > svg { flex-shrink: 0; margin-top: 2px; color: var(--chat-hint-icon-color); }
        .chat-hint__text { flex: 1 1 auto; min-width: 0; white-space: pre-line; }
        .chat-hint__close {
          flex-shrink: 0;
          display: flex;
          padding: 2px;
          border: 0;
          background: none;
          color: inherit;
          cursor: pointer;
          border-radius: var(--border-radius-base);
        }
        .chat-hint__close:hover { background: var(--chat-hint-close-hover-background); }
        .chat-hint__close:focus-visible { outline: 2px solid var(--chat-hint-color); }
        /* The button to the unread messages above (renderUnreadAbove): the library's button to
           the newest message, at the top, with its counter below the arrow. Both classes: the
           library's own rules for .vac-icon-scroll (bottom: 70px) come later in the shadow root
           and would otherwise pin the button to the bottom as well, stretching it. */
        .vac-icon-scroll.chat-unread-above { top: 68px; bottom: auto; height: auto; border: 0; font: inherit; }
        .vac-icon-scroll.chat-unread-above svg { fill: var(--chat-icon-color-dropdown-scroll); }
        .vac-icon-scroll.chat-unread-above .vac-messages-count { top: auto; bottom: -8px; }
        .vac-icon-scroll.chat-unread-above:focus-visible { outline: 2px solid var(--chat-icon-color-dropdown-scroll); outline-offset: 2px; }
        .vac-icon-scroll.chat-unread-above--busy { cursor: progress; opacity: 0.6; }
        ${
          this.singleRoom
            ? `
        .vac-message-wrapper .vac-message-box { flex: 0 0 80%; max-width: 80%; }
        .vac-message-wrapper .vac-offset-current { margin-left: 20%; }
        `
            : ''
        }
      `
      shadowRoot.appendChild(style)
      this._shadowStyle = style
      this._shadowStylesInjected = true
      this.renderDraftLabels()
    },

    // Writes the "Draft:" marks of the room list (draftLabelCss) into a stylesheet of their own
    // in the library's shadow root.
    renderDraftLabels() {
      const shadowRoot = this.$el?.shadowRoot
      if (!shadowRoot || typeof shadowRoot.appendChild !== 'function') return
      if (!this._draftLabelStyle) {
        this._draftLabelStyle = document.createElement('style')
        shadowRoot.appendChild(this._draftLabelStyle)
      }
      this._draftLabelStyle.textContent = this.draftLabelCss
    },
    setupMessageVisibilityTracking() {
      this.injectShadowStyles()
      const shadowRoot = this.$el?.shadowRoot
      if (!shadowRoot || this._mutationObserver) return
      const scrollContainer = shadowRoot.querySelector('.vac-container-scroll')
      if (!scrollContainer) return
      // Scrolling up past unread messages counts them for the button to them, down again
      // counts them off.
      this._scrollContainer = scrollContainer
      scrollContainer.addEventListener?.('scroll', this.scheduleUnreadAbove, { passive: true })

      this._seenBatch = []
      this._seenFlushTimer = null

      // IntersectionObserver: detects when unseen messages become visible
      this._intersectionObserver = new IntersectionObserver(
        (entries) => {
          // On the way to the oldest unread message, nothing passed is read (reobserveUnseen).
          if (this.jumpingToUnread) return
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const msgId = entry.target.dataset.unseenId
              if (msgId && this.unseenMessageIds.has(msgId)) {
                this.unseenMessageIds.delete(msgId)
                this._seenBatch.push(msgId)
                this._intersectionObserver.unobserve(entry.target)
              }
            }
          }
          if (this._seenBatch.length && !this._seenFlushTimer) {
            this._seenFlushTimer = setTimeout(() => {
              const batch = [...this._seenBatch]
              this._seenBatch = []
              this._seenFlushTimer = null
              this.markAsSeen(batch)
            }, 500)
          }
        },
        { root: scrollContainer, threshold: 0.1 },
      )

      // MutationObserver: watches for new message elements in shadow DOM
      this._mutationObserver = new MutationObserver(() => {
        this.observeNewUnseenElements()
      })
      this._mutationObserver.observe(scrollContainer, { childList: true, subtree: true })
    },

    observeNewUnseenElements() {
      if (this.unseenMessageIds.size === 0 || !this._intersectionObserver) return
      const shadowRoot = this.$el?.shadowRoot
      if (!shadowRoot) return
      for (const msgId of this.unseenMessageIds) {
        const msg = this.messages.find((m) => m.id === msgId)
        if (!msg) continue
        const el = shadowRoot.querySelector(`[id="${msg._id}"]`)
        if (el && !el.dataset.unseenId) {
          el.dataset.unseenId = msgId
          this._intersectionObserver.observe(el)
        }
      }
    },

    mergeMessages(newMessages) {
      // Track unseen incoming messages
      newMessages
        .filter((m) => m.seen === false && m.senderId !== this.currentUser.id)
        .forEach((m) => this.unseenMessageIds.add(m.id))
      // Merge and sort by indexId, using prepareMessage for normalization
      const msgs = []
      ;[...this.messages, ...newMessages].forEach((m) => {
        const prepared = m._rawDate ? m : this.prepareMessage(m)
        msgs[prepared.indexId] = prepared
      })
      // Those that could not be sent have no place in the room's order: they stay last.
      const unsent = Object.values(this._unsent)
        .filter((entry) => entry.roomId === this.selectedRoom?.id)
        .map((entry) => entry.message)
      const filtered = [...msgs.filter(Boolean), ...unsent]
      this.applyAvatarsOnList(filtered)
      this.messages = filtered
    },

    messageUserProfile(senderId) {
      const room = this.rooms.find((r) => r.id === this.selectedRoom?.id)
      const profile = room?._userProfiles?.[senderId]
      if (profile) return profile
      const user = this.selectedRoom?.users?.find((u) => u._id === senderId || u.id === senderId)
      return user
        ? { id: user.id, slug: user.slug, name: user.username || user.name }
        : { name: senderId }
    },

    // A data URI is its own document — var() does not reach into it, so the colours are resolved
    // here. Without a document (server render) the light values stand.
    initialsAvatarUrl(name) {
      const initials = (name || '?').match(/\b\w/g)?.join('').substring(0, 2).toUpperCase() || '?'
      const token = (prop, fallback) =>
        (typeof document !== 'undefined' &&
          getComputedStyle(document.documentElement).getPropertyValue(prop).trim()) ||
        fallback
      const fill = encodeURIComponent(token('--color-primary-dark', 'rgb(25,122,49)'))
      const text = encodeURIComponent(token('--text-color-primary-inverse', 'white'))
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><circle cx="28" cy="28" r="28" fill="${fill}"/><text x="50%25" y="50%25" dominant-baseline="central" text-anchor="middle" fill="${text}" font-family="sans-serif" font-size="22" font-weight="500">${initials}</text></svg>`
      return `data:image/svg+xml,${svg}`
    },

    prepareMessage(msg) {
      const m = { ...msg }
      m.content = m.content || ''
      if (!m._rawDate) m._rawDate = m.date
      this.formatMessageDate(m)
      m.avatar = m.avatar?.w320 || m.avatar || this.initialsAvatarUrl(m.username)
      if (!m._originalAvatar) m._originalAvatar = m.avatar
      return m
    },

    applyAvatarsOnList(list) {
      // Show avatar only on the last message of each consecutive sender chain
      for (let i = 0; i < list.length; i++) {
        const msg = list[i]
        const next = list[i + 1]
        const isLastInChain = !next || next.senderId !== msg.senderId
        msg.avatar = isLastInChain ? msg._originalAvatar || null : null
      }
    },

    replaceLocalMessage(localId, serverMsg) {
      const serverId = serverMsg.id || serverMsg._id
      // Store mapping without triggering reactivity
      if (!this._localToServerIds) this._localToServerIds = {}
      this._localToServerIds[serverId] = localId

      const idx = this.messages.findIndex((m) => m._id === localId)
      if (idx === -1) return

      const msg = this.messages[idx]
      const needsRender = msg.isUploading || this.pendingStatusUpdates[serverId]

      // Update file URLs and clear upload state
      if (msg.isUploading) {
        msg.isUploading = false
        if (serverMsg.files?.length) {
          msg.files = serverMsg.files
        }
      }

      // Apply any queued status updates
      const pending = this.pendingStatusUpdates[serverId]
      if (pending) {
        delete this.pendingStatusUpdates[serverId]
        if (pending.distributed) msg.distributed = true
        if (pending.seen) msg.seen = true
      }

      if (needsRender) {
        this.messages = [...this.messages]
      }
    },

    addSocketMessage(msg) {
      const prepared = this.prepareMessage(msg)
      // Avoid duplicates (own message already added locally, or duplicate socket event)
      if (this.messages.some((m) => m._id === prepared._id || m.id === prepared.id)) return
      const updatedMessages = [...this.messages, prepared]
      this.applyAvatarsOnList(updatedMessages)
      this.messages = updatedMessages

      // Track unseen incoming messages
      if (msg.senderId !== this.currentUser.id && !msg.seen) {
        this.unseenMessageIds.add(msg.id)
        this.$nextTick(() => {
          this.setupMessageVisibilityTracking()
          this.observeNewUnseenElements()
        })
      }
    },

    scrollRoomsListToTop() {
      const roomsList = this.$el?.shadowRoot?.querySelector('#rooms-list')
      if (roomsList) roomsList.scrollTop = 0
    },

    formatMessageDate(m) {
      const dateObj = new Date(m._rawDate)
      m.timestamp = dateObj.toLocaleTimeString(this.currentLocaleIso, {
        hour: '2-digit',
        minute: '2-digit',
      })
      m.date = dateObj.toLocaleDateString(this.currentLocaleIso, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    },

    async fetchRooms({ room, search, replace, generation } = {}) {
      this.roomsLoaded = false
      try {
        const variables = room?.id
          ? { id: room.id }
          : { first: ROOM_PAGE_SIZE, before: this.roomCursor, ...(search && { search }) }

        const {
          data: { Room },
        } = await this.$apollo.query({
          query: roomQuery(),
          variables,
          fetchPolicy: 'no-cache',
        })

        if (generation != null && generation !== this.roomSearchGeneration) return

        if (replace) {
          this.rooms = Room.map((r) => this.fixRoomObject(r))
        } else {
          const existingIds = new Set(this.rooms.map((r) => r.id))
          // A direct conversation begun here has no room until its first message — unless a
          // draft opened one meanwhile. That one is shown already, as the room begun here.
          const begunWith = new Set(this.rooms.map((r) => r._virtualUserId).filter(Boolean))
          const newRooms = Room.filter(
            (r) =>
              !existingIds.has(r.id) &&
              !(
                !r.isGroupRoom &&
                !r.group &&
                r.users?.some((u) => u.id !== this.currentUser.id && begunWith.has(u.id))
              ),
          ).map((r) => this.fixRoomObject(r))
          this.rooms = [...this.rooms, ...newRooms]
        }

        if (!room?.id && Room.length > 0) {
          const lastRoom = Room[Room.length - 1]
          this.roomCursor = lastRoom.lastMessageAt || lastRoom.createdAt
        }

        if (Room.length < ROOM_PAGE_SIZE) {
          this.roomsLoaded = true
        }

        if (this.singleRoom && this.rooms.length > 0) {
          this.activeRoomId = this.rooms[0].roomId
        }
      } catch (error) {
        this.rooms = []
        this.$toastBackendError(error)
      }
      this.loadingRooms = false
    },

    async searchRooms(event) {
      const value = typeof event === 'string' ? event : event?.value
      this.roomSearch = value || ''
      this.roomCursor = null
      if (this.roomsLoaded) this.roomObserverDirty = true
      this.roomSearchGeneration = (this.roomSearchGeneration || 0) + 1
      const generation = this.roomSearchGeneration
      await this.fetchRooms({ search: this.roomSearch || undefined, replace: true, generation })
      if (generation !== this.roomSearchGeneration) return
      // Re-init IntersectionObserver after it was disabled by roomsLoaded=true
      if (this.roomObserverDirty && !this.roomsLoaded) {
        this.roomObserverDirty = false
        this.$nextTick(() => this.reinitRoomLoader())
      }
    },

    reinitRoomLoader() {
      const shadow = this.$el?.shadowRoot
      if (!shadow) return
      const loader = shadow.querySelector('#infinite-loader-rooms')
      const roomsList = shadow.querySelector('#rooms-list')
      if (!loader || !roomsList) return
      // Make loader visible (library hides it via v-show when showLoader=false)
      loader.style.display = ''
      // Create a new IntersectionObserver to trigger pagination on scroll
      if (this._roomLoaderObserver) this._roomLoaderObserver.disconnect()
      this._roomLoaderObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !this.roomsLoaded) {
            this.fetchMoreRooms()
          }
        },
        { root: roomsList, threshold: 0 },
      )
      this._roomLoaderObserver.observe(loader)
    },

    fetchMoreRooms() {
      this.fetchRooms({ search: this.roomSearch || undefined })
    },

    async fetchMessages({ room, options = {} }) {
      if (!room?.roomId) return
      // When an external socket message added a new room, the library may try to
      // auto-select it. Lock activeRoomId to the current room to prevent focus steal.
      if (this._externalRoomIds?.has(room.roomId)) {
        this._externalRoomIds.delete(room.roomId)
        if (this.selectedRoom) {
          this.activeRoomId = this.selectedRoom.roomId
          return
        }
      }
      if (this.selectedRoom?.id !== room.id) {
        // What was typed in the room left is kept, and the room opened shows its own draft.
        if (this.selectedRoom) this.keepDraft(this.selectedRoom.id)
        this.showDraftOf(room.id)
        this.roomSwitches++
        this.messages = []
        this.oldestLoadedIndexId = null
        this.unseenMessageIds = new Set()
        this._arrivedUnseen = new Set()
        this.selectedRoom = room
      }
      const switches = this.roomSwitches
      // We disabled `textarea-auto-focus` on vue-advanced-chat to prevent the
      // library from stealing focus from the room filter when filter-driven
      // room-list updates cause its internal `roomId` watcher to fire. Restore
      // the "focus message textarea on room switch" UX here, but skip it while
      // the user is actively typing in the filter.
      const shadowRoot = this.$el?.shadowRoot
      const userIsFiltering = shadowRoot?.activeElement?.matches?.('input[type="search"].vac-input')
      if (!userIsFiltering && this.autoFocus) {
        this.$nextTick(() => {
          this.$el?.shadowRoot?.querySelector('textarea#roomTextarea')?.focus()
        })
      }
      // Virtual rooms have no messages on the server yet; only those that could not be sent.
      if (!room.id || room.id.startsWith('temp-')) {
        this.mergeMessages([])
        // Toggle messagesLoaded to ensure vue-advanced-chat's watcher fires
        this.messagesLoaded = false
        this.$nextTick(() => {
          this.messagesLoaded = true
        })
        return
      }
      this.messagesLoaded = options.refetch ? this.messagesLoaded : false
      const variables = {
        roomId: room.id,
        first: MESSAGE_PAGE_SIZE,
      }
      if (!options.refetch && this.oldestLoadedIndexId !== null) {
        variables.beforeIndex = this.oldestLoadedIndexId
      }
      try {
        const {
          data: { Message },
        } = await this.$apollo.query({
          query: messageQuery(),
          variables,
          fetchPolicy: 'no-cache',
        })
        // Another room may have been opened while this one was asked for: its messages
        // must not end up there. Counted, not compared by id: after a way there and back the
        // room is the same again, but its messages have been asked for anew.
        if (this.roomSwitches !== switches) return false

        this.mergeMessages(Message)

        // Update cursor to oldest loaded message
        if (Message.length > 0 && !options.refetch) {
          const oldestMsg = Message.reduce(
            (min, m) => (m.indexId < min.indexId ? m : min),
            Message[0],
          )
          if (this.oldestLoadedIndexId === null || oldestMsg.indexId < this.oldestLoadedIndexId) {
            this.oldestLoadedIndexId = oldestMsg.indexId
          }
        }
        if (Message.length < MESSAGE_PAGE_SIZE) {
          this.messagesLoaded = true
        }
        // Ensure visibility tracking is running
        this.$nextTick(() => {
          this.setupMessageVisibilityTracking()
          // A room opened may have had its message column drawn anew.
          this.renderHint()
        })
        return true
      } catch (error) {
        if (this.roomSwitches !== switches) return false
        // An older page that failed leaves the newer ones loaded: emptied, the room would
        // show a gap once the page came after all. The library, though, waits for new messages
        // before it asks for older ones again; told the request is over, it asks anew.
        if (variables.beforeIndex === undefined) this.messages = []
        else this.releaseLibraryPaging()
        this.$toastBackendError(error)
        return false
      }
    },

    async chatMessageAdded({ data }) {
      const msg = data.chatMessageAdded
      let roomIndex = this.rooms.findIndex((r) => r.id === msg.room.id)
      let freshlyFetched = false
      if (roomIndex === -1) {
        // A room stays a conference chat, so it is asked for once, not on every message.
        if (this.callRoomIds.has(msg.room.id)) return
        // Room not in list yet — fetch it specifically
        try {
          const {
            data: { Room },
          } = await this.$apollo.query({
            query: roomQuery(),
            variables: { id: msg.room.id },
            fetchPolicy: 'no-cache',
          })
          // The conference chat of a video call is no conversation of its own: it is
          // shown where the call opens it (and is then in the list already), never
          // because a message happens to arrive for it.
          if (Room?.length && Room[0].isCallRoom) {
            this.callRoomIds.add(msg.room.id)
            return
          }
          if (Room?.length) {
            const newRoom = this.fixRoomObject(Room[0])
            if (!this._externalRoomIds) this._externalRoomIds = new Set()
            this._externalRoomIds.add(newRoom.roomId)
            this.rooms = [newRoom, ...this.rooms]
            roomIndex = 0
            freshlyFetched = true
          } else {
            return
          }
        } catch {
          return
        }
      }
      const changedRoom = { ...this.rooms[roomIndex] }
      changedRoom.lastMessage = this.buildLastMessage(msg)
      changedRoom.lastMessageAt = msg.date
      changedRoom.index = new Date().toISOString()
      const isCurrentRoom = msg.room.id === this.selectedRoom?.id
      const isOwnMessage = msg.senderId === this.currentUser.id
      // The server's count is resolved for this viewer: it leaves out what a sender they block or
      // mute writes, which a group room delivers live all the same, so counting up alone would
      // rise above it. Right after markAsSeen, though, it may still hold what was just read, as
      // the mutation is not committed yet. One more than the local count bounds it: no more than
      // this one message has come in. A room fetched just now has the newest count already, and
      // the open room keeps its own: what arrives there is shown and marked as seen in place.
      if (!freshlyFetched && !isCurrentRoom && !isOwnMessage) {
        changedRoom.unreadCount = Math.min(changedRoom.unreadCount + 1, msg.room.unreadCount)
      }
      this.moveRoomToTop(changedRoom, msg.room.id)
      // Only add incoming messages to the chat — own messages are handled via mutation response
      if (isCurrentRoom && !isOwnMessage) {
        this._arrivedUnseen.add(msg.id)
        this.addSocketMessage(msg)
      }
    },

    handleMessageStatusUpdated({ data }) {
      const { roomId, messageIds, status } = data.chatMessageStatusUpdated
      const affectedIds = new Set(messageIds)
      const statusUpdate = status === 'seen' ? { seen: true } : { distributed: true }
      // Update loaded messages locally
      if (this.selectedRoom?.id === roomId) {
        // Resolve server IDs to local _ids via mapping
        const idMap = this._localToServerIds || {}
        let foundAny = false
        this.messages = this.messages.map((m) => {
          const matchById = affectedIds.has(m.id)
          const matchByMapping = messageIds.some((sid) => idMap[sid] === m._id)
          if (matchById || matchByMapping) {
            foundAny = true
            return { ...m, ...statusUpdate }
          }
          return m
        })
        // Queue status updates for messages not yet replaced by server response
        if (!foundAny) {
          for (const msgId of messageIds) {
            this.pendingStatusUpdates[msgId] = {
              ...this.pendingStatusUpdates[msgId],
              ...statusUpdate,
            }
          }
        }
      }
      // Update room preview lastMessage status locally
      const roomIndex = this.rooms.findIndex((r) => r.id === roomId)
      if (roomIndex !== -1) {
        const room = this.rooms[roomIndex]
        if (room.lastMessage && affectedIds.has(room.lastMessage.id)) {
          const changedRoom = {
            ...room,
            lastMessage: { ...room.lastMessage, ...statusUpdate },
          }
          this.$set(this.rooms, roomIndex, changedRoom)
        }
      }
    },

    // Sends what the field handed over. Sent again after failing (`again`), it leaves the
    // draft as it is: that is what was written since.
    async sendMessage(messageDetails, { again = false } = {}) {
      const { roomId, content, files } = messageDetails
      const isVirtualRoom = roomId.startsWith('temp-')
      if (!again) {
        // Sending ends the draft, on the server too (CreateMessage). The emptied field reports
        // itself right after; known as empty already, it is not saved again.
        this.forgetTyped(roomId)
        // Nor may a save of it that failed bring it back.
        clearUnsavedDraft(this.currentUser.id, roomId)
        newDraftRevision(this.currentUser.id, roomId)
        this.$set(this.drafts, roomId, '')
        this.$set(this.draftFiles, roomId, [])
        // Its files are the message's now, one still uploaded for the draft too: the field
        // emptied after sending does not take them out of the draft (keepDraftFiles).
        files?.forEach((file) => {
          file.takenOver = true
        })
      }

      // Immediately add new message
      const localMessage = {
        ...messageDetails,
        _id: 'new' + Math.random().toString(36).substring(2, 15),
        seen: false,
        saved: true,
        _rawDate: new Date().toISOString(),
        _originalAvatar:
          this.selectedRoom?.users?.find((u) => u.id === this.currentUser.id)?.avatar ||
          this.initialsAvatarUrl(this.currentUser.name),
        senderId: this.currentUser.id,
        files:
          files?.map((file) => ({
            ...file,
            url: file.draftUrl || URL.createObjectURL(new Blob([file.blob], { type: file.type })),
          })) ?? [],
        isUploading: true,
      }
      this.formatMessageDate(localMessage)
      const updatedMessages = [...this.messages, localMessage]
      this.applyAvatarsOnList(updatedMessages)
      this.messages = updatedMessages

      const roomIndex = this.rooms.findIndex((r) => r.id === roomId)
      if (roomIndex !== -1) {
        const changedRoom = { ...this.rooms[roomIndex] }
        changedRoom.lastMessage = this.buildLastMessage({ content, files })
        changedRoom.index = new Date().toISOString()
        this.moveRoomToTop(changedRoom, roomId)
        this.$nextTick(() => this.scrollRoomsListToTop())
      }

      try {
        // In line with the draft's saves: those asked for before go first — the draft must not
        // outlive what was sent, and a file being uploaded for it is taken over, not uploaded a
        // second time — and those asked for while it is sent wait for it, as ending the draft
        // would take them away.
        const createdMessage = await this.queueDraftSave(roomId, async (target) => {
          if (!again) this.$set(this.draftFiles, roomId, [])

          // userId for virtual rooms, roomId for existing
          const mutationVariables = { ...target, content }
          const fresh = (files || []).filter((file) => !file.draftUrl)
          const fromDraft = (files || []).filter((file) => file.draftUrl)
          if (fresh.length) mutationVariables.files = fresh.map((file) => this.fileInputOf(file))
          if (fromDraft.length) {
            mutationVariables.draftFiles = fromDraft.map((file) => file.draftUrl)
          }
          if (again) mutationVariables.endsDraft = false

          const { data } = await this.$apollo.mutate({
            mutation: createMessageMutation(),
            variables: mutationVariables,
          })
          return data.CreateMessage
        })

        if (createdMessage) {
          // Replace local message with server response
          this.replaceLocalMessage(localMessage._id, createdMessage)
        }

        if (isVirtualRoom && createdMessage?.room?.id) {
          await this.replaceVirtualRoom(roomId, createdMessage.room.id)
        }
      } catch (error) {
        this.markUnsent(roomId, localMessage, messageDetails)
        this.$toastBackendError(error)
        this.$toast.info(this.$t('chat.notSent'))
      }
    },

    // The room a direct conversation begun here got with its first message takes the place of
    // the one it was shown in until then. The message is sent by then: should fetching the room
    // fail, that is no failed message — which, sent again, would arrive twice.
    async replaceVirtualRoom(virtualRoomId, realRoomId) {
      // Messages of the conversation that could not be sent go with it, to be sent again there;
      // so do those that fail later (markUnsent).
      this._realRoomOf[virtualRoomId] = realRoomId
      Object.values(this._unsent)
        .filter((entry) => entry.roomId === virtualRoomId)
        .forEach((entry) => {
          entry.roomId = realRoomId
          entry.details = { ...entry.details, roomId: realRoomId }
          entry.message = { ...entry.message, roomId: realRoomId }
        })
      this.rooms = this.rooms.filter((r) => r.id !== virtualRoomId)
      try {
        const {
          data: { Room },
        } = await this.$apollo.query({
          query: roomQuery(),
          variables: { id: realRoomId },
          fetchPolicy: 'no-cache',
        })
        if (Room?.length) {
          const realRoom = this.fixRoomObject(Room[0])
          this.bringRoomToTopAndSelect(realRoom)
        }
      } catch (error) {
        this.$toastBackendError(error)
      }
    },

    // A message that could not be sent stays where it was, marked as failed, with all it
    // holds: a click on the mark sends it again (sendAgain).
    markUnsent(sentToRoomId, localMessage, messageDetails) {
      const roomId = this._realRoomOf[sentToRoomId] || sentToRoomId
      const message = { ...localMessage, roomId, failure: true, isUploading: false }
      const details = { ...messageDetails, roomId }
      this._unsent[localMessage._id] = { roomId, message, details }
      this.messages = this.messages.map((m) => (m._id === localMessage._id ? message : m))
      this.applyAvatarsOnList(this.messages)
    },

    sendAgain({ message } = {}) {
      const unsent = this._unsent[message?._id]
      if (!unsent) return
      delete this._unsent[message._id]
      this.messages = this.messages.filter((m) => m._id !== message._id)
      this.sendMessage(unsent.details, { again: true })
    },

    // A file of the field as an upload: one of the message, or one of the draft.
    fileInputOf(file) {
      return {
        upload: new File([file.blob], this.fileNameOf(file), { type: file.type }),
        name: file.name,
        extension: file.extension || undefined,
        type: file.type,
        ...(file.duration != null && { duration: file.duration }),
      }
    },

    fileNameOf(file) {
      return file.extension ? `${file.name}.${file.extension}` : file.name
    },

    // A room's draft is saved by its id; a direct conversation that has no room yet by its
    // user, for whom the server opens the room.
    draftTarget(roomId) {
      if (!roomId.startsWith('temp-')) return { roomId }
      const room = this.rooms.find((r) => r.id === roomId)
      return { userId: room?._virtualUserId || roomId.replace('temp-', '') }
    },

    // A text as the library sends it: of each person picked to mention, the first "@Name" not
    // taken yet becomes a tag of their id.
    tagged(text, mentioned) {
      return (mentioned || []).reduce(
        (result, user) => result.replace(`@${user.username}`, `<usertag>${user._id}</usertag>`),
        text,
      )
    },

    // A tagged text as the field shows it, "@Name", and the people it mentions, one for each
    // tag as the library keeps them. `names` stands in for whoever is no longer in the room.
    untagged(roomId, text, names = {}) {
      const users = this.rooms.find((r) => r.id === roomId)?.users || []
      const mentioned = []
      const plain = (text || '').replace(/<usertag>(.*?)<\/usertag>/g, (tag, id) => {
        const user = users.find((u) => u._id === id)
        if (user) {
          mentioned.push(user)
          return `@${user.username}`
        }
        return names[id] ? `@${names[id]}` : tag
      })
      return { text: plain, mentioned }
    },

    toggleUserSearch() {
      this.$emit('toggle-user-search')
    },

    // The room's draft as known here, its mentions as tags: kept just now, or the one it came
    // with.
    draftOf(roomId) {
      if (roomId in this.drafts) return this.drafts[roomId]
      const unsaved = unsavedDraft(this.currentUser.id, roomId)
      if (unsaved !== undefined) return unsaved
      return this.rooms.find((r) => r.id === roomId)?.draft || ''
    },

    // Without those removed, or still to be (unsavedDrafts.js).
    draftFilesOf(roomId) {
      const files =
        roomId in this.draftFiles
          ? this.draftFiles[roomId]
          : this.rooms.find((r) => r.id === roomId)?.draftFiles || []
      const gone = goneDraftFiles(this.currentUser.id, roomId)
      return files.filter((file) => !gone.includes(file.url) && !isDraftFileRemoved(file.url))
    },

    // The message field's inside, found anew once the library has drawn another one, and
    // watched for the files attached to it, which the library tells of in no event.
    messageField() {
      if (this._field && !this._field.isUnmounted) return this._field
      const field = findMessageField(this.$el)
      this._field = field
      field?.watch('files', (files) => this.draftFilesChanged(field, files), { deep: true })
      // The text too, with the people picked to mention: a mention picked from the library's
      // list is written into the field without `typing-message`.
      field?.watch(
        () => [field.message, field.mentioned.length],
        () => this.draftTextChanged(field),
      )
      return field
    },

    // Puts the room's draft into the message field: the text through `room-message`, through
    // null first, as the field takes it only when it changes and two rooms may hold the same;
    // the people it mentions and its files on the field itself, once it shows the room. Then
    // `room-message` is null again: the library puts it into the field of every room opened
    // later, and would report it as typed there.
    showDraftOf(roomId) {
      this._fieldRoom = null
      this.roomMessage = null
      const { text, mentioned } = this.untagged(roomId, this.draftOf(roomId))
      const files = this.draftFilesOf(roomId)
      // Files attached when the room was left and not uploaded yet: they go back as they are,
      // to be the draft's once uploaded — left out, the field would seem to have lost them.
      const pending = (this._fieldFiles[roomId] || []).filter((file) => !file.draftUrl)
      this.$nextTick(() => {
        this.roomMessage = text || null
      })
      this.whenFieldShows(roomId, (field) => {
        this.roomMessage = null
        field.mentioned = mentioned
        field.files = [
          ...files.map((file) => ({
            name: file.name,
            extension: file.extension,
            type: file.type,
            ...(file.duration != null && { duration: file.duration }),
            localUrl: file.url,
            draftUrl: file.url,
          })),
          ...pending,
        ]
      })
    },

    // The library empties its field for the room opened, once that has reached it: only after
    // that can the draft go in. Given up on after a while, or for another room opened since.
    whenFieldShows(roomId, apply) {
      const showing = {}
      this._showing = showing
      const attempt = (left) => {
        if (this._showing !== showing) return
        const field = this.messageField()
        if (field?.roomId === roomId) {
          apply(field)
          this._fieldRoom = roomId
        } else if (left > 0) {
          setTimeout(() => attempt(left - 1), FIELD_RETRY_MS)
        } else {
          // No field to be found: the draft keeps its text alone.
          this._fieldRoom = roomId
        }
      }
      setTimeout(() => attempt(FIELD_TRIES))
    },

    // vue-advanced-chat reports the message field on every change, null once it was emptied
    // by sending or by Escape. Kept once typing rests, with the people picked to mention.
    draftTyped(event) {
      const roomId = event?.roomId
      if (!roomId || !this.selectedRoomWritable) return
      this._typed[roomId] = event.message || ''
      const field = this.messageField()
      if (field?.roomId === roomId) this._typedMentions[roomId] = [...field.mentioned]
      this.keepSoon(roomId)
    },

    // Files attached to the field or taken out of it are kept with the draft as typing is.
    // Not while the library empties the field for another room: that is no change of the draft.
    // The text of the field and the people picked to mention in it, as the field holds them;
    // kept as typing is. Not while the library empties the field for another room.
    draftTextChanged(field) {
      const roomId = field.roomId
      if (!roomId || roomId !== this._fieldRoom || !this.selectedRoomWritable) return
      this._typed[roomId] = field.message || ''
      this._typedMentions[roomId] = [...field.mentioned]
      this.keepSoon(roomId)
    },

    draftFilesChanged(field, files) {
      const roomId = field.roomId
      if (!roomId || roomId !== this._fieldRoom || !this.selectedRoomWritable) return
      this._typedFiles[roomId] = [...files]
      this._fieldFiles[roomId] = this._typedFiles[roomId]
      this.keepSoon(roomId)
    },

    keepSoon(roomId) {
      clearTimeout(this._draftTimers[roomId])
      this._draftTimers[roomId] = setTimeout(() => this.keepDraft(roomId), DRAFT_SAVE_DELAY_MS)
    },

    forgetTyped(roomId) {
      clearTimeout(this._draftTimers[roomId])
      delete this._draftTimers[roomId]
      delete this._typed[roomId]
      delete this._typedMentions[roomId]
      delete this._typedFiles[roomId]
    },

    // Saves what changed in the room's field, as far as it differs from the draft known.
    keepDraft(roomId) {
      const typed = this._typed[roomId]
      const files = this._typedFiles[roomId]
      const mentioned = this._typedMentions[roomId]
      const userId = this.currentUser.id
      const unsavedText = unsavedDraft(userId, roomId)
      const unsaved = unsavedText !== undefined
      const gone = goneDraftFiles(userId, roomId)
      if (typed === undefined && files === undefined && !unsaved && !gone.length) return
      this.forgetTyped(roomId)
      const text = typed !== undefined ? this.tagged(typed, mentioned) : unsavedText
      if (text !== undefined && (text !== this.draftOf(roomId) || unsaved)) {
        this.$set(this.drafts, roomId, text)
        clearUnsavedDraft(userId, roomId)
        this.saveDraftText(roomId, text)
      }
      if (files !== undefined) this.keepDraftFiles(roomId, files)
      else if (gone.length) this.removeDraftFiles(roomId, gone)
    },

    // Saves a room's draft text. Should it fail, the text is saved again later — unless a
    // newer one has been asked for since, by this chat or another — also from a chat opened
    // anew (unsavedDrafts.js).
    saveDraftText(roomId, text) {
      const userId = this.currentUser.id
      const context = this.leavingContext()
      const revision = newDraftRevision(userId, roomId)
      const saving = { text }
      this._savingText[roomId] = saving
      this.queueDraftSave(roomId, async (target) => {
        try {
          await this.$apollo.mutate({
            mutation: saveRoomDraft(),
            variables: { ...target, text },
            context,
          })
        } catch (error) {
          if (
            isLatestDraftRevision(userId, roomId, revision) &&
            unsavedDraft(userId, roomId) === undefined
          ) {
            setUnsavedDraft(userId, roomId, text)
          }
          throw error
        } finally {
          if (this._savingText[roomId] === saving) delete this._savingText[roomId]
        }
      })
    },

    // The page is left: what is still to be kept goes out at once, without waiting for a save
    // under way, and with `keepalive`, which lets the browser finish a request after the page
    // is gone. A text whose save is under way goes out again that way, as the request may be
    // cut off. Not the uploads: keepalive takes no more than 64 KB.
    keepDraftsOnLeaving() {
      this._leaving = true
      const saving = { ...this._savingText }
      try {
        this.keepAllDrafts()
        Object.entries(saving).forEach(([roomId, save]) => {
          if (this._savingText[roomId] === save && this.drafts[roomId] === save.text) {
            this.saveDraftText(roomId, save.text)
          }
        })
      } finally {
        this._leaving = false
      }
    },

    leavingContext() {
      return this._leaving ? { fetchOptions: { keepalive: true } } : undefined
    },

    // The files of the field against those of the draft: the new ones are uploaded, those
    // taken out removed. A file is the draft's once it knows its address there (`draftUrl`).
    keepDraftFiles(roomId, files) {
      const kept = files.map((file) => file.draftUrl).filter(Boolean)
      const known = this.draftFilesOf(roomId)
      const gone = known.filter((file) => !kept.includes(file.url))
      if (gone.length) {
        this.$set(
          this.draftFiles,
          roomId,
          known.filter((file) => kept.includes(file.url)),
        )
      }
      // Those whose removal failed go again.
      const goneBefore = goneDraftFiles(this.currentUser.id, roomId)
      this.removeDraftFiles(roomId, [...gone.map(({ url }) => url), ...goneBefore])
      files
        .filter((file) => !file.draftUrl && !file.draftUpload && file.blob && !file.loading)
        .forEach((file) => {
          file.draftUpload = true
          this.queueDraftSave(roomId, async (target) => {
            try {
              const { data } = await this.$apollo.mutate({
                mutation: addRoomDraftFile(),
                variables: { ...target, file: this.fileInputOf(file) },
              })
              const added = data?.AddRoomDraftFile
              if (!added) return
              file.draftUrl = added.url
              this.$set(this.draftFiles, roomId, [...this.draftFilesOf(roomId), added])
              // Taken out of the field again while it was uploaded: it goes again too. Not when
              // it was sent meanwhile: the field emptied by sending did not take it out.
              const inField = this._fieldFiles[roomId]
              if (inField && !inField.includes(file) && !file.takenOver) {
                this.keepDraftFiles(roomId, inField)
              }
            } catch (error) {
              // Not uploaded: the files of the field count as changed again, so the next change,
              // leaving the room, closing the chat or leaving the page tries again — with the
              // field as it is then, without what was taken out meanwhile.
              if (!(roomId in this._typedFiles) && !file.takenOver) {
                this._typedFiles[roomId] = this._fieldFiles[roomId] || [file]
              }
              throw error
            } finally {
              file.draftUpload = false
            }
          })
        })
    },

    // Removes files from the draft. They count as gone until the server says so: not shown,
    // even by a chat opened anew (unsavedDrafts.js). A removal that fails is asked for again with
    // the next change of the draft, leaving the room, closing the chat, a chat opened anew or
    // leaving the page — else the file would be back. One under way is not asked for again,
    // unless the page is left, which may cut its request off.
    removeDraftFiles(roomId, urls) {
      const userId = this.currentUser.id
      const gone = goneDraftFiles(userId, roomId)
      setGoneDraftFiles(userId, roomId, [...gone, ...urls.filter((url) => !gone.includes(url))])
      const context = this.leavingContext()
      urls
        .filter((url) => this._leaving || !this._removing.has(url))
        .forEach((url) => {
          this._removing.add(url)
          this.queueDraftSave(roomId, async (target) => {
            try {
              await this.$apollo.mutate({
                mutation: removeRoomDraftFile(),
                variables: { ...target, url },
                context,
              })
              markDraftFileRemoved(url)
              setGoneDraftFiles(
                userId,
                roomId,
                goneDraftFiles(userId, roomId).filter((goneUrl) => goneUrl !== url),
              )
            } finally {
              this._removing.delete(url)
            }
          })
        })
    },

    // The saves of a room's draft go one after the other, those of other chats too
    // (unsavedDrafts.js): a direct conversation's room is opened by the first, and a message
    // goes in line with them (sendMessage). Not told when a save fails: the draft is still in
    // the field, and its next change tries again. Gives the save's promise.
    queueDraftSave(roomId, save) {
      const target = this.draftTarget(roomId)
      // Leaving the page, nothing waits: a save behind another may never start.
      return queueDraftWork(this.currentUser.id, roomId, () => save(target), {
        waits: !this._leaving,
      })
    },

    keepAllDrafts() {
      const roomIds = new Set([
        ...Object.keys(this._typed),
        ...Object.keys(this._typedFiles),
        ...unsavedDraftRoomIds(this.currentUser.id),
      ])
      roomIds.forEach((roomId) => this.keepDraft(roomId))
    },

    fixRoomObject(room) {
      // This fixes the room object which arrives from the backend
      const isGroupRoom = room.isGroupRoom || !!room.group
      const fixedRoom = {
        ...room,
        isGroupRoom,
        // Profile data for AvatarImage component
        groupProfile: isGroupRoom
          ? {
              id: room.group?.id,
              slug: room.group?.slug,
              name: room.group?.name || room.roomName,
              avatar: room.group?.avatar,
            }
          : null,
        userProfile: null,
        index: room.lastMessage ? room.lastMessage.date : room.createdAt,
        avatar: room.avatar?.w320 || room.avatar,
        lastMessage: room.lastMessage ? this.buildLastMessage(room.lastMessage) : { content: '' },
        users: room.users.map((u) => {
          return { ...u, username: u.name, avatar: u.avatar?.w320 }
        }),
      }
      // Build user profiles from original room.users (before avatar was flattened to string)
      const userProfiles = {}
      for (const u of room.users) {
        userProfiles[u.id] = { id: u.id, slug: u.slug, name: u.name, avatar: u.avatar }
      }
      fixedRoom._userProfiles = userProfiles
      if (isGroupRoom) {
        if (!fixedRoom.avatar) {
          fixedRoom.avatar = room.group?.avatar?.w320 || room.group?.avatar || null
        }
      } else {
        const otherUser = room.users.find((u) => u.id !== this.currentUser.id)
        fixedRoom.userProfile = otherUser
          ? userProfiles[otherUser.id]
          : { name: fixedRoom.roomName }
        if (!fixedRoom.avatar) {
          fixedRoom.avatar = otherUser?.avatar?.w320 || null
        }
      }
      return fixedRoom
    },

    moveRoomToTop(room, roomId) {
      const id = roomId || room.id
      this.rooms = [room, ...this.rooms.filter((r) => r.id !== id)]
    },

    bringRoomToTopAndSelect(room) {
      // A room is there, so the rooms are no longer loading. The library holds back its
      // "no messages" text while they are, and the paths that open ONE room (a group's
      // chat, a room by its id) never went through fetchRooms, which is what used to say so.
      this.loadingRooms = false
      room.index = new Date().toISOString()
      this.moveRoomToTop(room)
      this.$nextTick(() => {
        this.activeRoomId = room.roomId
      })
    },

    // Begins opening one room. The one opened before may still be waiting for the server; its
    // answer, coming in later, must not select its room over this one.
    beginOpening() {
      this._openingGeneration += 1
      return this._openingGeneration
    },

    isCurrentOpening(opening) {
      return opening === this._openingGeneration
    },

    findLocalRoom(predicate) {
      const room = this.rooms.find(predicate)
      if (room) this.bringRoomToTopAndSelect(room)
      return room
    },

    // The room asked for, selected; null when there is none, or another room is being opened
    // by now (`opening`, see beginOpening).
    async fetchServerRoom(variables, opening) {
      try {
        const {
          data: { Room },
        } = await this.$apollo.query({
          query: roomQuery(),
          variables,
          fetchPolicy: 'no-cache',
        })
        if (!this.isCurrentOpening(opening)) return null
        if (Room?.length) {
          const room = this.fixRoomObject(Room[0])
          this.bringRoomToTopAndSelect(room)
          return room
        }
      } catch {
        // Fall through
      }
      return null
    },

    async newRoom(userOrId) {
      const opening = this.beginOpening()
      const userId = typeof userOrId === 'string' ? userOrId : userOrId.id
      let userName = typeof userOrId === 'string' ? null : userOrId.name
      let userSlug = typeof userOrId === 'string' ? null : userOrId.slug
      let userAvatarObj = typeof userOrId === 'string' ? null : userOrId.avatar
      let userAvatar = userAvatarObj?.w320 || userAvatarObj?.url || null

      if (typeof userOrId === 'string') {
        try {
          const { data } = await this.$apollo.query({
            query: userProfileQuery(),
            variables: { id: userId },
            fetchPolicy: 'no-cache',
          })
          const user = data.User?.[0]
          if (user) {
            userName = user.name
            userSlug = user.slug
            userAvatarObj = user.avatar
            userAvatar = user.avatar?.w320 || user.avatar?.url || null
          }
        } catch {
          // Fall through
        }
        if (!userName) userName = userId
      }

      if (!this.isCurrentOpening(opening)) return
      if (this.findLocalRoom((r) => !r.isGroupRoom && r.users.some((u) => u.id === userId))) return
      if (await this.fetchServerRoom({ userId }, opening)) return
      if (!this.isCurrentOpening(opening)) return

      // Create a virtual room (no backend call — room is created on first message)
      const currentUserProfile = {
        id: this.currentUser.id,
        slug: this.currentUser.slug,
        name: this.currentUser.name,
        avatar: this.currentUser.avatar,
      }
      const otherUserProfile = { id: userId, slug: userSlug, name: userName, avatar: userAvatarObj }
      const virtualRoom = {
        id: `temp-${userId}`,
        roomId: `temp-${userId}`,
        roomName: userName,
        isGroupRoom: false,
        groupProfile: null,
        userProfile: otherUserProfile,
        _userProfiles: {
          [this.currentUser.id]: currentUserProfile,
          [userId]: otherUserProfile,
        },
        avatar: userAvatar,
        lastMessageAt: null,
        createdAt: new Date().toISOString(),
        unreadCount: 0,
        index: new Date().toISOString(),
        lastMessage: { content: '' },
        users: [
          {
            _id: this.currentUser.id,
            id: this.currentUser.id,
            slug: this.currentUser.slug,
            name: this.currentUser.name,
            username: this.currentUser.name,
          },
          {
            _id: userId,
            id: userId,
            slug: userSlug,
            name: userName,
            username: userName,
            avatar: userAvatar,
          },
        ],
        _virtualUserId: userId,
      }
      this.rooms = [virtualRoom, ...this.rooms]
      this.loadingRooms = false
      this.$nextTick(() => {
        this.activeRoomId = virtualRoom.roomId
      })
    },

    async newGroupRoom(groupId) {
      const opening = this.beginOpening()
      // Not a call's conference chat: it carries the group too, but is not the group's chat.
      if (
        this.findLocalRoom((r) => r.isGroupRoom && !r.isCallRoom && r.groupProfile?.id === groupId)
      )
        return
      if (await this.fetchServerRoom({ groupId }, opening)) return
      if (!this.isCurrentOpening(opening)) return

      try {
        const {
          data: { CreateGroupRoom },
        } = await this.$apollo.mutate({
          mutation: createGroupRoom(),
          variables: { groupId },
        })
        // Created all the same; it is there when this group's chat is opened again.
        if (!this.isCurrentOpening(opening)) return
        const room = this.fixRoomObject(CreateGroupRoom)
        this.bringRoomToTopAndSelect(room)
      } catch (error) {
        if (this.isCurrentOpening(opening)) this.$toastBackendError(error)
      }
    },

    async openRoom(roomId) {
      const opening = this.beginOpening()
      if (this.findLocalRoom((r) => r.id === roomId)) return
      const room = await this.fetchServerRoom({ id: roomId }, opening)
      // The opening that replaced this one says when the rooms are loaded.
      if (!this.isCurrentOpening(opening)) return null
      this.loadingRooms = false
      return room
    },

    // Everything written in the room, oldest first — not only what has been scrolled into
    // view so far.
    async fetchAllMessages(roomId) {
      const all = []
      let beforeIndex = null
      for (;;) {
        const variables = { roomId, first: EXPORT_PAGE_SIZE }
        if (beforeIndex !== null) variables.beforeIndex = beforeIndex
        const {
          data: { Message },
        } = await this.$apollo.query({
          query: messageQuery(),
          variables,
          fetchPolicy: 'no-cache',
        })
        all.unshift(...Message)
        if (Message.length < EXPORT_PAGE_SIZE) return all
        beforeIndex = Math.min(...Message.map((m) => m.indexId))
      }
    },

    buildExportText(room, messages) {
      const locale = this.currentLocaleIso
      // The span the file covers: from the start of the call — when its chat came about, with
      // the first to join — to the moment it is saved.
      const lines = [this.$t('chat.export.title', { name: room.roomName })]
      if (room.createdAt) {
        lines.push(
          this.$t('chat.export.callStarted', {
            date: new Date(room.createdAt).toLocaleString(locale),
          }),
        )
      }
      lines.push(this.$t('chat.export.savedAt', { date: new Date().toLocaleString(locale) }), '')
      // Said in so many words, so the file is understood on its own.
      if (messages.length === 0) lines.push(this.$t('chat.messagesEmpty'))
      // A mention is written as the chat shows it, "@Name", also of somebody no longer in
      // the room as long as they wrote in it.
      const names = Object.fromEntries(
        messages.map((message) => [message.senderId, message.username]),
      )
      for (const message of messages) {
        const sentAt = new Date(message.date).toLocaleString(locale)
        // A line break inside a message stays one, but what follows it is indented:
        // at the start of a line it would read as a message of its own, without sender.
        const content = this.untagged(room.id, message.content, names)
          .text.trim()
          .replace(/\r?\n/g, `\n${EXPORT_INDENT}`)
        lines.push(`[${sentAt}] ${message.username}:${content ? ` ${content}` : ''}`)
        for (const file of message.files || []) {
          const name = file.extension ? `${file.name}.${file.extension}` : file.name
          lines.push(`${EXPORT_INDENT}${this.$t('chat.export.attachment')}: ${name}`)
        }
      }
      return lines.join('\n') + '\n'
    },

    // "chat_<group>_<day>_<from>--<until>.txt": the group the call took place in, and the
    // span the file covers — from the start of the chat to the moment it is saved, in the
    // viewer's own time. Kept to characters every file system takes.
    exportFileName(room, savedAt = new Date()) {
      const pad = (n) => String(n).padStart(2, '0')
      const day = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const time = (d) => `${pad(d.getHours())}-${pad(d.getMinutes())}`
      const startedAt = room.createdAt ? new Date(room.createdAt) : savedAt
      const name = (room.roomName || '')
        .replace(/[\\/:*?"<>|\p{Cc}]/gu, ' ')
        .trim()
        .replace(/\s+/g, '-')
      // The day is only repeated when the chat ran past midnight.
      const until =
        day(savedAt) === day(startedAt) ? time(savedAt) : `${day(savedAt)}_${time(savedAt)}`
      return ['chat', name, `${day(startedAt)}_${time(startedAt)}--${until}`]
        .filter(Boolean)
        .join('_')
        .concat('.txt')
    },

    async exportRoom() {
      const room = this.selectedRoom
      if (!room?.id || this.exporting) return
      this.exporting = true
      try {
        const messages = await this.fetchAllMessages(room.id)
        const blob = new Blob([this.buildExportText(room, messages)], {
          type: 'text/plain;charset=utf-8',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = this.exportFileName(room)
        document.body.appendChild(link)
        link.click()
        link.remove()
        // Not at once: the click only asks the browser to start the download, and some
        // browsers have not picked the blob up yet when it returns.
        setTimeout(() => URL.revokeObjectURL(url), EXPORT_URL_RELEASE_MS)
      } catch (error) {
        this.$toastBackendError(error)
      } finally {
        this.exporting = false
      }
    },

    openFile: async function (file) {
      if (!file || !file.url) return

      /* For videos, this function is called only on Safari.
         We don't want to download video files when clicking on them. */
      if (file.type.startsWith('video/')) return

      /* To make the browser download the file instead of opening it, it needs to be
         from the same origin or from local blob storage. So we fetch it first
         and then create a download link from blob storage. */

      const download = await fetch(file.url, {
        method: 'GET',
        headers: {
          'Content-Type': file.type,
        },
      })
      const blob = await download.blob()
      const objectURL = window.URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = objectURL
      downloadLink.download = `${file.name}.${file.url.split('.').slice(-1).pop()}`
      downloadLink.style.display = 'none'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    },

    navigateToUserProfile(userId) {
      const profile = this.messageUserProfile(userId)
      if (!profile?.slug) return
      this.$router.push({
        name: 'profile-id-slug',
        params: { id: userId, slug: profile.slug },
      })
    },

    redirectToUserProfile({ user }) {
      if (!user?.slug) return
      this.$router.push({
        name: 'profile-id-slug',
        params: { id: user.id, slug: user.slug },
      })
    },
  },
}
</script>
<style scoped>
.vac-avatar-profile {
  margin-right: 15px;
}

.room-group-icon {
  vertical-align: middle !important;
  margin-right: 0;
}

.room-name-with-icon {
  color: var(--chat-room-color-username);
  font-weight: 500;
}

.chat-rooms-filter-icon {
  width: 18px;
  height: 18px;
  color: var(--chat-icon-color-search, var(--chat-text-muted));
}

.vac-message-avatar {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  font-size: 11px;
  align-self: flex-end;
  margin: 0 0 2px;
}

.ds-flex-item.single-chat-bubble {
  margin-right: 1em;
}

.chat-room-options {
  flex-shrink: 0;
  margin-left: auto;
}

.chat-room-options__buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.chat-room-header-info {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;

  /*  Match the video call header — RoomTitleLink defaults to font-weight: 500 */
  /*  for in-chat usage, but the room header is a dialog-level heading and */
  /*  should read bold to mirror the call modal. */
  ::v-deep .room-title-link {
    font-weight: var(--text-weight-bold);
  }
}

.chat-header-profile-link {
  color: inherit !important;
  text-decoration: none !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  line-height: 22px !important;
  display: block !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;

  &:hover {
    color: var(--color-primary) !important;
  }
}
</style>
