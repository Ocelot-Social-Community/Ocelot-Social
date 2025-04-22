<template>
  <div>
    <client-only>
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
        show-files="false"
        show-audio="false"
        :styles="JSON.stringify(computedChatStyle)"
        :show-footer="true"
        :responsive-breakpoint="responsiveBreakpoint"
        :single-room="singleRoom"
        show-reaction-emojis="false"
        @send-message="sendMessage($event.detail[0])"
        @fetch-messages="fetchMessages($event.detail[0])"
        @fetch-more-rooms="fetchRooms"
        @add-room="toggleUserSearch"
        @show-demo-options="showDemoOptions = $event"
        @open-user-tag="redirectToUserProfile($event.detail[0])"
      >
        <div
          v-if="selectedRoom && selectedRoom.roomId"
          slot="room-options"
          class="chat-room-options"
        >
          <ds-flex v-if="singleRoom">
            <ds-flex-item centered class="single-chat-bubble">
              <nuxt-link :to="{ name: 'chat' }">
                <base-button icon="expand" size="small" circle />
              </nuxt-link>
            </ds-flex-item>
            <ds-flex-item centered>
              <div class="vac-svg-button vac-room-options">
                <slot name="menu-icon">
                  <base-button
                    icon="close"
                    size="small"
                    circle
                    @click="$emit('close-single-room', true)"
                  />
                </slot>
              </div>
            </ds-flex-item>
          </ds-flex>
        </div>

        <div slot="room-header-avatar">
          <div
            v-if="selectedRoom && selectedRoom.avatar"
            class="vac-avatar"
            :style="{ 'background-image': `url('${selectedRoom.avatar}')` }"
          />
          <div v-else-if="selectedRoom" class="vac-avatar">
            <span class="initials">{{ getInitialsName(selectedRoom.roomName) }}</span>
          </div>
        </div>

        <div v-for="room in rooms" :slot="'room-list-avatar_' + room.id" :key="room.id">
          <div
            v-if="room.avatar"
            class="vac-avatar"
            :style="{ 'background-image': `url('${room.avatar}')` }"
          />
          <div v-else class="vac-avatar">
            <span class="initials">{{ getInitialsName(room.roomName) }}</span>
          </div>
        </div>
      </vue-advanced-chat>
    </client-only>
  </div>
</template>

<script>
import { roomQuery, createRoom, unreadRoomsQuery } from '~/graphql/Rooms'
import {
  messageQuery,
  createMessageMutation,
  chatMessageAdded,
  markMessagesAsSeen,
} from '~/graphql/Messages'
import chatStyle from '~/constants/chat.js'
import { mapGetters, mapMutations } from 'vuex'

export default {
  name: 'Chat',
  props: {
    theme: {
      type: String,
      default: 'light',
    },
    singleRoom: {
      type: Boolean,
      default: false,
    },
    roomId: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      menuActions: [
        /*
            {
            name: 'inviteUser',
            title: 'Invite User',
            },
            {
            name: 'removeUser',
            title: 'Remove User',
            },
            {
            name: 'deleteRoom',
            title: 'Delete Room',
            },
          */
      ],
      messageActions: [
        /*
            {
            name: 'addMessageToFavorite',
            title: 'Add To Favorite',
            },
            {
            name: 'shareMessage',
            title: 'Share Message',
            },
          */
      ],
      templatesText: [
        {
          tag: 'help',
          text: 'This is the help',
        },
        {
          tag: 'action',
          text: 'This is the action',
        },
      ],
      roomActions: [
        /*
            {
            name: 'archiveRoom',
            title: 'Archive Room',
            },
            { name: 'inviteUser', title: 'Invite User' },
            { name: 'removeUser', title: 'Remove User' },
            { name: 'deleteRoom', title: 'Delete Room' },
          */
      ],

      responsiveBreakpoint: 600,
      rooms: [],
      roomsLoaded: false,
      roomPageSize: 10,
      selectedRoom: this.roomId,
      loadingRooms: true,
      messagesLoaded: false,
      messagePageSize: 20,
      messages: [],
    }
  },
  mounted() {
    if (this.singleRoom) {
      this.newRoom(this.roomId)
    } else {
      this.fetchRooms()
    }

    // Subscriptions
    const observer = this.$apollo.subscribe({
      query: chatMessageAdded(),
    })

    observer.subscribe({
      next: this.chatMessageAdded,
      error(error) {
        this.$toast.error(error)
      },
    })
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
      getStoreRoomId: 'chat/roomID',
    }),
    computedChatStyle() {
      return chatStyle.STYLE.light
    },
    computedRoomId() {
      let roomId = null

      if (!this.singleRoom) {
        roomId = this.roomId

        if (this.getStoreRoomId.roomId) {
          roomId = this.getStoreRoomId.roomId
        }
      }

      return roomId
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
      commitRoomIdFromSingleRoom: 'chat/UPDATE_ROOM_ID',
    }),

    fetchRooms({ room } = {}) {
      this.roomsLoaded = false
      this.$apollo
        .query({
          query: roomQuery(),
          variables: {
            id: room?.id,
            first: this.roomPageSize,
            offset: this.rooms.length,
          },
          fetchPolicy: 'no-cache',
        })
        .then(({ data: { Room } }) => {
          const rms = []
          const rmsIds = []
          ;[...this.rooms, ...Room].forEach((r) => {
            if (!rmsIds.find((v) => v === r.id)) {
              rms.push(this.fixRoomObject(r))
              rmsIds.push(r.id)
            }
          })
          this.rooms = rms
          if (Room.length < this.roomPageSize) {
            this.roomsLoaded = true
          }

          if (this.singleRoom && this.rooms.length > 0) {
            this.commitRoomIdFromSingleRoom(this.rooms[0].roomId)
          } else if (this.getStoreRoomId.roomId) {
            // reset store room id
            this.commitRoomIdFromSingleRoom(this.getStoreRoomId.roomId)
          }
        })
        .catch((error) => {
          this.rooms = []
          this.$toast.error(error.message)
        })
        .finally(() => {
          // must be set false after initial rooms are loaded and never changed again
          this.loadingRooms = false
        })
    },

    fetchMessages({ room, options = {} }) {
      if (this.selectedRoom?.id !== room.id) {
        this.messages = []
        this.selectedRoom = room
      }
      this.messagesLoaded = options.refetch ? this.messagesLoaded : false

      this.$apollo
        .query({
          query: messageQuery(),
          variables: {
            roomId: room.id,
            first: this.messagePageSize,
            offset: this.messages.length,
          },
          fetchPolicy: 'no-cache',
        })
        .then(({ data: { Message } }) => {
          const newMsgIds = Message.filter(
            (m) => m.seen === false && m.senderId !== this.currentUser.id,
          ).map((m) => m.id)
          if (newMsgIds.length) {
            const roomIndex = this.rooms.findIndex((r) => r.id === room.id) ?? Message.id

            if (roomIndex === -1) {
              this.rooms = [room, ...this.rooms]
            }
            const changedRoom = { ...this.rooms[roomIndex] }
            changedRoom.unreadCount = changedRoom.unreadCount - newMsgIds.length
            this.rooms[roomIndex] = changedRoom
            this.$apollo
              .mutate({
                mutation: markMessagesAsSeen(),
                variables: {
                  messageIds: newMsgIds,
                },
              })
              .then(() => {
                this.$apollo
                  .query({
                    query: unreadRoomsQuery(),
                    fetchPolicy: 'network-only',
                  })
                  .then(({ data: { UnreadRooms } }) => {
                    this.commitUnreadRoomCount(UnreadRooms)
                  })
              })
          }

          const msgs = []
          ;[...this.messages, ...Message].forEach((m) => {
            if (m.senderId !== this.currentUser.id) m.seen = true
            m.date = new Date(m.date).toDateString()
            m.avatar = this.$filters.proxyApiUrl(m.avatar)
            msgs[m.indexId] = m
          })
          this.messages = msgs.filter(Boolean)

          if (Message.length < this.messagePageSize) {
            this.messagesLoaded = true
          }
        })
        .catch((error) => {
          this.messages = []
          this.$toast.error(error.message)
        })
    },

    addMessageToCurrentRoom(message) {
      const messages = this.messages
      message.date = new Date(message.date).toDateString()
      messages.push(message)
      this.messages = messages
    },

    chatMessageAdded({ data }) {
      const roomIndex = this.rooms.findIndex((r) => r.id === data.chatMessageAdded.room.id)
      const changedRoom = { ...this.rooms[roomIndex] }

      changedRoom.lastMessage = data.chatMessageAdded
      changedRoom.lastMessage.content = changedRoom.lastMessage.content.trim().substring(0, 30)
      changedRoom.lastMessageAt = data.chatMessageAdded.date
      if (data.chatMessageAdded.room.id === this.selectedRoom?.id) {
        this.addMessageToCurrentRoom(data.chatMessageAdded)
      } else {
        changedRoom.unreadCount++
        this.fetchRooms({ room: this.selectedRoom, options: { refetch: true } })
      }
      this.rooms[roomIndex] = changedRoom
    },

    sendMessage(message) {
      this.$apollo
        .mutate({
          mutation: createMessageMutation(),
          variables: {
            roomId: message.roomId,
            content: message.content,
          },
        })
        .then(({ data: { CreateMessage: createdMessage } }) => {
          this.addMessageToCurrentRoom(createdMessage)
        })
        .catch((error) => {
          this.$toast.error(error.message)
        })
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
      const fixedRoom = {
        ...room,
        index: room.lastMessage ? room.lastMessage.date : room.createdAt,
        avatar: this.$filters.proxyApiUrl(room.avatar),
        lastMessage: room.lastMessage
          ? {
              ...room.lastMessage,
              content: room.lastMessage?.content?.trim().substring(0, 30),
            }
          : null,
        users: room.users.map((u) => {
          return { ...u, username: u.name, avatar: this.$filters.proxyApiUrl(u.avatar?.url) }
        }),
      }
      if (!fixedRoom.avatar) {
        // as long as we cannot query avatar on CreateRoom
        fixedRoom.avatar = fixedRoom.users.find((u) => u.id !== this.currentUser.id).avatar
      }
      return fixedRoom
    },

    newRoom(userId) {
      this.$apollo
        .mutate({
          mutation: createRoom(),
          variables: {
            userId,
          },
        })
        .then(({ data: { CreateRoom } }) => {
          const roomIndex = this.rooms.findIndex((r) => r.id === CreateRoom.roomId)
          const room = this.fixRoomObject(CreateRoom)

          if (roomIndex === -1) {
            this.rooms = [room, ...this.rooms]
          }
          this.fetchMessages({ room, options: { refetch: true } })
          this.$emit('show-room', CreateRoom.id)
        })
        .catch((error) => {
          this.$toast.error(error.message)
        })
        .finally(() => {
          this.loadingRooms = false
        })
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

.ds-flex-item.single-chat-bubble {
  margin-right: 1em;
}
</style>
