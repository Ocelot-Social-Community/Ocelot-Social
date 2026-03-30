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
    @send-message="sendMessage($event.detail[0])"
    @fetch-messages="fetchMessages($event.detail[0])"
    @fetch-more-rooms="fetchRooms"
    @add-room="toggleUserSearch"
    @open-user-tag="redirectToUserProfile($event.detail[0])"
    @open-file="openFile($event.detail[0].file.file)"
  >
    <div v-if="selectedRoom && selectedRoom.roomId" slot="room-options" class="chat-room-options">
      <div v-if="singleRoom" class="ds-flex">
        <div class="ds-flex-item single-chat-bubble" style="align-self: center">
          <os-button
            as="nuxt-link"
            :to="{ name: 'chat' }"
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
      <nuxt-link v-if="roomHeaderLink" :to="roomHeaderLink" class="chat-header-profile-link">
        <profile-avatar
          v-if="selectedRoom && selectedRoom.isGroupRoom"
          :profile="selectedRoom.groupProfile"
          class="vac-avatar-profile"
          size="small"
        />
        <div
          v-else-if="selectedRoom && selectedRoom.avatar"
          class="vac-avatar"
          :style="{ 'background-image': `url('${selectedRoom.avatar}')` }"
        />
        <div v-else-if="selectedRoom" class="vac-avatar">
          <span class="initials">{{ getInitialsName(selectedRoom.roomName) }}</span>
        </div>
      </nuxt-link>
      <template v-else>
        <profile-avatar
          v-if="selectedRoom && selectedRoom.isGroupRoom"
          :profile="selectedRoom.groupProfile"
          class="vac-avatar-profile"
          size="small"
        />
        <div
          v-else-if="selectedRoom && selectedRoom.avatar"
          class="vac-avatar"
          :style="{ 'background-image': `url('${selectedRoom.avatar}')` }"
        />
        <div v-else-if="selectedRoom" class="vac-avatar">
          <span class="initials">{{ getInitialsName(selectedRoom.roomName) }}</span>
        </div>
      </template>
    </div>

    <div slot="room-header-info">
      <div class="vac-room-name vac-text-ellipsis">
        <nuxt-link v-if="roomHeaderLink" :to="roomHeaderLink" class="chat-header-profile-link">
          {{ selectedRoom ? selectedRoom.roomName : '' }}
        </nuxt-link>
        <span v-else>{{ selectedRoom ? selectedRoom.roomName : '' }}</span>
      </div>
    </div>

    <div v-for="room in rooms" :slot="'room-list-avatar_' + room.id" :key="room.id">
      <profile-avatar
        v-if="room.isGroupRoom"
        :profile="room.groupProfile"
        class="vac-avatar-profile"
        size="small"
      />
      <div
        v-else-if="room.avatar"
        class="vac-avatar"
        :style="{ 'background-image': `url('${room.avatar}')` }"
      />
      <div v-else class="vac-avatar">
        <span class="initials">{{ getInitialsName(room.roomName) }}</span>
      </div>
    </div>
  </vue-advanced-chat>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import locales from '~/locales/index.js'
import { roomQuery, createGroupRoom, unreadRoomsQuery } from '~/graphql/Rooms'
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
    if (this._mutationObserver) this._mutationObserver.disconnect()
    if (this._seenFlushTimer) clearTimeout(this._seenFlushTimer)
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    chatHeight() {
      if (this.singleRoom) return 'calc(100dvh - 190px)'
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        return '100%'
      }
      return 'calc(100dvh - 190px)'
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
        this.rooms[roomIndex] = changedRoom
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

    prepareMessage(msg) {
      const m = { ...msg }
      m.content = m.content || ''
      if (!m._rawDate) m._rawDate = m.date
      this.formatMessageDate(m)
      m.avatar = m.avatar?.w320 || m.avatar || null
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

    async fetchRooms({ room } = {}) {
      this.roomsLoaded = false
      try {
        const variables = room?.id
          ? { id: room.id }
          : { first: this.roomPageSize, before: this.roomCursor }

        const {
          data: { Room },
        } = await this.$apollo.query({
          query: roomQuery(),
          variables,
          fetchPolicy: 'no-cache',
        })

        const existingIds = new Set(this.rooms.map((r) => r.id))
        const newRooms = Room.filter((r) => !existingIds.has(r.id)).map((r) =>
          this.fixRoomObject(r),
        )
        this.rooms = [...this.rooms, ...newRooms]

        if (!room?.id && Room.length > 0) {
          // Update cursor to the oldest room's sort date
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
      // must be set false after initial rooms are loaded and never changed again
      this.loadingRooms = false
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
          } else {
            return
          }
        } catch {
          return
        }
      }
      const changedRoom = { ...this.rooms[roomIndex] }
      changedRoom.lastMessage = {
        ...msg,
        content: (msg.content || '').trim().substring(0, 30),
      }
      changedRoom.lastMessageAt = msg.date
      changedRoom.index = new Date().toISOString()
      const isCurrentRoom = msg.room.id === this.selectedRoom?.id
      const isOwnMessage = msg.senderId === this.currentUser.id
      if (!isCurrentRoom && !isOwnMessage) {
        changedRoom.unreadCount++
      }
      // Reassign array to trigger Vue reactivity and vue-advanced-chat re-sort
      this.rooms = [changedRoom, ...this.rooms.filter((r) => r.id !== msg.room.id)]
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
              // Captured audio already has the right extension in the name
              file.extension ? `${file.name}.${file.extension}` : file.name,
              { type: file.type },
            ),
            name: file.name,
            type: file.type,
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
          this.selectedRoom?.users?.find((u) => u.id === this.currentUser.id)?.avatar || null,
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
        changedRoom.lastMessage.content = (content || '').trim().substring(0, 30)
        changedRoom.index = new Date().toISOString()
        this.rooms = [changedRoom, ...this.rooms.filter((r) => r.id !== roomId)]
        this.$nextTick(() => {
          this.scrollRoomsListToTop()
        })
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
        this.$toast.error(error.message)
      }
    },

    getInitialsName(fullname) {
      if (!fullname) return
      return fullname.match(/\b\w/g).join('').substring(0, 3).toUpperCase()
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
        // For group rooms: provide group profile data for ProfileAvatar component
        groupProfile: isGroupRoom
          ? {
              id: room.group?.id,
              slug: room.group?.slug,
              name: room.group?.name || room.roomName,
              avatar: room.group?.avatar,
            }
          : null,
        index: room.lastMessage ? room.lastMessage.date : room.createdAt,
        avatar: room.avatar?.w320 || room.avatar,
        lastMessage: room.lastMessage
          ? {
              ...room.lastMessage,
              content: (room.lastMessage?.content || '').trim().substring(0, 30),
            }
          : { content: '' },
        users: room.users.map((u) => {
          return { ...u, username: u.name, avatar: u.avatar?.w320 }
        }),
      }
      if (!fixedRoom.avatar) {
        if (isGroupRoom) {
          fixedRoom.avatar = room.group?.avatar?.w320 || room.group?.avatar || null
        } else {
          // as long as we cannot query avatar on CreateRoom
          const otherUser = fixedRoom.users.find((u) => u.id !== this.currentUser.id)
          fixedRoom.avatar = otherUser?.avatar
        }
      }
      return fixedRoom
    },

    selectRoom(room) {
      this.activeRoomId = room.roomId
    },

    bringRoomToTopAndSelect(room) {
      room.index = new Date().toISOString()
      this.rooms = [room, ...this.rooms.filter((r) => r.id !== room.id)]
      this.$nextTick(() => this.selectRoom(room))
    },

    async newRoom(userOrId) {
      // Accept either a user object { id, name } or just a userId string
      const userId = typeof userOrId === 'string' ? userOrId : userOrId.id
      const userName = typeof userOrId === 'string' ? userOrId : userOrId.name
      const userAvatar =
        typeof userOrId === 'string' ? null : userOrId.avatar?.w320 || userOrId.avatar?.url || null

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
      // Create a virtual room (no backend call — room is created on first message)
      const virtualRoom = {
        id: `temp-${userId}`,
        roomId: `temp-${userId}`,
        roomName: userName,
        isGroupRoom: false,
        groupProfile: null,
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

    redirectToUserProfile({ user }) {
      const userID = user.id
      const userName = user.name.toLowerCase().replaceAll(' ', '-')
      const url = `/profile/${userID}/${userName}`
      this.$router.push({ path: url })
    },
  },
}
</script>
<style lang="scss" scoped>
.vac-avatar {
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-color: $color-primary-dark;
  color: $text-color-primary-inverse;
  height: 42px;
  width: 42px;
  min-height: 42px;
  min-width: 42px;
  margin-right: 15px;
  border-radius: 50%;
  position: relative;

  > .initials {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

.vac-avatar-profile {
  margin-right: 15px;
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
