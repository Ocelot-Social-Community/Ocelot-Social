<template>
  <vue-advanced-chat
    :theme="theme"
    :current-user-id="currentUser.id"
    :room-id="computedRoomId"
    :template-actions="JSON.stringify(templatesText)"
    :menu-actions="JSON.stringify(menuActions)"
    :text-messages="JSON.stringify(textMessages)"
    :message-actions="messageActions"
    :messages="JSON.stringify(messages)"
    :messages-loaded="messagesLoaded"
    :rooms="JSON.stringify(rooms)"
    :room-actions="JSON.stringify(roomActions)"
    :rooms-loaded="roomsLoaded"
    :loading-rooms="loadingRooms"
    :media-preview-enabled="isSafari ? 'false' : 'true'"
    show-files="true"
    show-audio="true"
    capture-files="true"
    :height="chatHeight"
    :styles="JSON.stringify(computedChatStyle)"
    :show-footer="true"
    :responsive-breakpoint="responsiveBreakpoint"
    :single-room="singleRoom"
    show-reaction-emojis="false"
    custom-search-room-enabled="true"
    @send-message="sendMessage($event.detail[0])"
    @fetch-messages="fetchMessages($event.detail[0])"
    @fetch-more-rooms="fetchMoreRooms"
    @search-room="searchRooms($event.detail[0])"
    @add-room="toggleUserSearch"
    @open-user-tag="redirectToUserProfile($event.detail[0])"
    @open-file="openFile($event.detail[0].file.file)"
  >
    <div v-if="selectedRoom && selectedRoom.roomId" slot="room-options" class="chat-room-options">
      <div v-if="singleRoom" class="ds-flex">
        <div class="ds-flex-item single-chat-bubble" style="align-self: center">
          <os-button
            as="nuxt-link"
            :to="expandChatLink"
            variant="primary"
            appearance="ghost"
            circle
            size="sm"
            :aria-label="$t('chat.expandChat')"
          >
            <template #icon>
              <os-icon :icon="icons.expand" />
            </template>
          </os-button>
        </div>
        <div class="ds-flex-item" style="align-self: center">
          <div class="vac-svg-button vac-room-options">
            <slot name="menu-icon">
              <os-button
                variant="primary"
                appearance="ghost"
                circle
                size="sm"
                :aria-label="$t('chat.closeChat')"
                @click="$emit('close-single-room', true)"
              >
                <template #icon>
                  <os-icon :icon="icons.close" />
                </template>
              </os-button>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <div slot="room-header-avatar">
      <component :is="roomHeaderLink ? 'nuxt-link' : 'span'" :to="roomHeaderLink" class="chat-header-profile-link">
        <profile-avatar
          v-if="selectedRoom"
          :profile="selectedRoomProfile"
          class="vac-avatar-profile"
        />
      </component>
    </div>

    <div slot="room-header-info">
      <div class="vac-room-name vac-text-ellipsis">
        <component :is="roomHeaderLink ? 'nuxt-link' : 'span'" :to="roomHeaderLink" class="chat-header-profile-link">
          <os-icon v-if="selectedRoom && selectedRoom.isGroupRoom" :icon="icons.group" class="room-group-icon" />
          {{ selectedRoom ? selectedRoom.roomName : '' }}
        </component>
      </div>
    </div>

    <div v-for="room in rooms" v-if="room.isGroupRoom" :slot="'room-list-info_' + room.roomId" :key="'info-' + room.id">
      <div class="vac-room-name vac-text-ellipsis room-name-with-icon">
        <os-icon :icon="icons.group" class="room-group-icon" />
        {{ room.roomName }}
      </div>
    </div>

    <div v-for="room in rooms" :slot="'room-list-avatar_' + room.id" :key="room.id">
      <profile-avatar
        :profile="room.isGroupRoom ? room.groupProfile : room.userProfile"
        class="vac-avatar-profile"
      />
    </div>

    <template v-for="msg in messages">
      <profile-avatar
        v-if="msg.avatar"
        :slot="'message-avatar_' + msg._id"
        :key="'avatar-' + msg._id"
        :profile="messageUserProfile(msg.senderId)"
        class="vac-message-avatar"
        style="align-self: flex-end; margin: 0 0 2px; cursor: pointer;"
        @click.native="navigateToProfile(msg.senderId, messageUserProfile(msg.senderId).name)"
      />
    </template>
  </vue-advanced-chat>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import locales from '~/locales/index.js'
import { roomQuery, createGroupRoom, unreadRoomsQuery, userProfileQuery } from '~/graphql/Rooms'
import {
  messageQuery,
  createMessageMutation,
  chatMessageAdded,
  chatMessageStatusUpdated,
  markMessagesAsSeen,
} from '~/graphql/Messages'
import chatStyle from '~/constants/chat.js'
import { mapGetters, mapMutations } from 'vuex'

export default {
  name: 'Chat',
  components: { OsButton, OsIcon, ProfileAvatar },
  props: {
    theme: {
      type: String,
      default: 'light',
    },
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
  },
  data() {
    return {
      menuActions: [],
      messageActions: [],
      templatesText: [],
      roomActions: [],
      responsiveBreakpoint: 600,
      rooms: [],
      roomsLoaded: false,
      roomCursor: null,
      roomPageSize: 10,
      roomSearch: '',
      roomObserverDirty: false,
      selectedRoom: null,
      activeRoomId: null,
      loadingRooms: true,
      messagesLoaded: false,
      messagePageSize: 20,
      oldestLoadedIndexId: null,
      messages: [],
      unseenMessageIds: new Set(),
      pendingStatusUpdates: {},
    }
  },
  created() {
    this.icons = iconRegistry
  },
  watch: {
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
    currentLocaleIso() {
      this.messages = this.messages.map((m) => {
        this.formatMessageDate(m)
        return { ...m }
      })
    },
  },
  mounted() {
    if (this.singleRoom && this.groupId) {
      this.newGroupRoom(this.groupId)
    } else if (this.singleRoom && this.userId) {
      this.newRoom(this.userId)
    } else {
      this.fetchRooms()
    }

    // Subscriptions
    this._subscriptions = []

    const messageObserver = this.$apollo.subscribe({ query: chatMessageAdded() })
    const messageSub = messageObserver.subscribe({
      next: this.chatMessageAdded,
      error: (error) => this.$toast.error(error),
    })
    this._subscriptions.push(messageSub)

    const statusObserver = this.$apollo.subscribe({ query: chatMessageStatusUpdated() })
    const statusSub = statusObserver.subscribe({
      next: this.handleMessageStatusUpdated,
    })
    this._subscriptions.push(statusSub)
  },
  beforeDestroy() {
    this._subscriptions?.forEach((s) => s.unsubscribe())
    if (this._intersectionObserver) this._intersectionObserver.disconnect()
    if (this._roomLoaderObserver) this._roomLoaderObserver.disconnect()
    if (this._mutationObserver) this._mutationObserver.disconnect()
    if (this._seenFlushTimer) clearTimeout(this._seenFlushTimer)
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    chatHeight() {
      if (this.singleRoom) return 'calc(100dvh - 190px)'
      return '100%'
    },
    computedChatStyle() {
      return chatStyle.STYLE.light
    },
    computedRoomId() {
      return this.activeRoomId || null
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
    selectedRoomProfile() {
      if (!this.selectedRoom) return null
      return this.selectedRoom.isGroupRoom ? this.selectedRoom.groupProfile : this.selectedRoom.userProfile
    },
    roomHeaderLink() {
      if (!this.selectedRoom) return null
      if (this.selectedRoom.isGroupRoom && this.selectedRoom.groupProfile?.id) {
        const { id, slug } = this.selectedRoom.groupProfile
        return `/groups/${id}/${slug}`
      }
      const otherUser = this.selectedRoom.users?.find((u) => u.id !== this.currentUser.id)
      if (otherUser) {
        const slug = otherUser.name?.toLowerCase().replaceAll(' ', '-')
        return `/profile/${otherUser.id}/${slug}`
      }
      return null
    },
    textMessages() {
      return {
        ROOMS_EMPTY: this.$t('chat.roomsEmpty'),
        ROOM_EMPTY: this.$t('chat.roomEmpty'),
        NEW_MESSAGES: this.$t('chat.newMessages'),
        MESSAGE_DELETED: this.$t('chat.messageDeleted'),
        MESSAGES_EMPTY: this.$t('chat.messagesEmpty'),
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
    }),

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
        changedRoom.unreadCount = Math.max(0, changedRoom.unreadCount - messageIds.length)
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

    setupMessageVisibilityTracking() {
      const shadowRoot = this.$el?.shadowRoot
      if (!shadowRoot || this._mutationObserver) return
      const scrollContainer = shadowRoot.querySelector('.vac-container-scroll')
      if (!scrollContainer) return

      this._seenBatch = []
      this._seenFlushTimer = null

      // IntersectionObserver: detects when unseen messages become visible
      this._intersectionObserver = new IntersectionObserver(
        (entries) => {
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
      const filtered = msgs.filter(Boolean)
      this.applyAvatarsOnList(filtered)
      this.messages = filtered
    },

    messageUserProfile(senderId) {
      const room = this.rooms.find((r) => r.id === this.selectedRoom?.id)
      const profile = room?._userProfiles?.[senderId]
      if (profile) return profile
      const user = this.selectedRoom?.users?.find((u) => u._id === senderId || u.id === senderId)
      return user ? { id: user.id, name: user.username || user.name } : { name: senderId }
    },

    initialsAvatarUrl(name) {
      const initials = (name || '?').match(/\b\w/g)?.join('').substring(0, 2).toUpperCase() || '?'
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><circle cx="28" cy="28" r="28" fill="rgb(25,122,49)"/><text x="50%25" y="50%25" dominant-baseline="central" text-anchor="middle" fill="white" font-family="sans-serif" font-size="22" font-weight="500">${initials}</text></svg>`
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

    async fetchRooms({ room, search, replace } = {}) {
      this.roomsLoaded = false
      try {
        const variables = room?.id
          ? { id: room.id }
          : { first: this.roomPageSize, before: this.roomCursor, ...(search && { search }) }

        const {
          data: { Room },
        } = await this.$apollo.query({
          query: roomQuery(),
          variables,
          fetchPolicy: 'no-cache',
        })

        if (replace) {
          this.rooms = Room.map((r) => this.fixRoomObject(r))
        } else {
          const existingIds = new Set(this.rooms.map((r) => r.id))
          const newRooms = Room.filter((r) => !existingIds.has(r.id)).map((r) =>
            this.fixRoomObject(r),
          )
          this.rooms = [...this.rooms, ...newRooms]
        }

        if (!room?.id && Room.length > 0) {
          const lastRoom = Room[Room.length - 1]
          this.roomCursor = lastRoom.lastMessageAt || lastRoom.createdAt
        }

        if (Room.length < this.roomPageSize) {
          this.roomsLoaded = true
        }

        if (this.singleRoom && this.rooms.length > 0) {
          this.selectRoom(this.rooms[0])
        }
      } catch (error) {
        this.rooms = []
        this.$toast.error(error.message)
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
      await this.fetchRooms({ search: this.roomSearch || undefined, replace: true })
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
      if (this.selectedRoom?.id !== room.id) {
        this.messages = []
        this.oldestLoadedIndexId = null
        this.unseenMessageIds = new Set()
        this.selectedRoom = room
      }
      // Virtual rooms have no messages on the server yet
      if (!room.id || room.id.startsWith('temp-')) {
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
        first: this.messagePageSize,
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
        if (Message.length < this.messagePageSize) {
          this.messagesLoaded = true
        }
        // Ensure visibility tracking is running
        this.$nextTick(() => this.setupMessageVisibilityTracking())
      } catch (error) {
        this.messages = []
        this.$toast.error(error.message)
      }
    },

    async chatMessageAdded({ data }) {
      const msg = data.chatMessageAdded
      let roomIndex = this.rooms.findIndex((r) => r.id === msg.room.id)
      let freshlyFetched = false
      if (roomIndex === -1) {
        // Room not in list yet — fetch it specifically
        try {
          const {
            data: { Room },
          } = await this.$apollo.query({
            query: roomQuery(),
            variables: { id: msg.room.id },
            fetchPolicy: 'no-cache',
          })
          if (Room?.length) {
            const newRoom = this.fixRoomObject(Room[0])
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
      // Don't increment unreadCount for freshly fetched rooms — server count already includes this message
      if (!freshlyFetched && !isCurrentRoom && !isOwnMessage) {
        changedRoom.unreadCount++
      }
      this.moveRoomToTop(changedRoom, msg.room.id)
      // Only add incoming messages to the chat — own messages are handled via mutation response
      if (isCurrentRoom && !isOwnMessage) {
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
          this.rooms = [
            ...this.rooms.slice(0, roomIndex),
            changedRoom,
            ...this.rooms.slice(roomIndex + 1),
          ]
        }
      }
    },

    async sendMessage(messageDetails) {
      const { roomId, content, files } = messageDetails
      const isVirtualRoom = roomId.startsWith('temp-')

      const hasFiles = files && files.length > 0

      const filesToUpload = hasFiles
        ? files.map((file) => ({
            upload: new File(
              [file.blob],
              file.extension ? `${file.name}.${file.extension}` : file.name,
              { type: file.type },
            ),
            name: file.name,
            extension: file.extension || undefined,
            type: file.type,
            ...(file.duration != null && { duration: file.duration }),
          }))
        : null

      // Immediately add new message
      const localMessage = {
        ...messageDetails,
        _id: 'new' + Math.random().toString(36).substring(2, 15),
        seen: false,
        saved: true,
        _rawDate: new Date().toISOString(),
        _originalAvatar:
          this.selectedRoom?.users?.find((u) => u.id === this.currentUser.id)?.avatar || this.initialsAvatarUrl(this.currentUser.name),
        senderId: this.currentUser.id,
        files:
          messageDetails.files?.map((file) => ({
            ...file,
            url: URL.createObjectURL(new Blob([file.blob], { type: file.type })),
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
        // Build mutation variables — userId for virtual rooms, roomId for existing
        const mutationVariables = { content }
        if (isVirtualRoom) {
          const virtualRoom = this.rooms.find((r) => r.id === roomId)
          mutationVariables.userId = virtualRoom?._virtualUserId || roomId.replace('temp-', '')
        } else {
          mutationVariables.roomId = roomId
        }
        if (filesToUpload && filesToUpload.length > 0) {
          mutationVariables.files = filesToUpload
        }

        const { data } = await this.$apollo.mutate({
          mutation: createMessageMutation(),
          variables: mutationVariables,
        })
        const createdMessage = data.CreateMessage

        if (createdMessage) {
          // Replace local message with server response
          this.replaceLocalMessage(localMessage._id, createdMessage)
        }

        if (isVirtualRoom && createdMessage?.room?.id) {
          // Replace virtual room with real room by fetching the specific room
          const realRoomId = createdMessage.room.id
          this.rooms = this.rooms.filter((r) => r.id !== roomId)
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
        }
      } catch (error) {
        // Remove the optimistic local message so it doesn't linger as a ghost
        this.messages = this.messages.filter((m) => m._id !== localMessage._id)
        this.applyAvatarsOnList(this.messages)
        this.$toast.error(error.message)
      }
    },

    toggleUserSearch() {
      this.$emit('toggle-user-search')
    },

    fixRoomObject(room) {
      // This fixes the room object which arrives from the backend
      const isGroupRoom = room.isGroupRoom || !!room.group
      const fixedRoom = {
        ...room,
        isGroupRoom,
        // Profile data for ProfileAvatar component
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
        userProfiles[u.id] = { id: u.id, name: u.name, avatar: u.avatar }
      }
      fixedRoom._userProfiles = userProfiles
      if (!isGroupRoom) {
        const otherUser = room.users.find((u) => u.id !== this.currentUser.id)
        fixedRoom.userProfile = otherUser
          ? userProfiles[otherUser.id]
          : { name: fixedRoom.roomName }
      }
      if (!fixedRoom.avatar) {
        if (isGroupRoom) {
          fixedRoom.avatar = room.group?.avatar?.w320 || room.group?.avatar || null
        } else {
          const otherUser = fixedRoom.users.find((u) => u.id !== this.currentUser.id)
          fixedRoom.avatar = otherUser?.avatar
        }
      }
      return fixedRoom
    },

    moveRoomToTop(room, roomId) {
      const id = roomId || room.id
      this.rooms = [room, ...this.rooms.filter((r) => r.id !== id)]
    },

    selectRoom(room) {
      this.activeRoomId = room.roomId
    },

    bringRoomToTopAndSelect(room) {
      room.index = new Date().toISOString()
      this.moveRoomToTop(room)
      this.$nextTick(() => this.selectRoom(room))
    },

    async newRoom(userOrId) {
      // Accept either a user object { id, name } or just a userId string
      const userId = typeof userOrId === 'string' ? userOrId : userOrId.id
      let userName = typeof userOrId === 'string' ? null : userOrId.name
      let userAvatarObj = typeof userOrId === 'string' ? null : userOrId.avatar
      let userAvatar = userAvatarObj?.w320 || userAvatarObj?.url || null

      // When called with just an ID (e.g. from query params), fetch user profile
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
            userAvatarObj = user.avatar
            userAvatar = user.avatar?.w320 || user.avatar?.url || null
          }
        } catch {
          // Fall through with userId as display name
        }
        if (!userName) userName = userId
      }

      // Check if a DM room with this user already exists locally
      const existingRoom = this.rooms.find(
        (r) => !r.isGroupRoom && r.users.some((u) => u.id === userId),
      )
      if (existingRoom) {
        this.bringRoomToTopAndSelect(existingRoom)
        return
      }

      // Check if a DM room with this user exists on the server (not yet loaded locally)
      try {
        const {
          data: { Room },
        } = await this.$apollo.query({
          query: roomQuery(),
          variables: { userId },
          fetchPolicy: 'no-cache',
        })
        const serverRoom = Room?.[0]
        if (serverRoom) {
          const room = this.fixRoomObject(serverRoom)
          this.bringRoomToTopAndSelect(room)
          return
        }
      } catch {
        // Fall through to virtual room creation
      }

      // Create a virtual room (no backend call — room is created on first message)
      const currentUserProfile = { id: this.currentUser.id, name: this.currentUser.name, avatar: this.currentUser.avatar }
      const otherUserProfile = { id: userId, name: userName, avatar: userAvatarObj }
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
          { _id: this.currentUser.id, id: this.currentUser.id, username: this.currentUser.name },
          { _id: userId, id: userId, username: userName, avatar: userAvatar },
        ],
        _virtualUserId: userId,
      }
      this.rooms = [virtualRoom, ...this.rooms]
      this.roomsLoaded = true
      this.loadingRooms = false
      this.$nextTick(() => this.selectRoom(virtualRoom))
    },

    async newGroupRoom(groupId) {
      // Check if the group room already exists locally
      const existingRoom = this.rooms.find((r) => r.isGroupRoom && r.groupProfile?.id === groupId)
      if (existingRoom) {
        this.bringRoomToTopAndSelect(existingRoom)
        return
      }

      // Check if the group room exists on the server (not yet loaded locally)
      try {
        const {
          data: { Room },
        } = await this.$apollo.query({
          query: roomQuery(),
          variables: { groupId },
          fetchPolicy: 'no-cache',
        })
        if (Room?.length) {
          const room = this.fixRoomObject(Room[0])
          this.bringRoomToTopAndSelect(room)
          return
        }
      } catch {
        // Fall through to creation
      }

      // Room doesn't exist yet — create it
      try {
        const {
          data: { CreateGroupRoom },
        } = await this.$apollo.mutate({
          mutation: createGroupRoom(),
          variables: { groupId },
        })
        const room = this.fixRoomObject(CreateGroupRoom)
        this.bringRoomToTopAndSelect(room)
      } catch (error) {
        this.$toast.error(error.message)
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

    navigateToProfile(userId, name) {
      const slug = (name || '').toLowerCase().replaceAll(' ', '-')
      this.$router.push({ path: `/profile/${userId}/${slug}` })
    },

    redirectToUserProfile({ user }) {
      this.navigateToProfile(user.id, user.name)
    },
  },
}
</script>
<style lang="scss" scoped>
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
    color: $color-primary !important;
  }
}
</style>
